/**
 * Haptic feedback utility
 * Uses Web Vibration API for haptic feedback on supported devices
 * Prepares for Capacitor integration later
 */

export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error'

interface HapticPattern {
  pattern: number | number[]
  duration?: number
}

const hapticPatterns: Record<HapticType, HapticPattern> = {
  light: { pattern: 10 },
  medium: { pattern: 20 },
  heavy: { pattern: 30 },
  success: { pattern: [10, 50, 10] },
  warning: { pattern: [20, 50, 20] },
  error: { pattern: [30, 50, 30, 50, 30] },
}

/**
 * Trigger haptic feedback
 * @param type - Type of haptic feedback
 * @returns Promise that resolves when haptic is complete
 */
export async function haptic(type: HapticType = 'medium'): Promise<void> {
  // Check if Vibration API is supported
  if (typeof window === 'undefined' || !('vibrate' in navigator)) {
    return Promise.resolve()
  }

  const pattern = hapticPatterns[type]

  try {
    if (Array.isArray(pattern.pattern)) {
      navigator.vibrate(pattern.pattern)
    } else {
      navigator.vibrate(pattern.pattern)
    }
  } catch (error) {
    // Silently fail - haptics are optional
    console.warn('Haptic feedback failed:', error)
  }
}

/**
 * Check if haptic feedback is supported
 */
export function isHapticSupported(): boolean {
  if (typeof window === 'undefined') return false
  return 'vibrate' in navigator
}

/**
 * Capacitor integration (for future use)
 * When Capacitor is added, this can be extended to use native haptics
 */
export async function hapticNative(type: HapticType): Promise<void> {
  // Future: Use Capacitor Haptics plugin
  // import { Haptics } from '@capacitor/haptics'
  // await Haptics.impact({ style: type })
  
  // For now, fallback to web API
  return haptic(type)
}
