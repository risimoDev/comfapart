/**
 * Animation variants for Framer Motion
 * Premium, smooth animations with proper easing
 */

import { Variants } from 'framer-motion'

// ============================================
// EASING CURVES (Premium feel)
// ============================================

export const easings = {
  default: [0.4, 0, 0.2, 1],
  smooth: [0.25, 0.1, 0.25, 1],
  bounce: [0.34, 1.56, 0.64, 1],
  spring: [0.175, 0.885, 0.32, 1.275],
  decelerate: [0, 0, 0.2, 1],
  accelerate: [0.4, 0, 1, 1],
} as const

// ============================================
// PAGE TRANSITIONS
// ============================================

export const pageTransition: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: easings.decelerate,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.2,
      ease: easings.accelerate,
    },
  },
}

export const pageTransitionFade: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.3, ease: easings.default },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2, ease: easings.default },
  },
}

// ============================================
// STAGGERED LISTS
// ============================================

export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
}

export const staggerContainerFast: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.05,
    },
  },
}

export const staggerItem: Variants = {
  initial: {
    opacity: 0,
    y: 16,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: easings.decelerate,
    },
  },
}

export const staggerItemScale: Variants = {
  initial: {
    opacity: 0,
    scale: 0.95,
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: easings.spring,
    },
  },
}

// ============================================
// FADE IN WITH SCALE
// ============================================

export const fadeInScale: Variants = {
  hidden: { 
    opacity: 0, 
    scale: 0.95 
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: {
      duration: 0.3,
      ease: easings.decelerate
    }
  }
}

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.3, ease: easings.default }
  }
}

export const slideUp: Variants = {
  hidden: { 
    opacity: 0, 
    y: 20 
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.4,
      ease: easings.decelerate
    }
  }
}

export const slideDown: Variants = {
  hidden: { 
    opacity: 0, 
    y: -20 
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.4,
      ease: easings.decelerate
    }
  }
}

// ============================================
// CARD ANIMATIONS
// ============================================

export const cardHover = {
  initial: {
    y: 0,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06)',
  },
  hover: {
    y: -4,
    boxShadow: '0 8px 20px rgba(0,0,0,0.08), 0 20px 40px rgba(0,0,0,0.12)',
    transition: {
      duration: 0.3,
      ease: easings.decelerate,
    },
  },
  tap: {
    scale: 0.98,
    transition: { duration: 0.1 },
  },
}

export const cardImageHover = {
  initial: { scale: 1 },
  hover: {
    scale: 1.05,
    transition: {
      duration: 0.5,
      ease: easings.decelerate,
    },
  },
}

// ============================================
// MODAL / DIALOG
// ============================================

export const modalOverlay: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.2, ease: easings.default },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15, ease: easings.default },
  },
}

export const modalContent: Variants = {
  initial: {
    opacity: 0,
    scale: 0.95,
    y: 20,
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: easings.spring,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: {
      duration: 0.2,
      ease: easings.accelerate,
    },
  },
}

export const modalContentFromBottom: Variants = {
  initial: {
    opacity: 0,
    y: '100%',
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      damping: 30,
      stiffness: 300,
    },
  },
  exit: {
    opacity: 0,
    y: '100%',
    transition: {
      duration: 0.2,
      ease: easings.accelerate,
    },
  },
}

// ============================================
// DRAWER / SHEET
// ============================================

export const drawerLeft: Variants = {
  initial: { x: '-100%' },
  animate: {
    x: 0,
    transition: {
      type: 'spring',
      damping: 30,
      stiffness: 300,
    },
  },
  exit: {
    x: '-100%',
    transition: { duration: 0.2, ease: easings.accelerate },
  },
}

export const drawerRight: Variants = {
  initial: { x: '100%' },
  animate: {
    x: 0,
    transition: {
      type: 'spring',
      damping: 30,
      stiffness: 300,
    },
  },
  exit: {
    x: '100%',
    transition: { duration: 0.2, ease: easings.accelerate },
  },
}

