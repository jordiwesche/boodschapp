'use client'

import { Plus } from 'lucide-react'

interface FloatingAddButtonProps {
  onClick: () => void
}

export default function FloatingAddButton({ onClick }: FloatingAddButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-[100px] right-2 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-all hover:bg-blue-700 hover:scale-105 active:scale-95"
      aria-label="Product toevoegen"
    >
      <Plus className="h-6 w-6" />
    </button>
  )
}
