'use client'

import Skeleton from './Skeleton'

export default function SuggestionSkeleton() {
  return (
    <div className="fixed bottom-32 left-0 right-0 z-30 px-4">
      <div className="mx-auto max-w-md">
        <div className="rounded-[16px] bg-white p-3 shadow-lg">
          <div className="flex flex-wrap gap-2">
            {/* 4 suggestion pills */}
            {[1, 2, 3, 4].map((i) => (
              <Skeleton
                key={i}
                variant="rectangular"
                width={`${80 + (i % 2) * 40}px`}
                height="32px"
                className="rounded-full"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
