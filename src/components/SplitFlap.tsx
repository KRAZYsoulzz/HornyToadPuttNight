import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { motionDurations, motionEasings } from '../theme/motion';

interface SplitFlapProps {
  value: string | number | null | undefined;
  className?: string;
  minDigits?: number;
  prefix?: string;
  suffix?: string;
  highlightOnChange?: boolean;
  variant?: 'default' | 'sm';
  /** Render as plain readable numerals (no flap tiles) */
  plain?: boolean;
}

interface SingleFlapDigitProps {
  char: string;
  highlight?: boolean;
  variant?: 'default' | 'sm';
}

const isNumeric = (val: unknown): boolean => {
  if (val == null) return false;
  if (typeof val === 'number') return !Number.isNaN(val);
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed === '') return false;
    return /^-?\d+(\.\d+)?$/.test(trimmed);
  }
  return false;
};

const SingleFlapDigit: React.FC<SingleFlapDigitProps> = ({ char, highlight = false, variant = 'default' }) => {
  const prefersReducedMotion = useReducedMotion();
  const isSm = variant === 'sm';

  return (
    <div
      className={`split-flap-digit ${isSm ? 'split-flap-digit-sm' : ''}`}
      style={{
        position: 'relative',
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--chalk-slate-dark)',
        border: '1px solid var(--chalk-border)',
        borderRadius: 'var(--radius-sm)',
        width: 'auto',
        minWidth: isSm ? '1.35ch' : '1.55ch',
        padding: '0 0.12ch',
        height: isSm ? '1.35em' : '1.5em',
        lineHeight: isSm ? '1.35em' : '1.5em',
        textAlign: 'center',
        fontFamily: 'var(--font-score)',
        fontVariantNumeric: 'tabular-nums',
        fontWeight: 700,
        color: highlight ? 'var(--neon-amber)' : 'var(--chalk-white)',
        overflow: 'hidden',
        userSelect: 'none',
        margin: 0,
        perspective: '400px',
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.8), 0 1px 2px rgba(0,0,0,0.5)',
      }}
    >
      {/* Center split line & notches */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: 0,
          right: 0,
          height: '1px',
          background: 'var(--ink)',
          zIndex: 5,
          boxShadow: '0 1px 0 rgba(255,255,255,0.05)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 'calc(50% - 1.5px)',
          left: 0,
          width: '2px',
          height: '3px',
          background: 'var(--ink)',
          zIndex: 6,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 'calc(50% - 1.5px)',
          right: 0,
          width: '2px',
          height: '3px',
          background: 'var(--ink)',
          zIndex: 6,
        }}
      />

      {/* Number display */}
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={char}
          initial={
            prefersReducedMotion
              ? { opacity: 1 }
              : { rotateX: -70, opacity: 0.6 }
          }
          animate={{ rotateX: 0, opacity: 1 }}
          exit={
            prefersReducedMotion
              ? { opacity: 0 }
              : { rotateX: 70, opacity: 0 }
          }
          transition={{
            duration: prefersReducedMotion ? 0.01 : motionDurations.base,
            ease: motionEasings.easeOut,
          }}
          style={{
            display: 'block',
            width: '100%',
            transformOrigin: '50% 50%',
            backfaceVisibility: 'hidden',
          }}
        >
          {char}
        </motion.span>
      </AnimatePresence>
    </div>
  );
};

export const SplitFlap: React.FC<SplitFlapProps> = ({
  value,
  className = '',
  prefix = '',
  suffix = '',
  highlightOnChange = false,
  variant = 'default',
  plain = false,
}) => {
  if (plain || !isNumeric(value)) {
    return (
      <span className={`split-flap-plain ${className}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
        {prefix}{value != null ? String(value) : ''}{suffix}
      </span>
    );
  }

  const strVal = value != null ? String(value).trim() : '';
  const chars = strVal.split('');

  return (
    <span
      className={`split-flap-container ${variant === 'sm' ? 'split-flap-sm' : ''} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: variant === 'sm' ? '1.5px' : '2px',
        fontVariantNumeric: 'tabular-nums',
        verticalAlign: 'middle',
      }}
    >
      {prefix && <span style={{ marginRight: '2px' }}>{prefix}</span>}
      {chars.map((ch, idx) => (
        <SingleFlapDigit key={idx} char={ch} highlight={highlightOnChange} variant={variant} />
      ))}
      {suffix && <span style={{ marginLeft: '2px' }}>{suffix}</span>}
    </span>
  );
};

export default SplitFlap;
