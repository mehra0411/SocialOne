export function AnalyticsPage() {
  return (
    <div className="space-y-6 font-sans from-gray-50 to-white min-h-screen">
      {/* Hero Header Section */}
      <div className="relative overflow-hidden px-0 py-2 sm:px-6 lg:px-0 mb-3">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>
        <div className="relative mx-auto max-w-7xl">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="space-y-2">
              <h1 className="text-3xl md:text-3xl font-bold text-primary text-[#4F46E5]">Analytics</h1>
              <p className="text-md text-primary font-medium">
                Performance insights and trends across your content
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Coming Soon Card */}
      <section className="group relative overflow-hidden rounded-3xl bg-white/90 backdrop-blur-xl shadow-xl ring-1 ring-black/5 transition-all duration-300 hover:shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
        <div className="relative p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">Coming Soon</h2>
              <p className="text-sm text-gray-500">Analytics dashboard is under development</p>
            </div>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6 border-2 border-indigo-200">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md flex-shrink-0">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1 space-y-2">
                <div className="text-base font-semibold text-indigo-900">What to Expect</div>
                <div className="text-sm text-indigo-800 space-y-2">
                  <p>This section will provide comprehensive analytics including:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Performance metrics across all your content</li>
                    <li>Engagement trends and insights</li>
                    <li>Audience growth analytics</li>
                    <li>Content performance comparisons</li>
                    <li>Best posting times and recommendations</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Placeholder Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="group relative overflow-hidden rounded-3xl bg-white/90 backdrop-blur-xl shadow-xl ring-1 ring-black/5 transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-indigo-500/5 to-purple-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">—</div>
            <div className="text-sm font-medium text-gray-500 mt-1">Total Views</div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-3xl bg-white/90 backdrop-blur-xl shadow-xl ring-1 ring-black/5 transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-pink-500/5 to-rose-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-lg">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">—</div>
            <div className="text-sm font-medium text-gray-500 mt-1">Total Likes</div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-3xl bg-white/90 backdrop-blur-xl shadow-xl ring-1 ring-black/5 transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-cyan-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">—</div>
            <div className="text-sm font-medium text-gray-500 mt-1">Total Comments</div>
          </div>
        </div>
      </div>
    </div>
  );
}