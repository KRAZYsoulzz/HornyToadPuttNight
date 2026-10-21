import React, { useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import SplitFlap from './SplitFlap';
import { neonFlickerAnimation } from '../theme/motion';

interface WinnerRevealProps {
  winner: string;
  payout: number;
  onClose: () => void;
}

export const WinnerReveal: React.FC<WinnerRevealProps> = ({
  winner,
  payout,
  onClose,
}) => {
  const prefersReducedMotion = useReducedMotion();

  // Auto-finish after ~1.5s if desired, or allow tap anywhere to close
  useEffect(() => {
    // Esc key handler
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <motion.div
      className="winner-reveal-overlay"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: prefersReducedMotion ? 0.01 : 0.2 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        backgroundColor: 'rgba(10, 8, 8, 0.96)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        cursor: 'pointer',
      }}
    >
      <motion.div
        className="winner-reveal-content"
        onClick={(e) => {
          // Allow tapping anywhere inside to skip / close as well
          e.stopPropagation();
          onClose();
        }}
        initial={prefersReducedMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92 }}
        transition={{ duration: prefersReducedMotion ? 0.01 : 0.22, ease: [0, 0, 0.2, 1] }}
        style={{
          width: '100%',
          maxWidth: '420px',
          background: 'var(--chalk-slate)',
          backgroundImage: 'var(--chalkboard-noise)',
          border: '2px solid var(--neon-amber)',
          borderRadius: 'var(--radius-lg)',
          padding: '2.25rem 1.5rem',
          textAlign: 'center',
          boxShadow: '0 0 35px rgba(255, 178, 56, 0.35), 0 20px 50px rgba(0, 0, 0, 0.9)',
          position: 'relative',
        }}
      >
        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
          <Trophy
            size={56}
            color="var(--neon-amber)"
            style={{
              filter: 'drop-shadow(0 0 14px rgba(255, 178, 56, 0.6))',
            }}
          />
        </div>

        <div
          style={{
            fontFamily: 'var(--font-headline)',
            fontSize: '1.25rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--chalk-white)',
            marginBottom: '0.5rem',
          }}
        >
          Tournament Champion
        </div>

        {/* Winner Name with Neon Flicker */}
        <motion.div
          animate={prefersReducedMotion ? { opacity: 1 } : neonFlickerAnimation}
          style={{
            fontFamily: 'var(--font-headline)',
            fontSize: '2.25rem',
            lineHeight: 1.1,
            letterSpacing: '0.04em',
            color: 'var(--neon-amber)',
            textShadow: 'var(--neon-amber-glow)',
            marginBottom: '1.5rem',
            wordBreak: 'break-word',
          }}
        >
          {winner}
        </motion.div>

        {/* Pot / Payout flip up */}
        <div
          style={{
            background: 'var(--chalk-slate-dark)',
            border: '1px solid var(--chalk-border)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            marginBottom: '1.75rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.25rem',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--chalk-dim)',
            }}
          >
            Total Pot Payout
          </span>

          <motion.div
            initial={prefersReducedMotion ? { opacity: 1, rotateX: 0 } : { opacity: 0, rotateX: -90 }}
            animate={{ opacity: 1, rotateX: 0 }}
            transition={{
              delay: prefersReducedMotion ? 0 : 0.45,
              duration: prefersReducedMotion ? 0.01 : 0.22,
              ease: [0, 0, 0.2, 1],
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--felt-teal-light)',
              fontFamily: 'var(--font-score)',
              fontSize: '2rem',
              fontWeight: 800,
            }}
          >
            <SplitFlap value={payout} prefix="$" minDigits={1} highlightOnChange />
          </motion.div>
        </div>

        <button
          className="btn btn-primary"
          style={{
            width: '100%',
            minHeight: '48px',
            fontSize: '1rem',
            letterSpacing: '0.06em',
          }}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          TAP TO CONTINUE
        </button>
      </motion.div>
    </motion.div>
  );
};

export default WinnerReveal;
