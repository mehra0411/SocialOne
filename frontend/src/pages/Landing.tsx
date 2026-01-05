import { Link } from 'react-router-dom';
import { buttonClassName } from '../ui/button';

export function LandingPage() {
  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="text-center py-16 sm:py-24 lg:py-32 animate-fade-in">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-zinc-900 mb-6 leading-tight animate-slide-up">
            Manage Your Social Media
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">
              All in One Place
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-zinc-600 mb-8 max-w-2xl mx-auto">
            Create, schedule, and publish content across multiple platforms. Streamline your social media workflow with powerful tools designed for modern brands.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              to="/signup"
              className={buttonClassName({ variant: 'primary', size: 'md', className: 'w-full sm:w-auto min-w-[160px] transition-all duration-300 hover:scale-105 hover:shadow-lg' })}
            >
              Get Started Free
            </Link>
            <Link
              to="/login"
              className={buttonClassName({ variant: 'secondary', size: 'md', className: 'w-full sm:w-auto min-w-[160px] transition-all duration-300 hover:scale-105 hover:shadow-lg' })}
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-8 sm:py-20 bg-white rounded-2xl shadow-sm mb-8 opacity-0 animate-[fadeIn_0.8s_ease-out_0.6s_forwards]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-zinc-900 mb-12 animate-slide-up">
            Everything You Need to Succeed
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="text-center p-6 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 transition-all duration-300 hover:scale-105 hover:-translate-y-2 hover:shadow-lg cursor-pointer">
              <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-zinc-900 mb-2">Multi-Platform Publishing</h3>
              <p className="text-zinc-600">
                Publish to Instagram and other platforms from a single dashboard. Save time and maintain consistency.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="text-center p-6 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 transition-all duration-300 hover:scale-105 hover:-translate-y-2 hover:shadow-lg cursor-pointer">
              <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-zinc-900 mb-2">Smart Scheduling</h3>
              <p className="text-zinc-600">
                Schedule your posts in advance. Plan your content calendar and let SocialOne handle the rest.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="text-center p-6 rounded-xl bg-gradient-to-br from-pink-50 to-indigo-50 transition-all duration-300 hover:scale-105 hover:-translate-y-2 hover:shadow-lg cursor-pointer">
              <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-gradient-to-r from-pink-600 to-indigo-600 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-zinc-900 mb-2">Analytics & Insights</h3>
              <p className="text-zinc-600">
                Track your performance with detailed analytics. Understand what works and optimize your strategy.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="text-center p-6 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 transition-all duration-300 hover:scale-105 hover:-translate-y-2 hover:shadow-lg cursor-pointer">
              <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-zinc-900 mb-2">Content Creation</h3>
              <p className="text-zinc-600">
                Create stunning posts and reels with our built-in tools. Draft, edit, and perfect your content before publishing.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="text-center p-6 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 transition-all duration-300 hover:scale-105 hover:-translate-y-2 hover:shadow-lg cursor-pointer">
              <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-zinc-900 mb-2">Secure & Reliable</h3>
              <p className="text-zinc-600">
                Your data is safe with enterprise-grade security. Focus on growing your brand with confidence.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="text-center p-6 rounded-xl bg-gradient-to-br from-pink-50 to-indigo-50 transition-all duration-300 hover:scale-105 hover:-translate-y-2 hover:shadow-lg cursor-pointer">
              <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-gradient-to-r from-pink-600 to-indigo-600 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-zinc-900 mb-2">Multi-Brand Management</h3>
              <p className="text-zinc-600">
                Manage multiple brands from one account. Switch between brands seamlessly and keep everything organized.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 sm:py-20 opacity-0 animate-[fadeIn_0.8s_ease-out_0.8s_forwards]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-zinc-900 mb-12 animate-slide-up">
            Why Choose SocialOne?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Benefit Card 1 */}
            <div className="p-6 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-105 hover:-translate-y-2 cursor-pointer">
              <div className="w-12 h-12 mb-4 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-zinc-900 mb-2">Save Time</h3>
              <p className="text-zinc-600">
                Stop switching between multiple apps and platforms. Manage everything from one centralized dashboard and reclaim hours every week.
              </p>
            </div>

            {/* Benefit Card 2 */}
            <div className="p-6 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100 shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-105 hover:-translate-y-2 cursor-pointer">
              <div className="w-12 h-12 mb-4 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-zinc-900 mb-2">Stay Consistent</h3>
              <p className="text-zinc-600">
                Maintain a consistent brand voice and posting schedule across all your platforms. Build trust and engagement with your audience.
              </p>
            </div>

            {/* Benefit Card 3 */}
            <div className="p-6 rounded-xl bg-gradient-to-br from-pink-50 to-indigo-50 border border-pink-100 shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-105 hover:-translate-y-2 cursor-pointer">
              <div className="w-12 h-12 mb-4 rounded-lg bg-gradient-to-r from-pink-600 to-indigo-600 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-zinc-900 mb-2">Grow Faster</h3>
              <p className="text-zinc-600">
                Make data-driven decisions with comprehensive analytics. Understand your audience better and optimize your content strategy for maximum growth.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section - Plans for Every Ambition */}
      <section className="py-16 sm:py-20 opacity-0 animate-[fadeIn_0.8s_ease-out_1s_forwards]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-zinc-900 mb-4 animate-slide-up">
            Plans for Every Ambition
          </h2>
          <p className="text-lg text-center text-zinc-600 mb-12">
            Start with a 14-day free trial. No credit card required. Cancel anytime.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Starter Plan */}
            <div className="p-8 rounded-xl border border-zinc-200 bg-white shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-105">
              <h3 className="text-2xl font-bold text-zinc-900 mb-2">Starter</h3>
              <div className="mb-4">
                <span className="text-4xl font-bold text-zinc-900">$49</span>
                <span className="text-zinc-600">/month</span>
              </div>
              <p className="text-zinc-600 mb-6">Perfect for solo creators and small businesses.</p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-zinc-700">1 Brand Profile</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-zinc-700">3 Social Accounts</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-zinc-700">60 AI-Generated Posts/Month</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-zinc-700">3 Competitors Tracked</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-zinc-700">10 AI Video Reels/Captions</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-zinc-700">Smart Auto-Scheduling</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-zinc-700">Advanced Analytics</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-zinc-700">Priority Support</span>
                </li>
              </ul>
              <Link
                to="/signup"
                className={buttonClassName({ variant: 'primary', size: 'md', className: 'w-full transition-all duration-300 hover:scale-105' })}
              >
                Start Free Trial
              </Link>
            </div>

            {/* Growth Plan - Most Popular */}
            <div className="p-8 rounded-xl border-2 border-indigo-500 bg-white shadow-lg relative transition-all duration-300 hover:shadow-xl hover:scale-105">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-indigo-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                  Most Popular
                </span>
              </div>
              <h3 className="text-2xl font-bold text-zinc-900 mb-2">Growth</h3>
              <div className="mb-4">
                <span className="text-4xl font-bold text-zinc-900">$99</span>
                <span className="text-zinc-600">/month</span>
              </div>
              <p className="text-zinc-600 mb-6">For growing brands and marketing professionals.</p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-zinc-700">3 Brand Profiles</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-zinc-700">9 Social Accounts</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-zinc-700">200 AI-Generated Posts/Month</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-zinc-700">5 Competitors Tracked</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-zinc-700">40 AI Video Reels/Captions</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-zinc-700">Smart Auto-Scheduling</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-zinc-700">Advanced Analytics</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-zinc-700">Priority Support</span>
                </li>
              </ul>
              <Link
                to="/signup"
                className={buttonClassName({ variant: 'primary', size: 'md', className: 'w-full transition-all duration-300 hover:scale-105' })}
              >
                Start Free Trial
              </Link>
            </div>

            {/* Agency Plan */}
            <div className="p-8 rounded-xl border border-zinc-200 bg-white shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-105">
              <h3 className="text-2xl font-bold text-zinc-900 mb-2">Agency</h3>
              <div className="mb-4">
                <span className="text-4xl font-bold text-zinc-900">$249</span>
                <span className="text-zinc-600">/month</span>
              </div>
              <p className="text-zinc-600 mb-6">For agencies and teams managing multiple clients.</p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-zinc-700">10 Brand Profiles</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-zinc-700">30 Social Accounts</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-zinc-700">700 AI-Generated Posts/Month</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-zinc-700">10 Competitors Tracked</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-zinc-700">Smart Auto-Scheduling</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-zinc-700">Advanced Analytics</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-zinc-700">White-Label Reports</span>
                </li>
              </ul>
              <Link
                to="/signup"
                className={buttonClassName({ variant: 'secondary', size: 'md', className: 'w-full transition-all duration-300 hover:scale-105' })}
              >
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section - Trusted by Data-Driven Teams */}
      <section className="py-16 sm:py-20 opacity-0 animate-[fadeIn_0.8s_ease-out_1.2s_forwards]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-zinc-900 mb-4 animate-slide-up">
            Trusted by Data-Driven Teams
          </h2>
          <p className="text-lg text-center text-zinc-600 mb-12">
            See how marketing teams are transforming their social strategy with SocialOne.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Testimonial 1 */}
            <div className="p-8 rounded-xl border border-zinc-200 bg-white shadow-sm transition-all duration-300 hover:shadow-lg">
              <p className="text-zinc-700 mb-6 text-lg leading-relaxed">
                "SocialOne didn't just give us reports; it gave us a winning strategy. We identified a content gap in our competitor's video strategy and our AI filled it with a month's worth of Reels. Engagement is up 300%."
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold mr-4">
                  JP
                </div>
                <div>
                  <div className="font-semibold text-zinc-900">Jordan P.</div>
                  <div className="text-zinc-600 text-sm">Marketing Director, TechScale Inc.</div>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="p-8 rounded-xl border border-zinc-200 bg-white shadow-sm transition-all duration-300 hover:shadow-lg">
              <p className="text-zinc-700 mb-6 text-lg leading-relaxed">
                "As a small business, we can finally compete with the big brands. The AI understands our niche and creates content that feels authentic, all based on real data about what works in our industry."
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center text-white font-semibold mr-4">
                  MR
                </div>
                <div>
                  <div className="font-semibold text-zinc-900">Maya R.</div>
                  <div className="text-zinc-600 text-sm">Founder, Bloom Artisan Co.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-16 sm:py-20 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-lg mb-8 transition-all duration-300 hover:shadow-xl">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 animate-slide-up">
            Ready to Automate Your Social Intelligence?
          </h2>
          <p className="text-lg sm:text-xl text-white/90 mb-8">
            Join thousands of brands that have replaced guesswork and manual grind with a single, powerful engine.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/signup"
              className={buttonClassName({ variant: 'secondary', size: 'md', className: 'min-w-[200px] transition-all duration-300 hover:scale-110 hover:shadow-xl' })}
            >
              Start Your Free 14-Day Trial
            </Link>
            <Link
              to="/signup"
              className={buttonClassName({ variant: 'secondary', size: 'md', className: 'min-w-[200px] border-2 border-white bg-transparent text-white hover:bg-white/10 transition-all duration-300 hover:scale-110 hover:shadow-xl' })}
            >
              Book a Demo
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
