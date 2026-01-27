// Animation presets using Motion One
// All animations use transform and opacity for performance

export const animations = {
  // Fade animations
  fadeIn: {
    opacity: [0, 1],
    duration: 200,
    easing: 'ease-out',
  },
  fadeOut: {
    opacity: [1, 0],
    duration: 200,
    easing: 'ease-in',
  },

  // Scale animations
  scaleIn: {
    scale: [0.95, 1],
    opacity: [0, 1],
    duration: 150,
    easing: 'ease-out',
  },
  scaleOut: {
    scale: [1, 0.95],
    opacity: [1, 0],
    duration: 150,
    easing: 'ease-in',
  },

  // Slide animations
  slideUp: {
    y: [20, 0],
    opacity: [0, 1],
    duration: 200,
    easing: 'ease-out',
  },
  slideDown: {
    y: [0, 20],
    opacity: [1, 0],
    duration: 200,
    easing: 'ease-in',
  },
  slideOut: {
    x: [0, -100],
    opacity: [1, 0],
    duration: 200,
    easing: 'ease-in',
  },

  // Checkbox animation
  checkboxCheck: {
    scale: [0.8, 1.1, 1],
    opacity: [0, 1],
    duration: 150,
    easing: 'ease-out',
  },

  // Search bar focus
  searchFocus: {
    scale: [1, 1.02],
    duration: 200,
    easing: 'ease-out',
  },

  // Stagger delay for list items
  stagger: (index: number) => index * 30, // 30ms delay per item
}
