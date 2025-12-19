import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/auth';

export function LoginPage() {
  const { signInWithPassword } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-zinc-900">Login</h1>
        <p className="text-sm text-zinc-600">Sign in with Supabase Auth.</p>
      </div>

      <form
        className="grid grid-cols-1 gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          setSubmitting(true);
          try {
            await signInWithPassword(email.trim(), password);
            navigate('/dashboard');
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-zinc-900">Email</span>
          <input
            className="rounded-xl border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="font-medium text-zinc-900">Password</span>
          <input
            className="rounded-xl border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {error ? <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

        <button
          className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          type="submit"
          disabled={submitting}
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="text-sm text-zinc-600">
        Need an account? <Link className="font-medium text-zinc-900 underline" to="/signup">Go to signup</Link>
      </p>
    </div>
  );
}


