import React from 'react'

interface LogoProps {
  size?: number
  showText?: boolean
  className?: string
  subtitle?: string
}

export const HornyToadEmblem: React.FC<{ size?: number; className?: string }> = ({ 
  size = 48, 
  className = '' 
}) => {
  return (
    <img
      src="/icon-192.png"
      srcSet="/icon-192.png 1x, /icon-512.png 2x"
      alt="Horny Toad Putt Night"
      width={size}
      height={size}
      className={className}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.22),
        objectFit: 'cover',
        border: '1px solid var(--chalk-border)',
      }}
    />
  )
}

export const HornyToadLogo: React.FC<LogoProps> = ({ 
  size = 44, 
  showText = true, 
  className = '',
  subtitle = 'PUTT NIGHT'
}) => {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <HornyToadEmblem size={size} />
      </div>
      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', lineHeight: 1.1 }}>
          <div style={{ 
            fontFamily: "var(--font-headline)",
            fontWeight: 700, 
            fontSize: `${Math.max(16, size * 0.46)}px`, 
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: 'var(--chalk-white)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem'
          }}>
            <span>Horny Toad</span>
          </div>
          <div style={{ 
            fontFamily: "var(--font-ui)",
            fontSize: `${Math.max(10, size * 0.24)}px`, 
            fontWeight: 700, 
            letterSpacing: '0.14em', 
            textTransform: 'uppercase',
            color: 'var(--neon-amber)',
            textShadow: 'var(--neon-amber-glow)',
            marginTop: '2px'
          }}>
            {subtitle}
          </div>
        </div>
      )}
    </div>
  )
}

export default HornyToadLogo
