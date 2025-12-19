import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/auth';
import { AdminRoute } from './routes/AdminRoute';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { AdminPage } from './pages/Admin';
import { DashboardPage } from './pages/Dashboard';
import { LoginPage } from './pages/Login';
import { SignupPage } from './pages/Signup';

function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();

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
                  <Link className="hover:text-zinc-900" to="/dashboard">
                    Dashboard
                  </Link>
                  {user.role === 'super_admin' ? (
                    <Link className="hover:text-zinc-900" to="/admin">
                      Admin
                    </Link>
                  ) : null}
                </>
              ) : (
                <>
                  <Link className="hover:text-zinc-900" to="/login">
                    Login
                  </Link>
                  <Link className="hover:text-zinc-900" to="/signup">
                    Signup
                  </Link>
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
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-50"
                  onClick={logout}
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
  const { user } = useAuth();

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
        </Route>

        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
