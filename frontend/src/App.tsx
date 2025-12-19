import { Link, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/auth';
import { AdminRoute } from './routes/AdminRoute';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { AdminPage } from './pages/Admin';
import { AnalyticsPage } from './pages/Analytics';
import { BrandsPage } from './pages/Brands';
import { DashboardPage } from './pages/Dashboard';
import { DraftsPage } from './pages/Drafts';
import { LoginPage } from './pages/Login';
import { SignupPage } from './pages/Signup';
import { buttonClassName } from './ui/button';

function AppShell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-sm font-semibold text-zinc-900">
              SocialOne
            </Link>
            <nav className="flex items-center gap-3 text-sm text-zinc-600">
              {user ? (
                <>
                  <NavLink
                    to="/dashboard"
                    className={({ isActive }) =>
                      [
                        'rounded-lg px-2 py-1 font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] focus-visible:ring-offset-2',
                        isActive
                          ? 'bg-[#EEF2FF] text-[#4F46E5]'
                          : 'text-zinc-600 hover:text-[#4F46E5]',
                      ].join(' ')
                    }
                  >
                    Dashboard
                  </NavLink>
                  <NavLink
                    to="/brands"
                    className={({ isActive }) =>
                      [
                        'rounded-lg px-2 py-1 font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] focus-visible:ring-offset-2',
                        isActive ? 'bg-[#EEF2FF] text-[#4F46E5]' : 'text-zinc-600 hover:text-[#4F46E5]',
                      ].join(' ')
                    }
                  >
                    My Brands
                  </NavLink>
                  <NavLink
                    to="/drafts"
                    className={({ isActive }) =>
                      [
                        'rounded-lg px-2 py-1 font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] focus-visible:ring-offset-2',
                        isActive ? 'bg-[#EEF2FF] text-[#4F46E5]' : 'text-zinc-600 hover:text-[#4F46E5]',
                      ].join(' ')
                    }
                  >
                    My Drafts
                  </NavLink>
                  <NavLink
                    to="/analytics"
                    className={({ isActive }) =>
                      [
                        'rounded-lg px-2 py-1 font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] focus-visible:ring-offset-2',
                        isActive ? 'bg-[#EEF2FF] text-[#4F46E5]' : 'text-zinc-600 hover:text-[#4F46E5]',
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
                          'rounded-lg px-2 py-1 font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] focus-visible:ring-offset-2',
                          isActive ? 'bg-[#EEF2FF] text-[#4F46E5]' : 'text-zinc-600 hover:text-[#4F46E5]',
                        ].join(' ')
                      }
                    >
                      Admin
                    </NavLink>
                  ) : null}
                </>
              ) : (
                <>
                  <NavLink
                    to="/login"
                    className={({ isActive }) =>
                      [
                        'rounded-lg px-2 py-1 font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] focus-visible:ring-offset-2',
                        isActive ? 'bg-[#EEF2FF] text-[#4F46E5]' : 'text-zinc-600 hover:text-[#4F46E5]',
                      ].join(' ')
                    }
                  >
                    Login
                  </NavLink>
                  <NavLink
                    to="/signup"
                    className={({ isActive }) =>
                      [
                        'rounded-lg px-2 py-1 font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] focus-visible:ring-offset-2',
                        isActive ? 'bg-[#EEF2FF] text-[#4F46E5]' : 'text-zinc-600 hover:text-[#4F46E5]',
                      ].join(' ')
                    }
                  >
                    Signup
                  </NavLink>
                </>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700">
                  {user.role}
                </span>
                <button
                  className={buttonClassName({ variant: 'secondary', size: 'sm', className: 'rounded-lg' })}
                  onClick={() => {
                    void signOut();
                  }}
                >
                  Logout
                </button>
              </>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  return (
    <AppShell>
      <Routes>
        <Route
          path="/"
          element={<Navigate to={loading ? '/login' : user ? '/dashboard' : '/login'} replace />}
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/brands" element={<BrandsPage />} />
          <Route path="/drafts" element={<DraftsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
        </Route>

        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
