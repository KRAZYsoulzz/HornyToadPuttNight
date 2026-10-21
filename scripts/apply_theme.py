import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update imports
old_lucide = "import { Plus, Trophy, Trash2, ChevronRight, Settings2, User, Swords, History, UserPlus, ArrowLeft, LockOpen, Lock as LockIcon, QrCode, Coins, Percent, Edit2, Check, X, Shuffle, GitMerge, Sliders, AlertTriangle, Tv, Minimize2, ArrowLeftRight, MoreVertical, RotateCcw } from 'lucide-react'"
new_lucide = "import { Plus, Trophy, Trash2, ChevronRight, Settings2, User, Swords, History, UserPlus, ArrowLeft, LockOpen, Lock as LockIcon, QrCode, Coins, Percent, Edit2, Check, X, Shuffle, GitMerge, Sliders, AlertTriangle, Tv, Minimize2, ArrowLeftRight, MoreVertical, RotateCcw, Crown, Info, Target } from 'lucide-react'"
assert old_lucide in text, "Could not find old lucide import"
text = text.replace(old_lucide, new_lucide)

old_framer = "import { motion, AnimatePresence } from 'framer-motion'"
new_framer = """import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import SplitFlap from './components/SplitFlap'
import Basket from './components/Basket'
import WinnerReveal from './components/WinnerReveal'
import { motionDurations } from './theme/motion'"""
assert old_framer in text, "Could not find old framer import"
text = text.replace(old_framer, new_framer)

# 2. Add state inside App()
target_state = "  const hasManuallyLeftBracket = useRef(false)\n  const [showFinishSummary, setShowFinishSummary] = useState<{ winner: string; payout: number } | null>(null)"
replacement_state = """  const hasManuallyLeftBracket = useRef(false)
  const prefersReducedMotion = useReducedMotion()
  const [patioPutts, setPatioPutts] = useState(() => Number(localStorage.getItem('patioPutts') || 0))
  const prevRanksRef = useRef<Record<string, number>>({})
  const [showFinishSummary, setShowFinishSummary] = useState<{ winner: string; payout: number } | null>(null)"""
assert target_state in text, "Could not find target_state"
text = text.replace(target_state, replacement_state)

# 3. Replace winner modal first (before any other replacements modify it)
old_finish = """      {/* Finish Summary Modal */}
      <AnimatePresence>
        {showFinishSummary && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal-content" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} style={{ textAlign: 'center', padding: '2rem', border: '1.5px solid var(--accent)', boxShadow: '0 0 30px rgba(245, 158, 11, 0.25), 0 25px 50px rgba(0,0,0,0.8)' }}>
              <div style={{ marginBottom: '1.25rem' }}>
                <Trophy size={64} className="accent-text" style={{ margin: '0 auto', filter: 'drop-shadow(0 0 16px rgba(245, 158, 11, 0.5))' }} />
              </div>
              <h2 style={{ marginBottom: '0.5rem', fontWeight: 800, letterSpacing: '-0.01em' }}>Tournament Complete!</h2>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.75rem', color: '#F8FAFC', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{showFinishSummary.winner}</div>
              <p style={{ opacity: 0.8, marginBottom: '1.75rem', fontSize: '1rem' }}>Total Payout: <span style={{ color: 'var(--accent)', fontWeight: 800, fontSize: '1.25rem', fontVariantNumeric: 'tabular-nums' }}>${showFinishSummary.payout}</span></p>
              <button className="btn btn-primary" style={{ width: '100%', padding: '0.85rem' }} onClick={() => setShowFinishSummary(null)}>CLOSE</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>"""

new_finish = """      {/* Winner Reveal Overlay */}
      <AnimatePresence>
        {showFinishSummary && (
          <WinnerReveal
            winner={showFinishSummary.winner}
            payout={showFinishSummary.payout}
            onClose={() => setShowFinishSummary(null)}
          />
        )}
      </AnimatePresence>"""

