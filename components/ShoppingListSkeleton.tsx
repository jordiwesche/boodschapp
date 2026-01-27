'use client'

import Skeleton from './Skeleton'

export default function ShoppingListSkeleton() {
  return (
    <div className="pb-32">
      {/* Category skeleton */}
      <div className="mb-6">
        {/* Category header */}
        <Skeleton variant="text" width="120px" height="20px" className="mb-2" />
        
        {/* Shopping list items skeleton - 5 items */}
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4"
            >
              {/* Checkbox skeleton */}
              <Skeleton variant="circular" width="24px" height="24px" />
              
              {/* Content skeleton */}
              <div className="flex-1 space-y-2">
                {/* Product name */}
                <Skeleton variant="text" width={`${60 + (i % 3) * 20}%`} height="18px" />
                {/* Description (optional, only for some items) */}
                {i % 2 === 0 && (
                  <Skeleton variant="text" width="40%" height="14px" />
                )}
              </div>
              
              {/* Delete button skeleton */}
              <Skeleton variant="circular" width="32px" height="32px" />
            </div>
          ))}
        </div>
      </div>
      
      {/* Second category skeleton (fewer items) */}
      <div className="mb-6">
        <Skeleton variant="text" width="100px" height="20px" className="mb-2" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4"
            >
              <Skeleton variant="circular" width="24px" height="24px" />
              <div className="flex-1 space-y-2">
                <Skeleton variant="text" width={`${50 + (i % 2) * 25}%`} height="18px" />
              </div>
              <Skeleton variant="circular" width="32px" height="32px" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
