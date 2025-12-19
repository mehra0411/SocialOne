import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/auth';

export function LoginPage() {
  const { loginAs } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-zinc-900">Login</h1>
        <p className="text-sm text-zinc-600">No forms yet. Use a dev-only sign-in button.</p>
      </div>

      <div className="grid grid-cols-1 gap-2">
        <button
          className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          onClick={() => {
            loginAs('user');
            navigate('/dashboard');
          }}
        >
          Continue as User
        </button>
        <button
          className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
          onClick={() => {
            loginAs('super_admin');
            navigate('/admin');
          }}
        >
          Continue as Super Admin
        </button>
      </div>

      <p className="text-sm text-zinc-600">
        Need an account? <Link className="font-medium text-zinc-900 underline" to="/signup">Go to signup</Link>
      </p>
    </div>
  );
}


