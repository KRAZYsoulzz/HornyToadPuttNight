import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { basketWobbleVariants } from '../theme/motion';

interface BasketProps {
  score?: number;
  size?: number;
  className?: string;
  showTallies?: boolean;
}

export const Basket: React.FC<BasketProps> = ({
  score = 0,
  size = 140,
  className = '',
  showTallies = true,
}) => {
  const prefersReducedMotion = useReducedMotion();

  // Generate tally groups of 5
  // score = 13 => 2 groups of 5, plus 1 group of 3
  const fullGroups = Math.floor(score / 5);
  const remainder = score % 5;
  const groups: number[] = [];
  for (let i = 0; i < fullGroups; i++) {
    groups.push(5);
  }
  if (remainder > 0) {
    groups.push(remainder);
  }

  return (
    <div
      className={`basket-container ${className}`}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        userSelect: 'none',
      }}
    >
      <motion.div
        key={score}
        variants={basketWobbleVariants}
        initial="idle"
        animate={score > 0 && !prefersReducedMotion ? 'wobble' : 'idle'}
        style={{
          transformOrigin: '50% 15%',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <svg
          width={size}
          height={size * 1.05}
          viewBox="0 0 160 170"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Central Pole */}
          <line
            x1="80"
            y1="25"
            x2="80"
            y2="155"
            stroke="var(--neon-amber)"
            strokeWidth="4"
            strokeLinecap="round"
          />

          {/* Top Deflector Band */}
          <rect
            x="40"
            y="24"
            width="80"
            height="14"
            rx="2"
            fill="var(--chalk-slate-dark)"
            stroke="var(--neon-amber)"
            strokeWidth="2.5"
          />
          <line
            x1="40"
            y1="31"
            x2="120"
            y2="31"
            stroke="var(--neon-amber)"
            strokeWidth="1.5"
            strokeOpacity="0.6"
          />

          {/* Hanging Chains */}
          <g
            stroke="var(--neon-amber)"
            strokeWidth="1.8"
            strokeDasharray="4 2.5"
            fill="none"
          >
            {/* Outer chains */}
            <path d="M 48 38 Q 54 68 72 90" />
            <path d="M 112 38 Q 106 68 88 90" />
            {/* Mid chains */}
            <path d="M 58 38 Q 66 70 76 92" />
            <path d="M 102 38 Q 94 70 84 92" />
            {/* Inner chains */}
            <path d="M 70 38 Q 74 72 78 94" />
            <path d="M 90 38 Q 86 72 82 94" />
            {/* Center chain */}
            <line x1="80" y1="38" x2="80" y2="94" strokeDasharray="3 2" />
          </g>

          {/* Basket Tray */}
          <path
            d="M 36 94 L 44 126 C 44 130 116 130 116 126 L 124 94 Z"
            fill="var(--chalk-slate-dark)"
            stroke="var(--neon-amber)"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* Basket Tray Vertical Grate Struts */}
          <g stroke="var(--neon-amber)" strokeWidth="1.5">
            <line x1="52" y1="94" x2="56" y2="127" />
            <line x1="68" y1="94" x2="70" y2="128" />
            <line x1="92" y1="94" x2="90" y2="128" />
            <line x1="108" y1="94" x2="104" y2="127" />
          </g>

          {/* Base Stand */}
          <path
            d="M 54 162 L 80 155 L 106 162"
            stroke="var(--neon-amber)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <line
            x1="60"
            y1="162"
            x2="100"
            y2="162"
            stroke="var(--neon-amber)"
            strokeWidth="2.5"
          />
        </svg>
      </motion.div>

      {/* Chalk Tally Marks */}
      {showTallies && score > 0 && (
        <div
          className="chalk-tallies"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '4px',
            padding: '4px 8px',
            background: 'var(--chalk-slate)',
            border: '1px solid var(--chalk-border)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          {groups.map((count, gIdx) => (
            <svg
              key={gIdx}
              width="32"
              height="20"
              viewBox="0 0 32 20"
              style={{ overflow: 'visible' }}
            >
              {/* Stroke 1 */}
              {count >= 1 && (
                <line
                  x1="5"
                  y1="2"
                  x2="4"
                  y2="18"
                  stroke="var(--chalk-white)"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  opacity="0.9"
                />
              )}
              {/* Stroke 2 */}
              {count >= 2 && (
                <line
                  x1="11"
                  y1="2"
                  x2="10"
                  y2="18"
                  stroke="var(--chalk-white)"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  opacity="0.9"
                />
              )}
              {/* Stroke 3 */}
              {count >= 3 && (
                <line
                  x1="17"
                  y1="2"
                  x2="16"
                  y2="18"
                  stroke="var(--chalk-white)"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  opacity="0.9"
                />
              )}
              {/* Stroke 4 */}
              {count >= 4 && (
                <line
                  x1="23"
                  y1="2"
                  x2="22"
                  y2="18"
                  stroke="var(--chalk-white)"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  opacity="0.9"
                />
              )}
              {/* Stroke 5 (Diagonal slash through 1-4) */}
              {count >= 5 && (
                <line
                  x1="2"
                  y1="16"
                  x2="26"
                  y2="4"
                  stroke="var(--neon-amber)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              )}
            </svg>
          ))}
        </div>
      )}
    </div>
  );
};

export default Basket;
