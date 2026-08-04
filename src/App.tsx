import { useEffect } from 'react';
import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router-dom';
import { store } from '@/app/store';
import { router } from '@/routes/router';
import { tokenStorage } from '@/lib/tokenStorage';
import { decodeAccessToken } from '@/lib/jwt';
import { hydratedFromToken, profileLoaded, sessionCleared } from '@/features/auth/authSlice';
import { useAppSelector, useAppDispatch } from '@/app/hooks';
import { useGetCurrentUserQuery } from '@/api/userApi';
import { ToastProvider } from '@/components/ui/toast';
import type { Role } from '@/lib/types';

/**
 * On load: if tokens exist, immediately decode the JWT to populate a minimal user object
 * (id/email/roles — enough for route guards and the header to render correctly with no
 * flicker), then fetch the real profile from GET /users/me and replace it once it arrives.
 */
function SessionBootstrap() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);

  useEffect(() => {
    const token = tokenStorage.getAccessToken();
    if (!token) return;

    const decoded = decodeAccessToken(token);
    if (!decoded) {
      dispatch(sessionCleared());
      return;
    }

    const isExpired = decoded.exp * 1000 < Date.now();
    if (isExpired && !tokenStorage.getRefreshToken()) {
      dispatch(sessionCleared());
      return;
    }

    dispatch(hydratedFromToken({
      id: decoded.sub,
      email: decoded.email,
      roles: decoded.roles as Role[],
    }));
  }, [dispatch]);

  const { data, isSuccess, isError } = useGetCurrentUserQuery(undefined, { skip: !isAuthenticated });

  useEffect(() => {
    if (isSuccess && data) {
      dispatch(profileLoaded(data.data));
    }
  }, [isSuccess, data, dispatch]);

  useEffect(() => {
    // baseQueryWithReauth already tried a refresh before surfacing this error, so a
    // failure here means the session is genuinely dead — log the user out cleanly.
    if (isError) {
      dispatch(sessionCleared());
    }
  }, [isError, dispatch]);

  return null;
}

export default function App() {
  return (
    <Provider store={store}>
      <ToastProvider>
        <SessionBootstrap />
        <RouterProvider router={router} />
      </ToastProvider>
    </Provider>
  );
}
