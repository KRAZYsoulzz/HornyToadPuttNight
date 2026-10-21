import type { TargetAndTransition, Transition, Variants } from 'framer-motion';

export const motionDurations = {
  fast: 0.16,
  base: 0.18,
  slow: 0.22,
} as const;

export const motionEasings = {
  easeOut: [0, 0, 0.2, 1] as const,
  easeInOut: [0.2, 0, 0.2, 1] as const,
  anticipate: [0.36, 0, 0.66, -0.56] as const,
};

export const standardTransition: Transition = {
  duration: motionDurations.base,
  ease: motionEasings.easeOut,
};

export const fastTransition: Transition = {
  duration: motionDurations.fast,
  ease: motionEasings.easeOut,
};

export const slowTransition: Transition = {
  duration: motionDurations.slow,
  ease: motionEasings.easeInOut,
};

export const reducedMotionTransition: Transition = {
  duration: 0.01,
  ease: 'linear',
};

// Neon flicker animation for earned moments (runs once, then holds steady)
export const neonFlickerAnimation: TargetAndTransition = {
  opacity: [1, 0.35, 1, 0.45, 0.9, 0.7, 1],
  textShadow: [
    '0 0 7px rgba(255, 178, 56, 0.75), 0 0 16px rgba(255, 178, 56, 0.35)',
    '0 0 1px rgba(255, 178, 56, 0.1)',
    '0 0 10px rgba(255, 178, 56, 0.9), 0 0 20px rgba(255, 178, 56, 0.5)',
    '0 0 2px rgba(255, 178, 56, 0.15)',
    '0 0 8px rgba(255, 178, 56, 0.8), 0 0 18px rgba(255, 178, 56, 0.4)',
    '0 0 5px rgba(255, 178, 56, 0.5)',
    '0 0 7px rgba(255, 178, 56, 0.75), 0 0 16px rgba(255, 178, 56, 0.35)',
  ],
  transition: {
    duration: 0.45,
    ease: 'easeInOut',
  },
};

// Chain-shake wobble variants for basket
export const basketWobbleVariants: Variants = {
  idle: {
    rotate: 0,
    x: 0,
  },
  wobble: {
    rotate: [0, -3.5, 3, -2, 1.5, -0.5, 0],
    x: [0, -2, 2, -1, 1, 0],
    transition: {
      duration: 0.4,
      ease: 'easeInOut',
    },
  },
};
