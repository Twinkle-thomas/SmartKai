import { createContext, useContext } from 'react';
import { LazyMotion, MotionConfig, domAnimation, m, useReducedMotion } from 'motion/react';

const MotionEnabled = createContext(false);
export const SOFT_EASE = [.22, 1, .36, 1];

export function HomepageMotion({ children }) {
  const reduced = useReducedMotion();
  const enabled = !reduced && typeof window.IntersectionObserver === 'function';
  return <LazyMotion features={domAnimation} strict><MotionConfig reducedMotion="user"><MotionEnabled.Provider value={enabled}>{children}</MotionEnabled.Provider></MotionConfig></LazyMotion>;
}

export function useHomepageMotion() { return useContext(MotionEnabled); }

export function Reveal({ children, className, delay = 0, as = 'div', ...props }) {
  const enabled = useHomepageMotion();
  const Element = as === 'section' ? m.section : as === 'li' ? m.li : m.div;
  return <Element {...props} className={`motion-reveal ${className ?? ''}`} initial={enabled ? 'hidden' : false}
    whileInView={enabled ? 'visible' : undefined} viewport={{ once: true, amount: .12 }}
    animate={enabled ? undefined : 'visible'}
    variants={{ hidden: { opacity: 0, y: 22 }, visible: { opacity: 1, y: 0, transition: { duration: .75, delay, ease: SOFT_EASE } } }}
  >{children}</Element>;
}