assert old_finish in text, "Could not find old_finish"
text = text.replace(old_finish, new_finish)

# 4. Replace bottom nav items with <button>
old_nav = """      {!isKioskMode && view !== 'bracket' && !viewingPastTourney && (
        <nav className="nav">
          <div className={`nav-item ${view === 'home' ? 'active' : ''}`} onClick={handleGoHome}><Swords size={20} /><span>Bracket</span></div>
          <div className={`nav-item ${view === 'players' ? 'active' : ''}`} onClick={() => { haptic(); setView('players'); }}><User size={20} /><span>Players</span></div>
          <div className={`nav-item ${view === 'history' ? 'active' : ''}`} onClick={() => { haptic(); setView('history'); fetchData(); }}><History size={20} /><span>History</span></div>
          <div className={`nav-item ${view === 'settings' ? 'active' : ''}`} onClick={() => { haptic(); setView('settings'); }}><Settings2 size={20} /><span>Config</span></div>
        </nav>
      )}"""

new_nav = """      {!isKioskMode && view !== 'bracket' && !viewingPastTourney && (
        <nav className="nav">
          <button type="button" className={`nav-item ${view === 'home' ? 'active' : ''}`} onClick={handleGoHome}><Swords size={20} /><span>Bracket</span></button>
          <button type="button" className={`nav-item ${view === 'players' ? 'active' : ''}`} onClick={() => { haptic(); setView('players'); }}><User size={20} /><span>Players</span></button>
          <button type="button" className={`nav-item ${view === 'history' ? 'active' : ''}`} onClick={() => { haptic(); setView('history'); fetchData(); }}><History size={20} /><span>History</span></button>
          <button type="button" className={`nav-item ${view === 'settings' ? 'active' : ''}`} onClick={() => { haptic(); setView('settings'); }}><Settings2 size={20} /><span>Config</span></button>
        </nav>
      )}"""

assert old_nav in text, "Could not find old_nav"
text = text.replace(old_nav, new_nav)

# 5. Add Patio Putting Basket widget on home screen
target_home_insert = """              <div className="card">
                <div className="card-title" style={{ margin: 0 }}><UserPlus size={20} className="accent-text" /> Coming Today ({Object.values(players).filter(p => p.status === 'coming').length})</div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                  {Object.values(players).filter(p => p.status === 'coming').sort((a, b) => a.name.localeCompare(b.name)).map(p => (
                    <span key={p.id} style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#34D399', padding: '0.25rem 0.65rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 700, border: '1px solid rgba(16, 185, 129, 0.25)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.name}>{p.name}</span>
                  ))}
                  {Object.values(players).filter(p => p.status === 'coming').length === 0 && <p style={{ opacity: 0.5, fontSize: '0.8rem', margin: 0 }}>No players registered for tonight yet.</p>}
                </div>
              </div>"""

