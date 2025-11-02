export default function HorizonTestPage() {
  return (
    <div className="min-h-screen bg-lightPrimary dark:bg-navy-900 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-navy-700 dark:text-white mb-2">
            Horizon UI Design System Test
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Testing Horizon UI colors, gradients, and components in B2B+
          </p>
        </div>

        {/* Color Palette Test */}
        <div className="bg-white dark:bg-navy-800 rounded-2xl p-6 shadow-lg">
          <h2 className="text-2xl font-bold text-navy-700 dark:text-white mb-4">
            Horizon Color Palette
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Purple */}
            <div className="space-y-2">
              <div className="h-20 bg-horizonPurple-500 rounded-lg"></div>
              <p className="text-sm font-medium">Horizon Purple</p>
            </div>
            
            {/* Blue */}
            <div className="space-y-2">
              <div className="h-20 bg-horizonBlue-500 rounded-lg"></div>
              <p className="text-sm font-medium">Horizon Blue</p>
            </div>
            
            {/* Green */}
            <div className="space-y-2">
              <div className="h-20 bg-horizonGreen-500 rounded-lg"></div>
              <p className="text-sm font-medium">Horizon Green</p>
            </div>
            
            {/* Orange */}
            <div className="space-y-2">
              <div className="h-20 bg-horizonOrange-500 rounded-lg"></div>
              <p className="text-sm font-medium">Horizon Orange</p>
            </div>
            
            {/* Teal */}
            <div className="space-y-2">
              <div className="h-20 bg-horizonTeal-500 rounded-lg"></div>
              <p className="text-sm font-medium">Horizon Teal</p>
            </div>
            
            {/* Red */}
            <div className="space-y-2">
              <div className="h-20 bg-horizonRed-500 rounded-lg"></div>
              <p className="text-sm font-medium">Horizon Red</p>
            </div>
            
            {/* Navy */}
            <div className="space-y-2">
              <div className="h-20 bg-navy-700 rounded-lg"></div>
              <p className="text-sm font-medium">Navy</p>
            </div>
            
            {/* Gray */}
            <div className="space-y-2">
              <div className="h-20 bg-gray-600 rounded-lg"></div>
              <p className="text-sm font-medium">Gray</p>
            </div>
          </div>
        </div>

        {/* Gradient Cards Test */}
        <div className="bg-white dark:bg-navy-800 rounded-2xl p-6 shadow-lg">
          <h2 className="text-2xl font-bold text-navy-700 dark:text-white mb-4">
            Gradient Cards
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Purple Gradient */}
            <div className="bg-gradient-to-br from-horizonPurple-400 to-horizonPurple-600 rounded-xl p-6 text-white">
              <p className="text-sm opacity-80 mb-1">Total Revenue</p>
              <p className="text-3xl font-bold">$45,231</p>
              <p className="text-sm mt-2 opacity-90">+23% from last month</p>
            </div>
            
            {/* Blue Gradient */}
            <div className="bg-gradient-to-br from-horizonBlue-400 to-horizonBlue-600 rounded-xl p-6 text-white">
              <p className="text-sm opacity-80 mb-1">New Customers</p>
              <p className="text-3xl font-bold">1,234</p>
              <p className="text-sm mt-2 opacity-90">+12% from last month</p>
            </div>
            
            {/* Green Gradient */}
            <div className="bg-gradient-to-br from-horizonGreen-400 to-horizonGreen-600 rounded-xl p-6 text-white">
              <p className="text-sm opacity-80 mb-1">Active Orders</p>
              <p className="text-3xl font-bold">567</p>
              <p className="text-sm mt-2 opacity-90">+8% from last month</p>
            </div>
          </div>
        </div>

        {/* Glassmorphism Test */}
        <div className="relative bg-gradient-to-br from-horizonPurple-500 to-horizonBlue-500 rounded-2xl p-8 overflow-hidden">
          <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
          <div className="relative z-10">
            <h2 className="text-2xl font-bold text-white mb-4">
              Glassmorphism Effect
            </h2>
            <p className="text-white/90 mb-4">
              This card demonstrates the beautiful glassmorphism effect from Horizon UI.
            </p>
            <button className="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white px-6 py-2 rounded-lg transition-all">
              Learn More
            </button>
          </div>
        </div>

        {/* Metric Cards Test */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Card 1 */}
          <div className="bg-white dark:bg-navy-800 rounded-xl p-6 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-horizonPurple-100 dark:bg-horizonPurple-900 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-horizonPurple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-green-500 text-sm font-medium">+23%</span>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Revenue</p>
            <p className="text-2xl font-bold text-navy-700 dark:text-white">$45,231</p>
          </div>

          {/* Card 2 */}
          <div className="bg-white dark:bg-navy-800 rounded-xl p-6 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-horizonBlue-100 dark:bg-horizonBlue-900 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-horizonBlue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <span className="text-green-500 text-sm font-medium">+12%</span>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Customers</p>
            <p className="text-2xl font-bold text-navy-700 dark:text-white">1,234</p>
          </div>

          {/* Card 3 */}
          <div className="bg-white dark:bg-navy-800 rounded-xl p-6 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-horizonGreen-100 dark:bg-horizonGreen-900 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-horizonGreen-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-green-500 text-sm font-medium">+8%</span>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Orders</p>
            <p className="text-2xl font-bold text-navy-700 dark:text-white">567</p>
          </div>

          {/* Card 4 */}
          <div className="bg-white dark:bg-navy-800 rounded-xl p-6 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-horizonOrange-100 dark:bg-horizonOrange-900 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-horizonOrange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <span className="text-red-500 text-sm font-medium">-3%</span>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Products</p>
            <p className="text-2xl font-bold text-navy-700 dark:text-white">1,500</p>
          </div>
        </div>

        {/* Success Message */}
        <div className="bg-gradient-to-r from-horizonGreen-500 to-horizonTeal-500 rounded-xl p-6 text-white">
          <h3 className="text-xl font-bold mb-2">✅ Phase 1 Complete!</h3>
          <p className="opacity-90">
            Horizon UI design system successfully integrated into B2B+. All colors, gradients, and utilities are now available!
          </p>
        </div>
      </div>
    </div>
  );
}
