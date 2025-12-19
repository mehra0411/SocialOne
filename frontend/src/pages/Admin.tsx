import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../lib/api';
import { buttonClassName } from '../ui/button';

type AdminUser = {
  id: string;
  email: string;
  role: 'user' | 'super_admin';
  account_status: 'active' | 'paused' | 'restricted' | 'suspended';
  created_at: string;
};

type BrandMetadata = {
  id: string;
  owner_user_id: string;
  name: string | null;
  category: string | null;
  voice_guidelines: string | null;
  brand_colors: unknown | null;
  created_at: string;
};

const ACCOUNT_STATUSES: AdminUser['account_status'][] = ['active', 'paused', 'restricted', 'suspended'];

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function safeJson(v: unknown): string {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

export function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [brands, setBrands] = useState<BrandMetadata[]>([]);

  // Track per-user pending status edits.
  const [pendingStatus, setPendingStatus] = useState<Record<string, AdminUser['account_status']>>({});
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  const dirtyUserIds = useMemo(() => {
    const set = new Set<string>();
    for (const u of users) {
      const next = pendingStatus[u.id];
      if (next && next !== u.account_status) set.add(u.id);
    }
    return set;
  }, [pendingStatus, users]);

  async function refresh() {
    setError(null);
    setLoading(true);
    try {
      const [usersResp, brandsResp] = await Promise.all([
        apiFetch<{ users: AdminUser[] }>('/api/admin/users'),
        apiFetch<{ brands: BrandMetadata[] }>('/api/admin/brands'),
      ]);
      setUsers(usersResp.users);
      setBrands(brandsResp.brands);
      setPendingStatus({});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-zinc-900">Admin</h1>
          <p className="text-sm text-zinc-600">Super admin tools: users, account status controls, brand metadata.</p>
        </div>

        <button
          className={buttonClassName({ variant: 'secondary' })}
          onClick={() => void refresh()}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {error ? <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">Users</h2>
            <p className="text-sm text-zinc-600">List all users and update account status.</p>
          </div>
          <div className="text-xs text-zinc-500">{loading ? 'Loading…' : `${users.length} users`}</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs font-semibold uppercase tracking-wide text-zinc-600">
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">User ID</th>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4">Account status</th>
                <th className="py-2 pr-4">Created</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const selected = pendingStatus[u.id] ?? u.account_status;
                const isDirty = dirtyUserIds.has(u.id);
                const isSaving = savingUserId === u.id;

                return (
                  <tr key={u.id} className="border-b border-zinc-100">
                    <td className="py-3 pr-4 text-zinc-900">{u.email}</td>
                    <td className="py-3 pr-4 font-mono text-xs text-zinc-700">{u.id}</td>
                    <td className="py-3 pr-4">
                      <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <select
                        className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm outline-none focus:border-zinc-900"
                        value={selected}
                        onChange={(e) => {
                          const next = e.target.value as AdminUser['account_status'];
                          setPendingStatus((prev) => ({ ...prev, [u.id]: next }));
                        }}
                      >
                        {ACCOUNT_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 pr-4 text-xs text-zinc-600">{formatDate(u.created_at)}</td>
                    <td className="py-3 pr-4">
                      <button
                        className={buttonClassName({ variant: 'primary', size: 'sm', className: 'rounded-lg' })}
                        disabled={!isDirty || isSaving}
                        onClick={async () => {
                          setError(null);
                          setSavingUserId(u.id);
                          try {
                            const resp = await apiFetch<{ user: AdminUser }>(
                              `/api/admin/users/${u.id}/account-status`,
                              {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ accountStatus: selected }),
                              },
                            );
                            setUsers((prev) => prev.map((x) => (x.id === u.id ? resp.user : x)));
                            setPendingStatus((prev) => {
                              const next = { ...prev };
                              delete next[u.id];
                              return next;
                            });
                          } catch (e) {
                            setError(e instanceof Error ? e.message : 'Failed to update user');
                          } finally {
                            setSavingUserId(null);
                          }
                        }}
                      >
                        {isSaving ? 'Saving…' : isDirty ? 'Save' : 'Saved'}
                      </button>
                    </td>
                  </tr>
                );
              })}

              {!loading && users.length === 0 ? (
                <tr>
                  <td className="py-6 text-sm text-zinc-600" colSpan={6}>
                    No users found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">Brand metadata</h2>
            <p className="text-sm text-zinc-600">Metadata only (no raw media).</p>
          </div>
          <div className="text-xs text-zinc-500">{loading ? 'Loading…' : `${brands.length} brands`}</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs font-semibold uppercase tracking-wide text-zinc-600">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Brand ID</th>
                <th className="py-2 pr-4">Owner user</th>
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4">Voice guidelines</th>
                <th className="py-2 pr-4">Brand colors</th>
                <th className="py-2 pr-4">Created</th>
              </tr>
            </thead>
            <tbody>
              {brands.map((b) => (
                <tr key={b.id} className="border-b border-zinc-100 align-top">
                  <td className="py-3 pr-4 font-medium text-zinc-900">{b.name ?? '(unnamed)'}</td>
                  <td className="py-3 pr-4 font-mono text-xs text-zinc-700">{b.id}</td>
                  <td className="py-3 pr-4 font-mono text-xs text-zinc-700">{b.owner_user_id}</td>
                  <td className="py-3 pr-4 text-zinc-700">{b.category ?? '-'}</td>
                  <td className="py-3 pr-4 text-xs text-zinc-700">
                    <div className="max-w-[340px] whitespace-pre-wrap break-words">
                      {b.voice_guidelines ?? '-'}
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-xs text-zinc-700">
                    <div className="max-w-[260px] whitespace-pre-wrap break-words">{safeJson(b.brand_colors)}</div>
                  </td>
                  <td className="py-3 pr-4 text-xs text-zinc-600">{formatDate(b.created_at)}</td>
                </tr>
              ))}

              {!loading && brands.length === 0 ? (
                <tr>
                  <td className="py-6 text-sm text-zinc-600" colSpan={7}>
                    No brands found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}


