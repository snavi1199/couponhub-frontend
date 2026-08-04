import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Ticket, PlusCircle, LogOut, LayoutDashboard, ShieldCheck } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/app/hooks';
import { sessionCleared } from '@/features/auth/authSlice';
import { useLogoutMutation } from '@/api/authApi';
import { tokenStorage } from '@/lib/tokenStorage';
import { NotificationBell } from '@/features/notifications/NotificationBell';

export function Header() {
  const { user, isAuthenticated } = useAppSelector((s) => s.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [logout] = useLogoutMutation();

  const isSeller = user?.roles.some((r) => ['ROLE_SELLER', 'ROLE_PREMIUM_SELLER', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN'].includes(r));
  const isModerator = user?.roles.some((r) => ['ROLE_MODERATOR', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN'].includes(r));

  const handleLogout = async () => {
    const refreshToken = tokenStorage.getRefreshToken();
    if (refreshToken) {
      try { await logout({ refreshToken }).unwrap(); } catch { /* token likely already expired — clear locally anyway */ }
    }
    dispatch(sessionCleared());
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-20 border-b-2 border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        {/* Left group: logo + nav sit together so nav reads as "next to the brand", not floating
            in the middle of the header (a 3-item justify-between spreads unevenly by design). */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-paper">
              <Ticket size={18} />
            </span>
            <span className="font-display text-lg tracking-tight text-ink">CouponHub</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            <NavLink to="/coupons" className={({ isActive }) => `btn-ghost ${isActive ? 'bg-brand-light text-brand-dark' : ''}`}>
              Browse deals
            </NavLink>
            {isModerator && (
              <NavLink to="/moderation" className={({ isActive }) => `btn-ghost ${isActive ? 'bg-brand-light text-brand-dark' : ''}`}>
                <ShieldCheck size={16} /> Moderation
              </NavLink>
            )}
          </nav>
        </div>

        {/* Right group: everything account/action related */}
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              {isSeller && (
                <Link to="/coupons/new" className="btn-secondary hidden sm:inline-flex">
                  <PlusCircle size={16} /> List a coupon
                </Link>
              )}
              <NotificationBell />
              <Link to="/dashboard" className="btn-ghost">
                <LayoutDashboard size={16} />
                <span className="hidden sm:inline">{user?.fullName?.split(' ')[0]}</span>
              </Link>
              <button onClick={handleLogout} className="btn-ghost" aria-label="Log out">
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost">Log in</Link>
              <Link to="/register" className="btn-primary">Sign up free</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
