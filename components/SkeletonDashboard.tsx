export function SkeletonDashboard() {
  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F5F5F5]">
      {/* Sidebar skeleton */}
      <div className="w-full lg:w-[280px] bg-white p-6 animate-pulse">
        <div className="flex flex-col items-center mb-6">
          <div className="w-20 h-20 rounded-full bg-gray-200 mb-3" />
          <div className="h-5 w-40 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-32 bg-gray-200 rounded" />
        </div>
        <div className="space-y-2 mb-6">
          <div className="h-3 w-36 bg-gray-200 rounded" />
          <div className="h-3 w-28 bg-gray-200 rounded" />
        </div>
        <div className="h-px bg-gray-200 mb-6" />
        <div className="bg-gray-100 rounded-xl p-4 mb-4">
          <div className="h-3 w-28 bg-gray-200 rounded mb-2" />
          <div className="h-8 w-20 bg-gray-200 rounded" />
        </div>
        <div className="h-10 bg-gray-200 rounded-lg" />
      </div>

      {/* Main content skeleton */}
      <div className="flex-1 p-6 lg:p-8 animate-pulse">
        {/* Top bar */}
        <div className="flex justify-between items-center mb-8">
          <div className="h-6 w-24 bg-gray-200 rounded" />
          <div className="w-10 h-10 rounded-full bg-gray-200" />
        </div>

        {/* Banner skeleton */}
        <div className="h-16 bg-gray-200 rounded-xl mb-6" />

        {/* Tabs skeleton */}
        <div className="flex gap-2 mb-6">
          <div className="h-9 w-24 bg-gray-200 rounded-lg" />
          <div className="h-9 w-24 bg-gray-200 rounded-lg" />
        </div>

        {/* Metrics skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="h-24 bg-gray-200 rounded-xl" />
          <div className="h-24 bg-gray-200 rounded-xl" />
          <div className="h-24 bg-gray-200 rounded-xl" />
        </div>

        {/* Progress bar skeleton */}
        <div className="bg-white rounded-xl p-6 mb-6">
          <div className="h-3 bg-gray-200 rounded-full mb-2" />
          <div className="flex justify-between">
            <div className="h-3 w-20 bg-gray-200 rounded" />
            <div className="h-3 w-20 bg-gray-200 rounded" />
            <div className="h-3 w-20 bg-gray-200 rounded" />
          </div>
        </div>

        {/* Chart skeleton */}
        <div className="bg-white rounded-xl p-6">
          <div className="h-5 w-36 bg-gray-200 rounded mb-4" />
          <div className="h-[300px] bg-gray-100 rounded" />
        </div>
      </div>
    </div>
  )
}
