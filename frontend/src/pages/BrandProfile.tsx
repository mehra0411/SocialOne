import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useActiveBrand } from '../brands/activeBrand';
import { buttonClassName } from '../ui/button';

type BrandProfileForm = {
  category: string;
  targetAudience: string;

  brandVoice: string;
  toneDescription: string;
  styleDoDont: string;

  preferredLanguage: string;
  bannedWords: string;
  emojisAllowed: boolean;

  primaryColor: string;
  secondaryColor: string;
  fontStyle: string;
};

const PROFILE_KEY_PREFIX = 'socialone.brandProfile.';

function loadLocalProfile(brandId: string): Partial<BrandProfileForm> | null {
  try {
    const raw = localStorage.getItem(`${PROFILE_KEY_PREFIX}${brandId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as Partial<BrandProfileForm>;
  } catch {
    return null;
  }
}

function saveLocalProfile(brandId: string, data: BrandProfileForm) {
  localStorage.setItem(`${PROFILE_KEY_PREFIX}${brandId}`, JSON.stringify(data));
}

const emptyForm: BrandProfileForm = {
  category: '',
  targetAudience: '',
  brandVoice: '',
  toneDescription: '',
  styleDoDont: '',
  preferredLanguage: '',
  bannedWords: '',
  emojisAllowed: true,
  primaryColor: '',
  secondaryColor: '',
  fontStyle: '',
};

export function BrandProfilePage() {
  const { activeBrandId, activeBrandName } = useActiveBrand();
  const [form, setForm] = useState<BrandProfileForm>(emptyForm);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  if (!activeBrandId) return <Navigate to="/brands" replace />;

  const titleName = activeBrandName ?? `Brand ${activeBrandId.slice(0, 8)}…`;

  useEffect(() => {
    const fromLocal = loadLocalProfile(activeBrandId) ?? {};
    setForm({ ...emptyForm, ...fromLocal });
  }, [activeBrandId]);

  const isDirty = useMemo(() => {
    const saved = loadLocalProfile(activeBrandId);
    if (!saved) return true; // allow first save even if empty
    // shallow compare is fine (flat form)
    return (Object.keys(emptyForm) as (keyof BrandProfileForm)[]).some((k) => (saved as any)[k] !== form[k]);
  }, [activeBrandId, form]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-zinc-900">Brand Profile</h1>
        <p className="text-sm text-zinc-600">
          Optional settings to improve content generation quality. Editing is safe and non-blocking.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="text-sm font-medium text-zinc-900">Active brand</div>
            <div className="text-sm text-zinc-600">{titleName}</div>
            <div className="font-mono text-xs text-zinc-500">{activeBrandId}</div>
          </div>
          <div className="flex items-center gap-2">
            <Link className={buttonClassName({ variant: 'secondary', size: 'sm' })} to="/brands">
              Switch brand
            </Link>
          </div>
        </div>
      </div>

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-900">Brand Basics</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1">
              <label className="text-sm font-medium text-zinc-900">Category / Niche</label>
              <select
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5] focus:ring-offset-2"
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
              >
                <option value="">(optional)</option>
                <option value="Ecommerce">Ecommerce</option>
                <option value="SaaS">SaaS</option>
                <option value="Local Business">Local Business</option>
                <option value="Creator">Creator</option>
                <option value="Agency">Agency</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="grid gap-1">
              <label className="text-sm font-medium text-zinc-900">Target Audience</label>
              <select
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5] focus:ring-offset-2"
                value={form.targetAudience}
                onChange={(e) => setForm((p) => ({ ...p, targetAudience: e.target.value }))}
              >
                <option value="">(optional)</option>
                <option value="B2C">B2C</option>
                <option value="B2B">B2B</option>
                <option value="Both">Both</option>
              </select>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-900">Brand Voice & Tone</h2>
          <div className="mt-4 grid gap-4">
            <div className="grid gap-1">
              <label className="text-sm font-medium text-zinc-900">Brand Voice</label>
              <select
                className="w-full max-w-md rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5] focus:ring-offset-2"
                value={form.brandVoice}
                onChange={(e) => setForm((p) => ({ ...p, brandVoice: e.target.value }))}
              >
                <option value="">(optional)</option>
                <option value="friendly">Friendly</option>
                <option value="professional">Professional</option>
                <option value="bold">Bold</option>
                <option value="playful">Playful</option>
                <option value="minimal">Minimal</option>
                <option value="luxury">Luxury</option>
                <option value="custom">Custom</option>
              </select>
              {form.brandVoice === 'custom' ? (
                <p className="text-xs text-zinc-500">Tip: use Tone Description to define your custom voice.</p>
              ) : null}
            </div>

            <div className="grid gap-1">
              <label className="text-sm font-medium text-zinc-900">Tone Description</label>
              <textarea
                className="min-h-28 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5] focus:ring-offset-2"
                value={form.toneDescription}
                onChange={(e) => setForm((p) => ({ ...p, toneDescription: e.target.value }))}
              />
            </div>

            <div className="grid gap-1">
              <label className="text-sm font-medium text-zinc-900">Style Do / Don’t</label>
              <textarea
                className="min-h-28 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5] focus:ring-offset-2"
                value={form.styleDoDont}
                onChange={(e) => setForm((p) => ({ ...p, styleDoDont: e.target.value }))}
              />
              <p className="text-xs text-zinc-500">Example: “Do: short sentences. Don’t: slang.”</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-900">Language Rules</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1">
              <label className="text-sm font-medium text-zinc-900">Preferred Language</label>
              <input
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5] focus:ring-offset-2"
                value={form.preferredLanguage}
                onChange={(e) => setForm((p) => ({ ...p, preferredLanguage: e.target.value }))}
              />
            </div>

            <div className="grid gap-1">
              <label className="text-sm font-medium text-zinc-900">Banned Words (comma-separated)</label>
              <input
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5] focus:ring-offset-2"
                placeholder="e.g. free, cheap, guaranteed"
                value={form.bannedWords}
                onChange={(e) => setForm((p) => ({ ...p, bannedWords: e.target.value }))}
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
            <div>
              <div className="text-sm font-medium text-zinc-900">Emojis Allowed</div>
              <div className="text-xs text-zinc-500">Toggle whether emojis are allowed in captions.</div>
            </div>
            <button
              type="button"
              className={[
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                form.emojisAllowed ? 'bg-[#4F46E5]' : 'bg-zinc-300',
              ].join(' ')}
              onClick={() => setForm((p) => ({ ...p, emojisAllowed: !p.emojisAllowed }))}
              aria-pressed={form.emojisAllowed}
            >
              <span
                className={[
                  'inline-block h-5 w-5 transform rounded-full bg-white transition-transform',
                  form.emojisAllowed ? 'translate-x-5' : 'translate-x-1',
                ].join(' ')}
              />
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-900">Visual Identity (Light)</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1">
              <label className="text-sm font-medium text-zinc-900">Primary Color (hex)</label>
              <input
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5] focus:ring-offset-2"
                placeholder="#4F46E5"
                value={form.primaryColor}
                onChange={(e) => setForm((p) => ({ ...p, primaryColor: e.target.value }))}
              />
            </div>
            <div className="grid gap-1">
              <label className="text-sm font-medium text-zinc-900">Secondary Color (hex)</label>
              <input
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5] focus:ring-offset-2"
                placeholder="#EEF2FF"
                value={form.secondaryColor}
                onChange={(e) => setForm((p) => ({ ...p, secondaryColor: e.target.value }))}
              />
            </div>
            <div className="grid gap-1 sm:col-span-2">
              <label className="text-sm font-medium text-zinc-900">Font Style (optional)</label>
              <input
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5] focus:ring-offset-2"
                placeholder="e.g. Inter, Serif, Modern"
                value={form.fontStyle}
                onChange={(e) => setForm((p) => ({ ...p, fontStyle: e.target.value }))}
              />
            </div>
          </div>
          <p className="mt-3 text-xs text-zinc-500">No logo upload, no files—just lightweight config.</p>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-zinc-900">Save changes</h2>
              <p className="text-sm text-zinc-600">
                Backend brand profile saving isn’t available yet—this saves locally on your device for now.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={buttonClassName({ variant: 'secondary' })}
                onClick={() => setForm(emptyForm)}
                disabled={saving}
              >
                Reset
              </button>
              <button
                type="button"
                className={buttonClassName({ variant: 'primary' })}
                disabled={saving || !isDirty}
                onClick={async () => {
                  setSaveError(null);
                  setSaveSuccess(null);
                  setSaving(true);
                  try {
                    // Local-only profile (Step 2): no backend calls.
                    saveLocalProfile(activeBrandId, form);
                    setSaveSuccess('Saved locally.');
                  } catch (e) {
                    setSaveError(e instanceof Error ? e.message : 'Save failed');
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>

          {saveError ? <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{saveError}</div> : null}
          {saveSuccess ? (
            <div className="mt-4 rounded-xl bg-green-50 p-3 text-sm text-green-800">{saveSuccess}</div>
          ) : null}
        </section>
      </form>
    </div>
  );
}


