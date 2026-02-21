'use client'

import { Clock } from 'lucide-react'

interface SnoozeIconProps {
  className?: string
  size?: number
}

/** Klokje – snooze icon */
export default function SnoozeIcon({ className, size = 16 }: SnoozeIconProps) {
  return <Clock size={size} strokeWidth={2} className={className} />
}
