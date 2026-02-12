'use client'

interface FixedActionBarProps {
  left?: React.ReactNode
  right: React.ReactNode
}

export default function FixedActionBar({ left, right }: FixedActionBarProps) {
  return (
    <div className="fixed bottom-[72px] left-0 right-0 z-[51] border-t border-gray-200 bg-white shadow-lg">
      <div className="mx-auto flex max-w-md items-center justify-between gap-3 px-4 py-3">
        <div className="flex-1">{left || <div></div>}</div>
        <div className="flex items-center gap-3">{right}</div>
      </div>
    </div>
  )
}
