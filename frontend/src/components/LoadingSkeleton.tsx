'use client';

export default function LoadingSkeleton({ type = 'card', count = 3 }: { type?: 'card' | 'row' | 'hero'; count?: number }) {
  if (type === 'hero') {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-64 bg-gray-800/50 rounded-2xl" />
        <div className="h-8 bg-gray-800/50 rounded w-1/3 mx-auto" />
        <div className="grid grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-48 bg-gray-800/50 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (type === 'row') {
    return (
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="animate-pulse flex items-center gap-4 p-4 bg-gray-800/40 rounded-lg">
            <div className="w-10 h-10 bg-gray-700/50 rounded" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-700/50 rounded w-2/3" />
              <div className="h-3 bg-gray-700/50 rounded w-1/3" />
            </div>
            <div className="w-16 h-8 bg-gray-700/50 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse bg-gray-800/40 rounded-xl p-6 space-y-4">
          <div className="h-6 bg-gray-700/50 rounded w-3/4" />
          <div className="h-4 bg-gray-700/50 rounded w-1/2" />
          <div className="h-20 bg-gray-700/50 rounded" />
          <div className="flex gap-2">
            <div className="h-8 bg-gray-700/50 rounded flex-1" />
            <div className="h-8 bg-gray-700/50 rounded flex-1" />
          </div>
        </div>
      ))}
    </div>
  );
}
