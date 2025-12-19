export function AdminPage() {
  return (
    <div className="space-y-2">
      <h1 className="text-xl font-semibold text-zinc-900">Admin</h1>
      <p className="text-sm text-zinc-600">
        Protected page (super_admin only). This link is hidden unless you are a super admin.
      </p>
    </div>
  );
}


