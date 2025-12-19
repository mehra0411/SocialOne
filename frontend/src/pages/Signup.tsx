import { Link } from 'react-router-dom';

export function SignupPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-zinc-900">Signup</h1>
        <p className="text-sm text-zinc-600">No forms yet. This page is a placeholder.</p>
      </div>

      <div className="rounded-xl bg-zinc-50 p-4 text-sm text-zinc-700">
        Signup UI will be added later.
      </div>

      <p className="text-sm text-zinc-600">
        Already have an account? <Link className="font-medium text-zinc-900 underline" to="/login">Go to login</Link>
      </p>
    </div>
  );
}