replacement_home_insert = """              <div className="card">
                <div className="card-title" style={{ margin: 0 }}><UserPlus size={20} className="accent-text" /> Coming Today ({Object.values(players).filter(p => p.status === 'coming').length})</div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                  {Object.values(players).filter(p => p.status === 'coming').sort((a, b) => a.name.localeCompare(b.name)).map(p => (
                    <span key={p.id} style={{ background: 'var(--chalk-slate-light)', color: 'var(--felt-teal-light)', padding: '0.25rem 0.65rem', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 700, border: '1px solid var(--chalk-border)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.name}>{p.name}</span>
                  ))}
                  {Object.values(players).filter(p => p.status === 'coming').length === 0 && <p style={{ opacity: 0.5, fontSize: '0.8rem', margin: 0 }}>No players registered for tonight yet.</p>}
                </div>
              </div>

              {/* Back-Bar Patio Putting Basket Target */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <div className="card-title" style={{ alignSelf: 'flex-start', margin: 0 }}>
                  <Target size={20} className="accent-text" /> Back-Bar Putting Basket
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--chalk-dim)', margin: '0.25rem 0 0.5rem' }}>
                  Patio target practice. Tap when a putt drops to wobble chains and chalk tallies!
                </p>
                <Basket score={patioPutts} size={135} showTallies={true} />
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', width: '100%', maxWidth: '320px' }}>
                  <button 
                    type="button"
                    className="btn btn-primary" 
                    style={{ flex: 1, minHeight: '48px' }}
                    onClick={() => {
                      haptic('success');
                      setPatioPutts(p => {
                        const next = p + 1;
                        localStorage.setItem('patioPutts', String(next));
                        return next;
                      });
                    }}
                  >
                    +1 PUTT MADE
                  </button>
                  {patioPutts > 0 && (
                    <button 
                      type="button"
                      className="btn btn-secondary"
                      style={{ minHeight: '48px', padding: '0.5rem 0.75rem' }}
                      title="Reset tallies"
                      onClick={() => {
                        haptic('light');
                        setPatioPutts(0);
                        localStorage.removeItem('patioPutts');
                      }}
                    >
                      <RotateCcw size={16} />
                    </button>
                  )}
                </div>
              </div>"""

assert target_home_insert in text, "Could not find target_home_insert"
text = text.replace(target_home_insert, replacement_home_insert)

# 6. Standings row layout animation, split flap, and mover amber flicker
old_standings_map = """                    .map(p => {
                    const total = (p.wins || 0) + (p.losses || 0);
                    const winPct = total > 0 ? ((p.wins / total) * 100).toFixed(0) : 0;
                    const isTop = p.id === topEarnerId;

                    return (
                      <motion.div 
                        key={p.id} 
                        className={`player-glass-card ${p.status === 'coming' ? 'status-coming' : (p.status === 'out' ? 'status-out' : '')}`}
                        onClick={() => setSelectedH2HPlayerId(p.id)}
                      >
                        {/* Left: Player Identity & Compact Stats */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', minWidth: 0 }}>
                            <span style={{ fontWeight: 750, fontSize: '0.975rem', color: '#F8FAFC', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.01em' }}>
                              {p.name}
                            </span>
                            {isTop && (
                              <span title="High Roller Leader" style={{ fontSize: '0.75rem', flexShrink: 0 }}>👑</span>
                            )}
                          </div>

                          {/* Compact Inline Stats */}
                          <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', alignItems: 'center' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#F59E0B', fontWeight: 650 }}>
                              <Trophy size={11} strokeWidth={2.5} /> <span>{p.wins || 0}</span>
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#10B981', fontWeight: 650 }}>
                              <Coins size={11} strokeWidth={2.5} /> <span>${p.earnings || 0}</span>
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#38BDF8', fontWeight: 650 }}>
                              <Percent size={11} strokeWidth={2.5} /> <span>{winPct}%</span>
                            </span>
                          </div>
                        </div>"""

