import { Link, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/auth';
import { AdminRoute } from './routes/AdminRoute';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { AdminPage } from './pages/Admin';
import { AnalyticsPage } from './pages/Analytics';
import { BrandsPage } from './pages/Brands';
import { DashboardPage } from './pages/Dashboard';
import { DraftsPage } from './pages/Drafts';
import { LandingPage } from './pages/Landing';
import { LoginPage } from './pages/Login';
import { SignupPage } from './pages/Signup';
import { buttonClassName } from './ui/button';
import { AdminMetricsPage } from './pages/AdminMetrics';
import { useActiveBrand } from './brands/activeBrand';
import { BrandProfilePage } from './pages/BrandProfile';
import { BrandPlatformsPage } from './pages/BrandPlatforms';
import { useState } from 'react';

function AppShell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const { activeBrandId, activeBrandName } = useActiveBrand();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinkClassName = (isActive: boolean) =>
    [
      'block rounded-lg px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] focus-visible:ring-offset-2',
      isActive ? 'bg-[#EEF2FF] text-[#4F46E5]' : 'text-white hover:bg-violet-600 hover:text-white',
    ].join(' ');

  return (
    <div className="min-h-screen bg-violet-200">
      <header className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-4 py-2 sm:px-6 lg:px-8 animate-gradient">
        <div className="absolute inset-0 animate-shimmer opacity-10"></div>
        <div className="mx-auto max-w-5xl px-3 sm:px-4 relative z-10">
          {/* Main header bar */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <Link to="/" className="text-sm sm:text-base font-semibold text-white glow-text animate-slide-in-left hover:scale-105 transition-transform">
                SocialOne
              </Link>
              {/* Desktop Navigation */}
              <nav className="hidden lg:flex items-center gap-1 xl:gap-2 text-sm">
                {user ? (
                  <>
                    <NavLink
                      to="/dashboard"
                      className={({ isActive }) =>
                        [
                          'rounded-lg px-2 xl:px-3 py-1 font-medium transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] focus-visible:ring-offset-2',
                          isActive
                            ? 'bg-[#fff] text-[#4F46E5] glow-on-hover'
                            : 'text-white hover:bg-violet-600 hover:text-white hover:scale-105',
                        ].join(' ')
                      }
                    >
                      Dashboard
                    </NavLink>
                    <NavLink
                      to="/brands"
                      className={({ isActive }) =>
                        [
                          'rounded-lg px-2 xl:px-3 py-1 font-medium transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] focus-visible:ring-offset-2',
                          isActive ? 'bg-[#EEF2FF] text-[#4F46E5] glow-on-hover' : 'text-white hover:bg-violet-600 hover:text-white hover:scale-105',
                        ].join(' ')
                      }
                    >
                      My Brands
                    </NavLink>
                    <NavLink
                      to="/brand/profile"
                      className={({ isActive }) =>
                        [
                          'rounded-lg px-2 xl:px-3 py-1 font-medium transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] focus-visible:ring-offset-2',
                          isActive ? 'bg-[#EEF2FF] text-[#4F46E5] glow-on-hover' : 'text-white hover:bg-violet-600 hover:text-white hover:scale-105',
                        ].join(' ')
                      }
                    >
                      Brand Profile
                    </NavLink>
                    <NavLink
                      to="/brand/platforms"
                      className={({ isActive }) =>
                        [
                          'rounded-lg px-2 xl:px-3 py-1 font-medium transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] focus-visible:ring-offset-2',
                          isActive ? 'bg-[#EEF2FF] text-[#4F46E5] glow-on-hover' : 'text-white hover:bg-violet-600 hover:text-white hover:scale-105',
                        ].join(' ')
                      }
                    >
                      Platforms
                    </NavLink>
                    <NavLink
                      to="/drafts"
                      className={({ isActive }) =>
                        [
                          'rounded-lg px-2 xl:px-3 py-1 font-medium transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] focus-visible:ring-offset-2',
                          isActive ? 'bg-[#EEF2FF] text-[#4F46E5] glow-on-hover' : 'text-white hover:bg-violet-600 hover:text-white hover:scale-105',
                        ].join(' ')
                      }
                    >
                      My Drafts
                    </NavLink>
                    <NavLink
                      to="/analytics"
                      className={({ isActive }) =>
                        [
                          'rounded-lg px-2 xl:px-3 py-1 font-medium transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] focus-visible:ring-offset-2',
                          isActive ? 'bg-[#EEF2FF] text-[#4F46E5] glow-on-hover' : 'text-white hover:bg-violet-600 hover:text-white hover:scale-105',
                        ].join(' ')
                      }
                    >
                      Analytics
                    </NavLink>
                    {user.role === 'super_admin' ? (
                      <NavLink
                        to="/admin"
                        className={({ isActive }) =>
                          [
                            'rounded-lg px-2 xl:px-3 py-1 font-medium transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] focus-visible:ring-offset-2',
                            isActive ? 'bg-[#EEF2FF] text-[#4F46E5] glow-on-hover' : 'text-white hover:bg-violet-600 hover:text-white hover:scale-105',
                          ].join(' ')
                        }
                      >
                        Admin
                      </NavLink>
                    ) : null}
                    {user.role === 'super_admin' ? (
                      <NavLink
                        to="/admin/metrics"
                        className={({ isActive }) =>
                          [
                            'rounded-lg px-2 xl:px-3 py-1 font-medium transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] focus-visible:ring-offset-2',
                            isActive ? 'bg-[#EEF2FF] text-[#4F46E5] glow-on-hover' : 'text-white hover:bg-violet-600 hover:text-white hover:scale-105',
                          ].join(' ')
                        }
                      >
                        Metrics
                      </NavLink>
                    ) : null}
                  </>
                ) : (
                  <>
                    <NavLink
                      to="/login"
                      className={({ isActive }) =>
                        [
                          'rounded-lg px-2 xl:px-3 py-1 font-medium transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] focus-visible:ring-offset-2',
                          isActive ? 'bg-[#EEF2FF] text-[#4F46E5] glow-on-hover' : 'text-white hover:bg-violet-600 hover:text-white hover:scale-105',
                        ].join(' ')
                      }
                    >
                      Login
                    </NavLink>
                    <NavLink
                      to="/signup"
                      className={({ isActive }) =>
                        [
                          'rounded-lg px-2 xl:px-3 py-1 font-medium transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] focus-visible:ring-offset-2',
                          isActive ? 'bg-[#EEF2FF] text-[#4F46E5] glow-on-hover' : 'text-white hover:bg-violet-600 hover:text-white hover:scale-105',
                        ].join(' ')
                      }
                    >
                      Signup
                    </NavLink>
                  </>
                )}
              </nav>
            </div>

            {/* Right side: User info and mobile menu button */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {user ? (
                <>
                  {/* Desktop user info */}
                  <div className="hidden md:flex items-center gap-1.5 sm:gap-2">
                    {activeBrandId ? (
                      <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 whitespace-nowrap">
                        <span className="hidden sm:inline">Brand: </span>
                        {activeBrandName ?? 'Untitled brand'}
                      </span>
                    ) : null}
                    <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700">
                      {user.role}
                    </span>
                    <button
                      className={buttonClassName({ variant: 'secondary', size: 'sm', className: 'rounded-lg glow-on-hover relative overflow-hidden' })}
                      onClick={() => {
                        void signOut();
                      }}
                    >
                      <span className="relative z-10">Logout</span>
                    </button>
                  </div>
                  {/* Mobile user info - simplified */}
                  <div className="md:hidden flex items-center gap-1">
                    {activeBrandId && (
                      <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-700 truncate max-w-[80px]">
                        {activeBrandName ?? 'Brand'}
                      </span>
                    )}
                  </div>
                </>
              ) : null}
              
              {/* Mobile menu button */}
              {user && (
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden rounded-lg p-2 text-white hover:bg-violet-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-violet-500"
                  aria-label="Toggle menu"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    {mobileMenuOpen ? (
                      <path d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path d="M4 6h16M4 12h16M4 18h16" />
                    )}
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          {user && mobileMenuOpen && (
            <div className="lg:hidden border-t border-violet-400 pb-3 pt-3">
              <nav className="flex flex-col gap-1">
                <NavLink
                  to="/dashboard"
                  className={({ isActive }) => navLinkClassName(isActive)}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </NavLink>
                <NavLink
                  to="/brands"
                  className={({ isActive }) => navLinkClassName(isActive)}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  My Brands
                </NavLink>
                <NavLink
                  to="/brand/profile"
                  className={({ isActive }) => navLinkClassName(isActive)}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Brand Profile
                </NavLink>
                <NavLink
                  to="/brand/platforms"
                  className={({ isActive }) => navLinkClassName(isActive)}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Platforms
                </NavLink>
                <NavLink
                  to="/drafts"
                  className={({ isActive }) => navLinkClassName(isActive)}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  My Drafts
                </NavLink>
                <NavLink
                  to="/analytics"
                  className={({ isActive }) => navLinkClassName(isActive)}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Analytics
                </NavLink>
                {user.role === 'super_admin' ? (
                  <NavLink
                    to="/admin"
                    className={({ isActive }) => navLinkClassName(isActive)}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Admin
                  </NavLink>
                ) : null}
                {user.role === 'super_admin' ? (
                  <NavLink
                    to="/admin/metrics"
                    className={({ isActive }) => navLinkClassName(isActive)}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Metrics
                  </NavLink>
                ) : null}
                <div className="mt-2 pt-2 border-t border-violet-400 flex flex-col gap-2">
                  {activeBrandId && (
                    <div className="px-3 py-1 text-xs text-white/90">
                      Brand: {activeBrandName ?? 'Untitled brand'}
                    </div>
                  )}
                  <div className="px-3 py-1 text-xs text-white/90">
                    Role: {user.role}
                  </div>
                  <button
                    className={buttonClassName({ variant: 'secondary', size: 'sm', className: 'rounded-lg mx-3 glow-on-hover relative overflow-hidden' })}
                    onClick={() => {
                      void signOut();
                      setMobileMenuOpen(false);
                    }}
                  >
                    <span className="relative z-10">Logout</span>
                  </button>
                </div>
              </nav>
            </div>
          )}

          {/* Mobile login/signup links */}
          {!user && (
            <div className="lg:hidden border-t border-violet-400 pb-3 pt-3">
              <nav className="flex flex-col gap-1">
                <NavLink
                  to="/login"
                  className={({ isActive }) => navLinkClassName(isActive)}
                >
                  Login
                </NavLink>
                <NavLink
                  to="/signup"
                  className={({ isActive }) => navLinkClassName(isActive)}
                >
                  Signup
                </NavLink>
              </nav>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-3 sm:px-4 py-4 sm:py-6 lg:py-8 ">{children}</main>
    </div>
  );
}

export default function App() {
  const { loading } = useAuth();

  return (
    <AppShell>
      <Routes>
        <Route
          path="/"
          element={
            loading ? null : <LandingPage />
          }
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/brands" element={<BrandsPage />} />
          <Route path="/brand/profile" element={<BrandProfilePage />} />
          <Route path="/brand/platforms" element={<BrandPlatformsPage />} />
          <Route path="/drafts" element={<DraftsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
        </Route>

        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/metrics" element={<AdminMetricsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
