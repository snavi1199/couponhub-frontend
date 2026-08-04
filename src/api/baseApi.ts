import { fetchBaseQuery, type BaseQueryFn, type FetchArgs, type FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { createApi } from '@reduxjs/toolkit/query/react';
import { tokenStorage } from '@/lib/tokenStorage';
import type { AuthResponse, ApiResponse } from '@/lib/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers) => {
    const token = tokenStorage.getAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    headers.set('Content-Type', 'application/json');
    return headers;
  },
});

// Prevents a stampede of parallel refresh calls when several queries 401 at once.
let refreshPromise: Promise<boolean> | null = null;

/**
 * Wraps the base query: on a 401, attempts exactly one token refresh (deduped across
 * concurrent requests), then retries the original request once. If refresh itself fails,
 * clears tokens so ProtectedRoute redirects to /login.
 */
const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  // 401 is the correct "not authenticated" status from the backend (see SecurityConfig's
  // AuthenticationEntryPoint). We also treat 403 as a trigger here defensively — some Spring
  // Security configurations return 403 for an expired/invalid token instead of 401 — so an
  // expired access token never gets stuck failing requests when a silent refresh would fix it.
  if (result.error && (result.error.status === 401 || result.error.status === 403)) {
    const refreshToken = tokenStorage.getRefreshToken();

    if (!refreshToken) {
      tokenStorage.clear();
      return result;
    }

    if (!refreshPromise) {
      refreshPromise = (async () => {
        const refreshResult = await rawBaseQuery(
          { url: '/auth/refresh', method: 'POST', body: { refreshToken } },
          api,
          extraOptions
        );
        if (refreshResult.data) {
          const payload = refreshResult.data as ApiResponse<AuthResponse>;
          tokenStorage.setTokens(payload.data.accessToken, payload.data.refreshToken);
          return true;
        }
        tokenStorage.clear();
        return false;
      })().finally(() => {
        refreshPromise = null;
      });
    }

    const refreshed = await refreshPromise;

    if (refreshed) {
      result = await rawBaseQuery(args, api, extraOptions);
    }
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Coupon', 'CouponList', 'Category', 'Brand', 'CurrentUser', 'CouponRequest', 'Notification'],
  // Refetch active queries when the tab regains focus or the network reconnects — covers "switched
  // tabs/apps and came back" without needing a full page reload. Combined with setupListeners in
  // app/store.ts. Polling is layered on top per-query for views where near-real-time matters more
  // (see RequestPanel, MyRequestsPanel, PendingPaymentsBoard, NotificationBell).
  refetchOnFocus: true,
  refetchOnReconnect: true,
  endpoints: () => ({}),
});