new_standings_map = """                    .map((p, idx) => {
                    const total = (p.wins || 0) + (p.losses || 0);
                    const winPct = total > 0 ? ((p.wins / total) * 100).toFixed(0) : 0;
                    const isTop = p.id === topEarnerId;
                    const currentRank = idx + 1;
                    const prevRank = prevRanksRef.current[p.id];
                    const hasRankMoved = prevRank !== undefined && prevRank !== currentRank;

                    return (
                      <motion.div 
                        key={p.id}
                        layout={!prefersReducedMotion}
                        transition={{ duration: prefersReducedMotion ? 0.01 : motionDurations.base, ease: [0, 0, 0.2, 1] }}
                        className={`player-glass-card ${p.status === 'coming' ? 'status-coming' : (p.status === 'out' ? 'status-out' : '')}`}
                        onClick={() => setSelectedH2HPlayerId(p.id)}
                      >
                        {/* Rank with SplitFlap */}
                        <div style={{ display: 'flex', alignItems: 'center', minWidth: '24px', flexShrink: 0 }}>
                          <SplitFlap value={currentRank} minDigits={1} />
                        </div>

                        {/* Left: Player Identity & Compact Stats */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', minWidth: 0 }}>
                            <motion.span 
                              animate={hasRankMoved && !prefersReducedMotion ? { color: ['var(--neon-amber)', 'var(--chalk-white)', 'var(--neon-amber)', 'var(--chalk-white)'] } : undefined}
                              transition={{ duration: 0.45 }}
                              style={{ fontWeight: 750, fontSize: '0.975rem', color: isTop ? 'var(--neon-amber)' : 'var(--chalk-white)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.01em', textShadow: isTop ? 'var(--neon-amber-glow)' : 'none' }}
                            >
                              {p.name}
                            </motion.span>
                            {isTop && (
                              <span title="High Roller Leader" style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                                <Crown size={14} color="var(--neon-amber)" />
                              </span>
                            )}
                          </div>

                          {/* Compact Inline Stats with SplitFlap */}
                          <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', alignItems: 'center' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--neon-amber)', fontWeight: 650 }}>
                              <Trophy size={11} strokeWidth={2.5} /> <SplitFlap value={p.wins || 0} />
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--felt-teal-light)', fontWeight: 650 }}>
                              <Coins size={11} strokeWidth={2.5} /> <SplitFlap value={p.earnings || 0} prefix="$" />
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--chalk-dim)', fontWeight: 650 }}>
                              <Percent size={11} strokeWidth={2.5} /> <SplitFlap value={winPct} suffix="%" />
                            </span>
                          </div>
                        </div>"""

assert old_standings_map in text, "Could not find old_standings_map"
text = text.replace(old_standings_map, new_standings_map)