export const drawerBottom: Variants = {
  initial: { y: '100%' },
  animate: {
    y: 0,
    transition: {
      type: 'spring',
      damping: 30,
      stiffness: 300,
    },
  },
  exit: {
    y: '100%',
    transition: { duration: 0.2, ease: easings.accelerate },
  },
}

// ============================================
// DROPDOWN / POPOVER
// ============================================

export const dropdownMenu: Variants = {
  initial: {
    opacity: 0,
    scale: 0.95,
    y: -8,
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.15,
      ease: easings.decelerate,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -4,
    transition: {
      duration: 0.1,
      ease: easings.accelerate,
    },
  },
}

export const popover: Variants = {
  initial: {
    opacity: 0,
    scale: 0.9,
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.2,
      ease: easings.spring,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: {
      duration: 0.15,
      ease: easings.default,
    },
  },
}

// ============================================
// TOAST / NOTIFICATION
// ============================================

export const toastSlideIn: Variants = {
  initial: {
    opacity: 0,
    x: 100,
    scale: 0.9,
  },
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      type: 'spring',
      damping: 25,
      stiffness: 300,
    },
  },
  exit: {
    opacity: 0,
    x: 50,
    scale: 0.9,
    transition: {
      duration: 0.2,
      ease: easings.accelerate,
    },
  },
}

export const toastSlideUp: Variants = {
  initial: {
    opacity: 0,
    y: 50,
    scale: 0.9,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      damping: 25,
      stiffness: 300,
    },
  },
  exit: {
    opacity: 0,
    y: 20,
    scale: 0.9,
    transition: {
      duration: 0.2,
      ease: easings.accelerate,
    },
  },
}

// ============================================
// BUTTON ANIMATIONS
// ============================================

export const buttonTap = {
  scale: 0.97,
  transition: { duration: 0.1 },
}

export const buttonHover = {
  scale: 1.02,
  transition: { duration: 0.2, ease: easings.decelerate },
}

// ============================================
// SKELETON LOADING
// ============================================

export const skeletonPulse: Variants = {
  initial: { opacity: 0.5 },
  animate: {
    opacity: [0.5, 1, 0.5],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
}

// ============================================
// ACCORDION / COLLAPSE
// ============================================

export const accordionContent: Variants = {
  initial: {
    height: 0,
    opacity: 0,
  },
  animate: {
    height: 'auto',
    opacity: 1,
    transition: {
      height: { duration: 0.3, ease: easings.decelerate },
      opacity: { duration: 0.2, delay: 0.1 },
    },
  },
  exit: {
    height: 0,
    opacity: 0,
    transition: {
      height: { duration: 0.2, ease: easings.accelerate },
      opacity: { duration: 0.1 },
    },
  },
}

// ============================================
// TAB INDICATOR
// ============================================

export const tabIndicator = {
  layoutId: 'tab-indicator',
  transition: {
    type: 'spring',
    stiffness: 500,
    damping: 35,
  },
}

// ============================================
// MICRO-INTERACTIONS
// ============================================

export const pulse = {
  scale: [1, 1.05, 1],
  transition: {
    duration: 0.3,
    ease: easings.default,
  },
}

export const shake = {
  x: [0, -10, 10, -10, 10, 0],
  transition: {
    duration: 0.4,
    ease: easings.default,
  },
}

export const wiggle = {
  rotate: [0, -3, 3, -3, 3, 0],
  transition: {
    duration: 0.4,
    ease: easings.default,
  },
}

// ============================================
// SPRING CONFIGURATIONS
// ============================================

export const springConfigs = {
  // Gentle, smooth
  gentle: {
    type: 'spring' as const,
    stiffness: 120,
    damping: 14,
  },
  // Default, balanced
  default: {
    type: 'spring' as const,
    stiffness: 200,
    damping: 20,
  },
  // Snappy, responsive
  snappy: {
    type: 'spring' as const,
    stiffness: 400,
    damping: 30,
  },
  // Bouncy
  bouncy: {
    type: 'spring' as const,
    stiffness: 300,
    damping: 10,
  },
  // Stiff, minimal overshoot
  stiff: {
    type: 'spring' as const,
    stiffness: 500,
    damping: 35,
  },
}
