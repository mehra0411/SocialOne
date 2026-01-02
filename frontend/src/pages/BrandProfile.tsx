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

  const titleName = activeBrandName ?? 'Untitled brand';

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
    <div className="">
      {/* Hero Header Section */}
      <div className="relative overflow-hidden px-0 py-2 sm:px-6 lg:px-0 mb-3">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>
        <div className="relative mx-auto max-w-7xl">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="space-y-2">
              <h1 className="text-3xl md:text-3xl font-bold text-primary text-[#4F46E5]">Brand Profile
              </h1>
              <p className="text-md text-primary font-medium">
                Define how your brand communicates and connects
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pt-2 sm:px-6 lg:px-0">
        {/* Active Brand Card */}
        <div className="mb-8 transform transition-all duration-300 hover:scale-[1.01]">
          <div className="relative overflow-hidden rounded-3xl bg-white/80 backdrop-blur-xl shadow-xl ring-1 ring-black/5">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10"></div>
            <div className="relative p-6 sm:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg">
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Active Brand</div>
                      <div className="text-lg font-bold text-gray-900 sm:text-xl">{titleName}</div>
                    </div>
                  </div>
                </div>
                <Link
                  className={buttonClassName({ variant: 'secondary', size: 'sm' }) + ' shadow-md hover:shadow-lg transition-shadow'}
                  to="/brands"
                >
                  Switch brand
                </Link>
              </div>
            </div>
          </div>
        </div>

        <form
          className="space-y-6 sm:space-y-8"
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          {/* Brand Basics Card */}
          <section className="group relative overflow-hidden rounded-3xl bg-white/90 backdrop-blur-xl shadow-xl ring-1 ring-black/5 transition-all duration-300 hover:shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-indigo-500/5 to-purple-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
            <div className="relative p-6 sm:p-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">Brand Basics</h2>
                  <p className="text-sm text-gray-500">Essential information about your brand</p>
                </div>
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="group/field space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Industry / Category</label>
                  <select
                    className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 outline-none transition-all duration-200 focus:border-indigo-500 focus:bg-indigo-50/50 focus:ring-4 focus:ring-indigo-500/20"
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
                  <p className="text-xs text-gray-500">Helps us tailor content ideas to your niche.</p>
                </div>
                <div className="group/field space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Target Audience</label>
                  <select
                    className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 outline-none transition-all duration-200 focus:border-indigo-500 focus:bg-indigo-50/50 focus:ring-4 focus:ring-indigo-500/20"
                    value={form.targetAudience}
                    onChange={(e) => setForm((p) => ({ ...p, targetAudience: e.target.value }))}
                  >
                    <option value="">(optional)</option>
                    <option value="B2C">B2C</option>
                    <option value="B2B">B2B</option>
                    <option value="Both">Both</option>
                  </select>
                  <p className="text-xs text-gray-500">Who are you primarily speaking to?</p>
                </div>
              </div>
            </div>
          </section>

          {/* Brand Voice & Tone Card */}
          <section className="group relative overflow-hidden rounded-3xl bg-white/90 backdrop-blur-xl shadow-xl ring-1 ring-black/5 transition-all duration-300 hover:shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-pink-500/5 to-rose-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
            <div className="relative p-6 sm:p-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-lg">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">Brand Voice & Tone</h2>
                  <p className="text-sm text-gray-500">Define your brand's personality and communication style</p>
                </div>
              </div>
              <div className="space-y-6">
                <div className="group/field space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Brand Voice (Tone)</label>
                  <select
                    className="w-full max-w-md rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 outline-none transition-all duration-200 focus:border-purple-500 focus:bg-purple-50/50 focus:ring-4 focus:ring-purple-500/20"
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
                  <p className="text-xs text-gray-500">This guides how captions and messaging are written.</p>
                </div>

                <div className="group/field space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Tone Description</label>
                  <textarea
                    className="min-h-32 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 outline-none transition-all duration-200 focus:border-purple-500 focus:bg-purple-50/50 focus:ring-4 focus:ring-purple-500/20"
                    placeholder="Professional, Friendly, Educational"
                    value={form.toneDescription}
                    onChange={(e) => setForm((p) => ({ ...p, toneDescription: e.target.value }))}
                  />
                  <p className="text-xs text-gray-500">This guides how captions and messaging are written.</p>
                </div>

                <div className="group/field space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Brand Voice Style (Optional)</label>
                  <textarea
                    className="min-h-32 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 outline-none transition-all duration-200 focus:border-purple-500 focus:bg-purple-50/50 focus:ring-4 focus:ring-purple-500/20"
                    placeholder="Add any nuances or examples that describe how your brand sounds..."
                    value={form.styleDoDont}
                    onChange={(e) => setForm((p) => ({ ...p, styleDoDont: e.target.value }))}
                  />
                  <p className="text-xs text-gray-500">Add any nuances or examples that describe how your brand sounds.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Language Rules Card */}
          <section className="group relative overflow-hidden rounded-3xl bg-white/90 backdrop-blur-xl shadow-xl ring-1 ring-black/5 transition-all duration-300 hover:shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-cyan-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
            <div className="relative p-6 sm:p-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">Language Rules</h2>
                  <p className="text-sm text-gray-500">Set guidelines for content generation</p>
                </div>
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="group/field space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Instagram Username (reference only)</label>
                  <input
                    className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 outline-none transition-all duration-200 focus:border-emerald-500 focus:bg-emerald-50/50 focus:ring-4 focus:ring-emerald-500/20"
                    value={form.preferredLanguage}
                    onChange={(e) => setForm((p) => ({ ...p, preferredLanguage: e.target.value }))}
                  />
                  <p className="text-xs text-gray-500">
                    This does not connect your Instagram account. You'll do that later.
                  </p>
                </div>

                <div className="group/field space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Words or Phrases to Avoid (Optional)</label>
                  <input
                    className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 outline-none transition-all duration-200 focus:border-emerald-500 focus:bg-emerald-50/50 focus:ring-4 focus:ring-emerald-500/20"
                    placeholder="e.g. free, cheap, guaranteed"
                    value={form.bannedWords}
                    onChange={(e) => setForm((p) => ({ ...p, bannedWords: e.target.value }))}
                  />
                  <p className="text-xs text-gray-500">AI will avoid using these in generated content.</p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between rounded-2xl border-2 border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100/50 p-5 transition-all duration-200 hover:border-emerald-300 hover:shadow-md">
                <div className="space-y-1">
                  <div className="text-base font-bold text-gray-900">Emojis Allowed</div>
                  <div className="text-xs text-gray-600">Toggle whether emojis are allowed in captions.</div>
                </div>
                <button
                  type="button"
                  className={[
                    'relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-emerald-500/30',
                    form.emojisAllowed ? 'bg-gradient-to-r from-emerald-500 to-teal-600 shadow-lg' : 'bg-gray-300',
                  ].join(' ')}
                  onClick={() => setForm((p) => ({ ...p, emojisAllowed: !p.emojisAllowed }))}
                  aria-pressed={form.emojisAllowed}
                >
                  <span
                    className={[
                      'inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300',
                      form.emojisAllowed ? 'translate-x-6' : 'translate-x-1',
                    ].join(' ')}
                  />
                </button>
              </div>
            </div>
          </section>

          {/* Brand Colors Card */}
          <section className="group relative overflow-hidden rounded-3xl bg-white/90 backdrop-blur-xl shadow-xl ring-1 ring-black/5 transition-all duration-300 hover:shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-red-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
            <div className="relative p-6 sm:p-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">Brand Colors (Optional)</h2>
                  <p className="text-sm text-gray-500">Define your visual identity</p>
                </div>
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="group/field space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Primary Color (hex)</label>
                  <div className="relative">
                    <input
                      className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 pl-12 font-mono text-sm font-medium text-gray-900 outline-none transition-all duration-200 focus:border-amber-500 focus:bg-amber-50/50 focus:ring-4 focus:ring-amber-500/20"
                      placeholder="#4F46E5"
                      value={form.primaryColor}
                      onChange={(e) => setForm((p) => ({ ...p, primaryColor: e.target.value }))}
                    />
                    <div
                      className="absolute left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-lg border-2 border-gray-300"
                      style={{ backgroundColor: form.primaryColor || '#4F46E5' }}
                    />
                  </div>
                </div>
                <div className="group/field space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Secondary Color (hex)</label>
                  <div className="relative">
                    <input
                      className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 pl-12 font-mono text-sm font-medium text-gray-900 outline-none transition-all duration-200 focus:border-amber-500 focus:bg-amber-50/50 focus:ring-4 focus:ring-amber-500/20"
                      placeholder="#EEF2FF"
                      value={form.secondaryColor}
                      onChange={(e) => setForm((p) => ({ ...p, secondaryColor: e.target.value }))}
                    />
                    <div
                      className="absolute left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-lg border-2 border-gray-300"
                      style={{ backgroundColor: form.secondaryColor || '#EEF2FF' }}
                    />
                  </div>
                </div>
                <div className="group/field space-y-2 sm:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700">Font Style (optional)</label>
                  <input
                    className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 outline-none transition-all duration-200 focus:border-amber-500 focus:bg-amber-50/50 focus:ring-4 focus:ring-amber-500/20"
                    placeholder="e.g. Inter, Serif, Modern"
                    value={form.fontStyle}
                    onChange={(e) => setForm((p) => ({ ...p, fontStyle: e.target.value }))}
                  />
                </div>
              </div>
              <p className="mt-4 text-xs text-gray-500">Used for visual consistency in generated creatives.</p>
            </div>
          </section>

          {/* Save Section Card */}
          <section className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 shadow-2xl ring-1 ring-black/10 transition-all duration-300 hover:shadow-3xl">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>
            <div className="relative py-6 sm:p-8">
              <div className="mb-0 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-white sm:text-2xl">Save Changes</h2>
                  <p className="text-sm text-indigo-100">
                    Backend brand profile saving isn't available yet—this saves locally on your device for now.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    className={buttonClassName({ variant: 'secondary' }) + ' bg-white/20 text-white backdrop-blur-sm hover:bg-white/30 border-white/30 shadow-lg transition-all'}
                    onClick={() => setForm(emptyForm)}
                    disabled={saving}
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    className={buttonClassName({ variant: 'secondary', className: 'bg-white text-indigo-600 hover:bg-indigo-50 border-indigo-200 shadow-xl hover:shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed' })}
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
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </div>

              {saveError ? (
                <div className="mt-4 animate-in slide-in-from-top-2 rounded-2xl bg-red-500/90 backdrop-blur-sm p-4 text-sm font-medium text-white shadow-lg">
                  {saveError}
                </div>
              ) : null}
              {saveSuccess ? (
                <div className="mt-4 animate-in slide-in-from-top-2 rounded-2xl bg-emerald-500/90 backdrop-blur-sm p-4 text-sm font-medium text-white shadow-lg">
                  {saveSuccess}
                </div>
              ) : null}
            </div>
          </section>
        </form>
      </div>
    </div>
  );
}