# 7. Remaining palette, emoji, and styling replacements
remaining_replacements = [
    # Tip emoji
    ('💡 Admin Tip: Tap a player to mark them as Paid.', '<span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}><Info size={12} color="var(--neon-amber)" /> Admin Tip: Tap a player to mark them as Paid.</span>'),
    ('✓ PAID', 'PAID'),
    ('{winnerName && <span style={{ color: \'var(--accent)\', marginLeft: \'0.5rem\', fontWeight: 600 }}>🏆 {winnerName}</span>}', '{winnerName && <span style={{ color: "var(--neon-amber)", marginLeft: "0.5rem", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "4px" }}><Trophy size={13} color="var(--neon-amber)" /> {winnerName}</span>}'),

    # Admin lock icon color
    ('color="#10b981"', 'color="var(--neon-amber)"'),

    # Active tournament card styling
    ("style={{ border: '1px solid rgba(16, 185, 129, 0.4)', marginBottom: '1rem', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(14, 20, 29, 0.95))' }}",
     "style={{ border: '1px solid var(--neon-amber)', marginBottom: '1rem', backgroundColor: 'var(--chalk-slate)' }}"),
    
    # Active tag
    ("background: 'var(--primary)', color: 'white'", "background: 'var(--neon-amber)', color: 'var(--bar-black)'"),

    # Total pot badge in buy-in ledger
    ("style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary)', background: 'rgba(16, 185, 129, 0.1)', padding: '0.2rem 0.6rem', borderRadius: '0.75rem', border: '1px solid rgba(16, 185, 129, 0.2)' }}",
     "style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--felt-teal-light)', background: 'var(--chalk-slate-dark)', padding: '0.25rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--chalk-border)' }}"),

    # Collected and outstanding badges
    ("style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.08)', padding: '0.15rem 0.4rem', borderRadius: '0.25rem', border: '1px solid rgba(16, 185, 129, 0.1)' }}",
     "style={{ color: 'var(--felt-teal-light)', background: 'var(--chalk-slate-dark)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--chalk-border)' }}"),
    ("style={{ color: 'var(--accent)', background: 'rgba(245, 158, 11, 0.08)', padding: '0.15rem 0.4rem', borderRadius: '0.25rem', border: '1px solid rgba(245, 158, 11, 0.1)' }}",
     "style={{ color: 'var(--neon-amber)', background: 'var(--chalk-slate-dark)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--chalk-border)' }}"),

    # Paid player item styling
    ("background: isPaid ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255,255,255,0.02)', \n                              borderRadius: '0.5rem', \n                              border: isPaid ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid var(--glass-border)',",
     "background: isPaid ? 'var(--chalk-slate-light)' : 'var(--chalk-slate-dark)', \n                              borderRadius: 'var(--radius-sm)', \n                              border: isPaid ? '1px solid var(--felt-teal)' : '1px solid var(--chalk-border)',"),

    # PAID badge
    ("style={{ fontSize: '0.65rem', fontWeight: 800, color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '0.1rem 0.4rem', borderRadius: '0.25rem' }}",
     "style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--felt-teal-light)', background: 'var(--chalk-slate)', border: '1px solid var(--felt-teal)', padding: '0.15rem 0.45rem', borderRadius: 'var(--radius-sm)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}"),

    # Quick start card accents
    ("<div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#10B981' }}>",
     "<div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--neon-amber)' }}>"),
    ("<div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#F59E0B' }}>",
     "<div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--neon-amber)' }}>"),
    ("<span style={{ fontSize: '0.825rem', fontWeight: 800, color: '#F8FAFC', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>",
     "<span style={{ fontSize: '0.825rem', fontWeight: 800, color: 'var(--chalk-white)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>"),

    # Roster cards background
    ("background: 'rgba(14, 21, 32, 0.65)'", "background: 'var(--chalk-slate)'"),
    ("background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.35)', boxShadow: '0 4px 16px rgba(16, 185, 129, 0.15)'",
     "background: 'var(--chalk-slate)', border: '1px solid var(--felt-teal)', boxShadow: 'var(--shadow-sm)'"),
    ("background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.3)'",
     "background: 'var(--chalk-slate)', border: '1px solid var(--neon-amber)', boxShadow: 'var(--shadow-sm)'"),
    ("<span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#F8FAFC', fontVariantNumeric: 'tabular-nums', display: 'block', marginTop: '2px' }}>",
     "<span style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--chalk-white)', fontVariantNumeric: 'tabular-nums', display: 'block', marginTop: '2px' }}><SplitFlap value={Object.keys(players).length} />"),
    ("<span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#34D399', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Coming Today</span>\n                  <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#34D399', fontVariantNumeric: 'tabular-nums', display: 'block', marginTop: '2px' }}>\n                    {Object.values(players).filter(p => p.status === 'coming').length}\n                  </span>",
     "<span style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--felt-teal-light)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Coming Today</span>\n                  <span style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--felt-teal-light)', fontVariantNumeric: 'tabular-nums', display: 'block', marginTop: '2px' }}><SplitFlap value={Object.values(players).filter(p => p.status === 'coming').length} /></span>"),
    ("<span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#FCD34D', fontVariantNumeric: 'tabular-nums', display: 'block', marginTop: '2px' }}>\n                    ${Object.values(players).reduce((sum, p) => sum + (p.earnings || 0), 0)}\n                  </span>",
     "<span style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--neon-amber)', fontVariantNumeric: 'tabular-nums', display: 'block', marginTop: '2px' }}><SplitFlap value={Object.values(players).reduce((sum, p) => sum + (p.earnings || 0), 0)} prefix=\"$\" /></span>"),

    # Filter pill colors
    ("borderColor: playerFilter === 'coming' ? 'rgba(16, 185, 129, 0.6)' : 'rgba(16, 185, 129, 0.3)',\n                      color: playerFilter === 'coming' ? '#34D399' : '#10B981',\n                      background: playerFilter === 'coming' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(16, 185, 129, 0.08)'",
     "borderColor: playerFilter === 'coming' ? 'var(--neon-amber)' : 'var(--chalk-border)',\n                      color: playerFilter === 'coming' ? 'var(--neon-amber)' : 'var(--chalk-dim)',\n                      background: playerFilter === 'coming' ? 'var(--chalk-slate-light)' : 'var(--chalk-slate-dark)'"),

    # Status buttons
    ("background: p.status === 'coming' ? 'linear-gradient(180deg, #10B981, #059669)' : 'transparent',\n                                    color: p.status === 'coming' ? '#FFFFFF' : 'rgba(16, 185, 129, 0.7)',",
     "background: p.status === 'coming' ? 'var(--felt-teal)' : 'transparent',\n                                    color: p.status === 'coming' ? 'var(--chalk-white)' : 'var(--felt-teal-light)',"),
    ("boxShadow: p.status === 'coming' ? '0 2px 8px rgba(16, 185, 129, 0.4)' : 'none'",
     "boxShadow: 'none'"),
    ("background: p.status === 'out' ? 'linear-gradient(180deg, #EF4444, #DC2626)' : 'transparent',\n                                    color: p.status === 'out' ? '#FFFFFF' : 'rgba(239, 68, 68, 0.7)',",
     "background: p.status === 'out' ? 'var(--neon-red)' : 'transparent',\n                                    color: 'var(--chalk-white)',"),
    ("boxShadow: p.status === 'out' ? '0 2px 8px rgba(239, 68, 68, 0.4)' : 'none'",
     "boxShadow: 'none'"),

    # Status tag badge
    ("background: p.status === 'coming' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',\n                                color: p.status === 'coming' ? '#34D399' : '#F87171',\n                                border: p.status === 'coming' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',\n                                boxShadow: p.status === 'coming' ? '0 0 10px rgba(16, 185, 129, 0.2)' : 'none'",
     "background: p.status === 'coming' ? 'var(--chalk-slate-light)' : 'var(--chalk-slate-dark)',\n                                color: p.status === 'coming' ? 'var(--felt-teal-light)' : 'var(--neon-red)',\n                                border: p.status === 'coming' ? '1px solid var(--felt-teal)' : '1px solid var(--neon-red)',\n                                boxShadow: 'none'"),

    # Hall of Fame
    ("background: idx === 0 ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(14, 21, 32, 0.8))' : undefined,\n                      borderColor: idx === 0 ? 'rgba(245, 158, 11, 0.35)' : undefined",
     "background: idx === 0 ? 'var(--chalk-slate-light)' : undefined,\n                      borderColor: idx === 0 ? 'var(--neon-amber)' : undefined"),
    ("<span style={{ fontWeight: 800, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, color: '#F8FAFC' }}>{p.name}</span>",
     "<span style={{ fontWeight: 800, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, color: 'var(--chalk-white)' }}>{p.name}</span>"),
    ("<span style={{ color: idx === 0 ? '#FCD34D' : 'var(--primary)', fontWeight: 850, fontVariantNumeric: 'tabular-nums', flexShrink: 0, fontSize: '0.95rem' }}>${p.earnings}</span>",
     "<span style={{ color: idx === 0 ? 'var(--neon-amber)' : 'var(--chalk-white)', fontWeight: 850, fontVariantNumeric: 'tabular-nums', flexShrink: 0, fontSize: '0.95rem' }}><SplitFlap value={p.earnings || 0} prefix=\"$\" /></span>"),

    # Shuffle button
    ("style={{ flex: 1, background: 'var(--accent)', color: '#000', fontWeight: 700 }}",
     "style={{ flex: 1, background: 'var(--neon-amber)', color: 'var(--bar-black)', fontWeight: 800 }}"),

    # Danger buttons
    ("style={{ width: '100%', background: 'var(--danger)', color: 'white' }}",
     "style={{ width: '100%', background: 'var(--neon-red)', color: 'var(--chalk-white)', border: '1px solid var(--neon-red)' }}"),
    ("style={{ flex: 1, background: 'var(--danger)', color: 'white' }}",
     "style={{ flex: 1, background: 'var(--neon-red)', color: 'var(--chalk-white)', border: '1px solid var(--neon-red)' }}"),
    ("style={{ width: '100%', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid var(--danger)' }}",
     "style={{ width: '100%', background: 'var(--chalk-slate-dark)', color: 'var(--neon-red)', border: '1px solid var(--neon-red)' }}"),
    ("style={{ width: '100%', justifyContent: 'flex-start', padding: '0.85rem 1rem', fontSize: '0.9rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)' }}",
     "style={{ width: '100%', justifyContent: 'flex-start', padding: '0.85rem 1rem', fontSize: '0.9rem', background: 'var(--chalk-slate-dark)', color: 'var(--neon-red)', border: '1px solid var(--neon-red)' }}"),
    ("border: '1px solid var(--danger)'", "border: '1px solid var(--neon-red)'"),
    ("color: 'var(--danger)'", "color: 'var(--neon-red)'"),

    # Heat styles
    ("if (rate >= 0.8) return { background: 'rgba(245, 158, 11, 0.1)', borderLeft: '3px solid var(--accent)' }",
     "if (rate >= 0.8) return { background: 'var(--chalk-slate-light)', borderLeft: '3px solid var(--neon-amber)' }"),
    ("if (rate >= 0.6) return { background: 'rgba(16, 185, 129, 0.05)', borderLeft: '3px solid var(--primary)' }",
     "if (rate >= 0.6) return { background: 'var(--chalk-slate)', borderLeft: '3px solid var(--felt-teal)' }"),

    # Swap selected styles
    ("isP1SwapSelected ? { outline: '2px solid var(--accent)', boxShadow: '0 0 12px rgba(245, 158, 11, 0.7)', background: 'rgba(245, 158, 11, 0.15)' } : {}",
     "isP1SwapSelected ? { outline: '2px solid var(--neon-amber)', boxShadow: 'var(--neon-amber-box-glow)', background: 'var(--chalk-slate-light)' } : {}"),
    ("isP2SwapSelected ? { outline: '2px solid var(--accent)', boxShadow: '0 0 12px rgba(245, 158, 11, 0.7)', background: 'rgba(245, 158, 11, 0.15)' } : {}",
     "isP2SwapSelected ? { outline: '2px solid var(--neon-amber)', boxShadow: 'var(--neon-amber-box-glow)', background: 'var(--chalk-slate-light)' } : {}"),

    # Match score split flap
    ("{match.winnerId === match.player1Id && <span className=\"match-score\" style={{ flexShrink: 0, whiteSpace: 'nowrap', fontSize: '0.7rem', margin: 0 }}>{match.score}</span>}",
     "{match.winnerId === match.player1Id && <span className=\"match-score\" style={{ flexShrink: 0, whiteSpace: 'nowrap', fontSize: '0.75rem', margin: 0 }}><SplitFlap value={match.score} /></span>}"),
    ("{match.winnerId === match.player2Id && <span className=\"match-score\" style={{ flexShrink: 0, whiteSpace: 'nowrap', fontSize: '0.7rem', margin: 0 }}>{match.score}</span>}",
     "{match.winnerId === match.player2Id && <span className=\"match-score\" style={{ flexShrink: 0, whiteSpace: 'nowrap', fontSize: '0.75rem', margin: 0 }}><SplitFlap value={match.score} /></span>}"),

    # Bye tag
    ("style={{ fontSize: '0.65rem', color: 'var(--accent)', fontWeight: 800, background: 'rgba(245, 158, 11, 0.15)', padding: '0.05rem 0.35rem', borderRadius: '0.25rem', border: '1px solid rgba(245, 158, 11, 0.3)' }}",
     "style={{ fontSize: '0.65rem', color: 'var(--neon-amber)', fontWeight: 800, background: 'var(--chalk-slate-dark)', padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--neon-amber)' }}"),

    # Subtext / card backgrounds
    ("background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--glass-border)', marginBottom: '1.25rem'",
     "background: 'var(--chalk-slate-dark)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--chalk-border)', marginBottom: '1.25rem'"),
    ("background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1.25rem', fontSize: '0.8rem'",
     "background: 'var(--chalk-slate-dark)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--chalk-border)', marginBottom: '1.25rem', fontSize: '0.8rem'"),
    ("background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--glass-border)', marginBottom: '1.25rem'",
     "background: 'var(--chalk-slate-dark)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--chalk-border)', marginBottom: '1.25rem'"),
    ("background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--glass-border)'",
     "background: 'var(--chalk-slate-dark)', padding: '1.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--chalk-border)'"),
    ("background: 'rgba(255,255,255,0.05)', borderRadius: '1rem'",
     "background: 'var(--chalk-slate-dark)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--chalk-border)'"),
    ("background: 'rgba(255,255,255,0.05)', borderRadius: '50%'",
     "background: 'var(--chalk-slate-dark)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--chalk-border)'"),
    ("background: 'rgba(239, 68, 68, 0.05)', borderRadius: '50%'",
     "background: 'var(--chalk-slate-dark)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--neon-red)'"),
    ("background: 'rgba(245, 158, 11, 0.2)', border: '1px solid var(--accent)'",
     "background: 'var(--chalk-slate-dark)', border: '1px solid var(--neon-amber)'"),
    ("background: 'rgba(99, 102, 241, 0.2)', border: '1px solid var(--secondary)'",
     "background: 'var(--chalk-slate-dark)', border: '1px solid var(--chalk-border)'"),
    ("border: '1px solid rgba(255,255,255,0.1)'",
     "border: '1px solid var(--chalk-border)'"),
    ("color: 'rgba(255,255,255,0.1)'",
     "color: 'var(--chalk-faint)'"),
    ("textShadow: '0 2px 10px rgba(255, 184, 0, 0.3)'",
     "textShadow: 'var(--neon-amber-glow)'"),
    ("textShadow: '0 2px 10px rgba(255, 184, 0, 0.3)'",
     "textShadow: 'var(--neon-amber-glow)'"),
    ("background: isSwapMode ? 'rgba(245, 158, 11, 0.25)' : undefined,\n                          border: isSwapMode ? '1.5px solid var(--accent)' : undefined",
     "background: isSwapMode ? 'var(--chalk-slate-light)' : undefined,\n                          border: isSwapMode ? '1.5px solid var(--neon-amber)' : undefined"),
    ("background: isKioskMode ? 'rgba(16, 185, 129, 0.25)' : undefined,\n                        border: isKioskMode ? '1.5px solid var(--primary)' : undefined",
     "background: isKioskMode ? 'var(--chalk-slate-light)' : undefined,\n                        border: isKioskMode ? '1.5px solid var(--neon-amber)' : undefined"),
    ("background: isKioskMode ? 'rgba(16, 185, 129, 0.25)' : undefined, \n                          border: isKioskMode ? '1.5px solid var(--primary)' : undefined",
     "background: isKioskMode ? 'var(--chalk-slate-light)' : undefined, \n                          border: isKioskMode ? '1.5px solid var(--neon-amber)' : undefined"),
    ("background: isSelected ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.03)'",
     "background: isSelected ? 'var(--chalk-slate-light)' : 'var(--chalk-slate-dark)'"),
    ("background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)'",
     "background: 'var(--chalk-slate-dark)', border: '1px solid var(--neon-amber)'"),
    ("background: isSelected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.02)'",
     "background: isSelected ? 'var(--chalk-slate-light)' : 'var(--chalk-slate-dark)'"),
    ("background: 'rgba(16, 185, 129, 0.1)'", "background: 'var(--chalk-slate-dark)'"),
]

for old, new in remaining_replacements:
    if old in text:
        text = text.replace(old, new)
    else:
        print(f"Notice: skipped non-matching: {old[:40]}...")

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Applied theme transformation to src/App.tsx successfully")
