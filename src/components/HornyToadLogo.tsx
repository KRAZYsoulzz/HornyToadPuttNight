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
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 200 200" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
    >
      <defs>
        {/* Radial background aura */}
        <radialGradient id="toadBgGlow" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#132a22" />
          <stop offset="70%" stopColor="#0a1219" />
          <stop offset="100%" stopColor="#06090e" />
        </radialGradient>

        {/* Gold linear gradient for luxury accents */}
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>

        {/* Emerald linear gradient for tournament turf */}
        <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="50%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>

        {/* Obsidian dark armor gradient */}
        <linearGradient id="armorDark" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#2A374A" />
          <stop offset="100%" stopColor="#151D28" />
        </linearGradient>

        <linearGradient id="armorLight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3D4D63" />
          <stop offset="100%" stopColor="#1E293B" />
        </linearGradient>

        {/* Outer bevel ring filter */}
        <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* --- Medallion Outer Ring --- */}
      <circle cx="100" cy="100" r="95" fill="url(#toadBgGlow)" />
      
      {/* Outer Fine Gold Border */}
      <circle 
        cx="100" 
        cy="100" 
        r="94" 
        stroke="url(#goldGrad)" 
        strokeWidth="2.5" 
        opacity="0.85" 
      />

      {/* Inner Emerald Track Ring with subtle golf tournament ticks */}
      <circle 
        cx="100" 
        cy="100" 
        r="88" 
        stroke="url(#emeraldGrad)" 
        strokeWidth="1.2" 
        strokeDasharray="6 3" 
        opacity="0.5" 
      />
      <circle 
        cx="100" 
        cy="100" 
        r="84" 
        stroke="#ffffff" 
        strokeWidth="0.5" 
        opacity="0.15" 
      />

      {/* --- Putting Basket / Disc Flight Trajectory Behind Toad --- */}
      {/* Flight disc ellipse arc */}
      <ellipse 
        cx="100" 
        cy="150" 
        rx="64" 
        ry="20" 
        stroke="url(#emeraldGrad)" 
        strokeWidth="2" 
        opacity="0.7" 
        strokeDasharray="120 20" 
      />
      <ellipse 
        cx="100" 
        cy="150" 
        rx="52" 
        ry="15" 
        stroke="url(#goldGrad)" 
        strokeWidth="1" 
        opacity="0.4" 
      />

      {/* Putting Target / Chains subtle backdrop */}
      <g opacity="0.3" stroke="url(#goldGrad)" strokeWidth="1.2">
        {/* Central pole */}
        <line x1="100" y1="36" x2="100" y2="162" strokeWidth="2" stroke="#F59E0B" opacity="0.4" />
        {/* Chain catenary lines */}
        <path d="M 72 65 Q 84 100 100 115 Q 116 100 128 65" fill="none" />
        <path d="M 80 65 Q 88 105 100 122 Q 112 105 120 65" fill="none" />
        <path d="M 64 68 Q 80 110 100 130 Q 120 110 136 68" fill="none" />
      </g>

      {/* --- THE HORNY TOAD CREST (Faceted Athletic Mascot) --- */}
      <g transform="translate(0, -2)">
        {/* Back / Occipital Center Horns (Main Spikes) */}
        {/* Left Big Horn */}
        <path d="M 96 68 L 74 24 L 88 64 Z" fill="url(#goldGrad)" />
        <path d="M 88 64 L 74 24 L 84 66 Z" fill="#92400E" opacity="0.6" />
        
        {/* Right Big Horn */}
        <path d="M 104 68 L 126 24 L 112 64 Z" fill="url(#goldGrad)" />
        <path d="M 112 64 L 126 24 L 116 66 Z" fill="#FDE68A" opacity="0.7" />

        {/* Center Crown Crest Spike */}
        <path d="M 100 34 L 94 62 L 100 66 L 106 62 Z" fill="url(#goldGrad)" />
        <path d="M 100 34 L 100 66 L 106 62 Z" fill="#FDE68A" opacity="0.5" />

        {/* Outer Horns (Squamosal Horns) */}
        {/* Left Upper Spike */}
        <path d="M 82 72 L 48 42 L 74 76 Z" fill="url(#goldGrad)" />
        <path d="M 74 76 L 48 42 L 68 76 Z" fill="#92400E" opacity="0.5" />
        
        {/* Right Upper Spike */}
        <path d="M 118 72 L 152 42 L 126 76 Z" fill="url(#goldGrad)" />
        <path d="M 126 76 L 152 42 L 132 76 Z" fill="#FDE68A" opacity="0.6" />

        {/* Mid-Cheek Spikes */}
        {/* Left Mid Spike */}
        <path d="M 68 88 L 38 74 L 66 96 Z" fill="url(#emeraldGrad)" />
        {/* Right Mid Spike */}
        <path d="M 132 88 L 162 74 L 134 96 Z" fill="url(#emeraldGrad)" />

        {/* Lower Cheek / Jaw Spikes */}
        {/* Left Lower Spike */}
        <path d="M 64 104 L 40 102 L 66 114 Z" fill="url(#goldGrad)" />
        {/* Right Lower Spike */}
        <path d="M 136 104 L 160 102 L 134 114 Z" fill="url(#goldGrad)" />

        {/* Head Shell Armor Base (Faceted Chiseled Geometry) */}
        {/* Forehead Shield */}
        <polygon points="100,64 78,74 84,94 100,90" fill="url(#armorLight)" />
        <polygon points="100,64 122,74 116,94 100,90" fill="url(#armorDark)" />

        {/* Temporal Side Plates */}
        <polygon points="78,74 66,94 84,94" fill="url(#armorDark)" />
        <polygon points="122,74 134,94 116,94" fill="url(#armorLight)" />

        {/* Brow Ridge (Heavy armored reptile brow) */}
        <polygon points="72,92 100,88 84,97" fill="url(#goldGrad)" opacity="0.9" />
        <polygon points="128,92 100,88 116,97" fill="url(#goldGrad)" opacity="0.7" />

        {/* Eyes: Piercing Tournament Emerald Focus */}
        {/* Left Eye Socket */}
        <polygon points="74,93 88,96 82,102 72,98" fill="#0A1118" />
        <ellipse cx="80" cy="97" rx="4.5" ry="2.5" transform="rotate(-15, 80, 97)" fill="#10B981" />
        <ellipse cx="80" cy="97" rx="1.5" ry="2.2" transform="rotate(-15, 80, 97)" fill="#022C22" />
        <circle cx="81.5" cy="96" r="0.8" fill="#A7F3D0" />

        {/* Right Eye Socket */}
        <polygon points="126,93 112,96 118,102 128,98" fill="#0A1118" />
        <ellipse cx="120" cy="97" rx="4.5" ry="2.5" transform="rotate(15, 120, 97)" fill="#10B981" />
        <ellipse cx="120" cy="97" rx="1.5" ry="2.2" transform="rotate(15, 120, 97)" fill="#022C22" />
        <circle cx="121.5" cy="96" r="0.8" fill="#A7F3D0" />

        {/* Snout Bridge & Spiny Dorsal Ridge */}
        <polygon points="100,88 92,106 100,102" fill="url(#armorLight)" />
        <polygon points="100,88 108,106 100,102" fill="url(#armorDark)" />
        
        {/* Small Nose Spikes */}
        <polygon points="96,105 100,99 104,105 100,107" fill="url(#goldGrad)" />

        {/* Wide Stout Horned Toad Jaw */}
        <polygon points="92,106 100,102 108,106 118,118 100,126 82,118" fill="url(#armorDark)" />
        <polygon points="100,102 108,106 118,118 100,126" fill="url(#armorLight)" opacity="0.7" />
        
        {/* Jawline Gold Accent */}
        <path d="M 78 116 L 100 128 L 122 116" stroke="url(#goldGrad)" strokeWidth="1.8" fill="none" strokeLinecap="round" />

        {/* Nostrils */}
        <circle cx="96" cy="112" r="1" fill="#04070A" />
        <circle cx="104" cy="112" r="1" fill="#04070A" />
      </g>

      {/* --- Disc Golf Putter Emblem at Bottom Base --- */}
      <g transform="translate(0, 10)">
        {/* Golf Disc Bevel */}
        <ellipse cx="100" cy="144" rx="42" ry="12" fill="#111B27" stroke="url(#goldGrad)" strokeWidth="1.5" />
        <ellipse cx="100" cy="144" rx="35" ry="9" fill="url(#emeraldGrad)" />
        <ellipse cx="100" cy="143" rx="22" ry="5" fill="#0B131E" opacity="0.6" />
        <circle cx="100" cy="143" r="2" fill="#FDE68A" />
        
        {/* Mini Star Accents on Disc */}
        <path d="M 80 144 L 81 142 L 82 144 L 80.5 143 Z" fill="#FDE68A" />
        <path d="M 120 144 L 121 142 L 122 144 L 120.5 143 Z" fill="#FDE68A" />
      </g>

      {/* Subtle Laurel Branches / Stars flanking bottom */}
      <g fill="url(#goldGrad)" opacity="0.75">
        {/* Stars */}
        <polygon points="40,140 42,135 44,140 40,137 44,137" />
        <polygon points="48,154 50,149 52,154 48,151 52,151" />
        <polygon points="160,140 158,135 156,140 160,137 156,137" />
        <polygon points="152,154 150,149 148,154 152,151 148,151" />
      </g>
    </svg>
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
            fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
            fontWeight: 900, 
            fontSize: `${Math.max(14, size * 0.42)}px`, 
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: '#F8FAFC',
            textShadow: '0 2px 4px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem'
          }}>
            <span>Horny Toad</span>
          </div>
          <div style={{ 
            fontSize: `${Math.max(9, size * 0.22)}px`, 
            fontWeight: 800, 
            letterSpacing: '0.18em', 
            textTransform: 'uppercase',
            background: 'linear-gradient(90deg, #F59E0B, #10B981)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
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
