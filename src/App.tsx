import { useState, useEffect, useMemo, useRef } from 'react'
import { Plus, Trophy, Trash2, ChevronRight, Settings2, User, Swords, History, UserPlus, ArrowLeft, LockOpen, Lock as LockIcon, QrCode, Coins, Percent, Edit2, Check, X, Shuffle, GitMerge, Sliders, AlertTriangle, Tv, Minimize2, ArrowLeftRight, MoreVertical, RotateCcw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { generateBracket, calculatePayouts, getTournamentEntryFee, getTournamentPot, getTournamentLabel } from './logic/tournament'
import type { TournamentConfig, Player, Match } from './logic/tournament'
import { supabase } from './lib/supabase'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import './index.css'

const isToday = (timestamp: number) => {
  const date = new Date(timestamp)
  const today = new Date()
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
}

function App() {
  // Global State
  const [players, setPlayers] = useState<Record<string, Player>>({})
  const [activeTournament, setActiveTournament] = useState<{
    config: TournamentConfig;
    matches: Match[];
    id: string;
    created_at?: string;
  } | null>(null)

  const [view, setView] = useState<'home' | 'bracket' | 'players' | 'settings' | 'history'>('home')
  const [showOptions, setShowOptions] = useState<string | null>(null)
  const [showPastOptions, setShowPastOptions] = useState<string | null>(null)
  const [showScoreModal, setShowScoreModal] = useState<{ matchId: string; winnerId: string; isPastTourney?: boolean } | null>(null)
  const [confirmDeletePlayerId, setConfirmDeletePlayerId] = useState<string | null>(null)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [confirmShuffle, setConfirmShuffle] = useState(false)
  const [confirmSwap, setConfirmSwap] = useState<{
    slotA: { matchId: string; slot: 'p1' | 'p2'; playerId: string }
    slotB: { matchId: string; slot: 'p1' | 'p2'; playerId: string }
  } | null>(null)
  const [showAddPlayerToByeModal, setShowAddPlayerToByeModal] = useState(false)
  const [selectedByeMatchId, setSelectedByeMatchId] = useState<string | null>(null)
  const [byeSelectedPlayerId, setByeSelectedPlayerId] = useState<string | null>(null)
  const [byeNewPlayerName, setByeNewPlayerName] = useState('')
  const [byeSearchQuery, setByeSearchQuery] = useState('')
  const [byeActiveTab, setByeActiveTab] = useState<'existing' | 'new'>('existing')
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('puttNightAdmin') === 'true')
  const cancelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [loginCode, setLoginCode] = useState('')
  const [newPlayerName, setNewPlayerName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedH2HPlayerId, setSelectedH2HPlayerId] = useState<string | null>(null)
  const [pastTournaments, setPastTournaments] = useState<any[]>([])
  const [viewingPastTourney, setViewingPastTourney] = useState<any | null>(null)
  const hasManuallyLeftBracket = useRef(false)
  const [showFinishSummary, setShowFinishSummary] = useState<{ winner: string; payout: number } | null>(null)

  // Player Management Modals
  const [editingPlayerStats, setEditingPlayerStats] = useState<{
    id: string;
    name: string;
    wins: number;
    losses: number;
    earnings: number;
    status: 'coming' | 'out' | null;
  } | null>(null)

  const [showPlayerActionMenuId, setShowPlayerActionMenuId] = useState<string | null>(null)
  const [showMergeModal, setShowMergeModal] = useState(false)
  const [mergePrimaryId, setMergePrimaryId] = useState('')
  const [mergeSecondaryId, setMergeSecondaryId] = useState('')
  const [isMerging, setIsMerging] = useState(false)

  // Tournament Management Modals
  const [editingPastTourneyConfig, setEditingPastTourneyConfig] = useState<{
    id: string;
    entryFee: number;
    addedCash: number;
    customLabel: string;
    payoutPlaces: number;
    payoutSplits: number[];
  } | null>(null)

  const [editingActiveTourneyConfig, setEditingActiveTourneyConfig] = useState(false)
  const [activeTourneyEditFee, setActiveTourneyEditFee] = useState(2)
  const [activeTourneyEditCash, setActiveTourneyEditCash] = useState(0)

  const [confirmDeleteTourney, setConfirmDeleteTourney] = useState<any | null>(null)
  const [rollbackStatsOnDelete, setRollbackStatsOnDelete] = useState(true)

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showQR, setShowQR] = useState(false)
  const [showRivalryMatch, setShowRivalryMatch] = useState<Match | null>(null)
  const [playerSort, setPlayerSort] = useState<'name' | 'wins' | 'earnings' | 'pct'>('name')

  // Feature #2: TV / Fullscreen Kiosk Mode
  const [isKioskMode, setIsKioskMode] = useState(false)

  // Feature #5: Pre-Start Matchup Swap
  const [isSwapMode, setIsSwapMode] = useState(false)
  const [swapSelection, setSwapSelection] = useState<{ matchId: string; slot: 'p1' | 'p2'; playerId: string } | null>(null)

  const toggleKioskMode = () => {
    haptic('medium')
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsKioskMode(true)
      }).catch(() => {
        setIsKioskMode(prev => !prev)
      })
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => {
          setIsKioskMode(false)
        }).catch(() => {
          setIsKioskMode(false)
        })
      } else {
        setIsKioskMode(false)
      }
    }
  }

  useEffect(() => {
    const handleFsChange = () => {
      setIsKioskMode(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  const [paidTonight, setPaidTonight] = useState<string[]>(() => {
    try {
      const storedDate = localStorage.getItem('puttNightPaidDate')
      const todayStr = new Date().toDateString()
      if (storedDate !== todayStr) {
        localStorage.setItem('puttNightPaidDate', todayStr)
        localStorage.setItem('puttNightPaidTonight', '[]')
        return []
      }
      const stored = localStorage.getItem('puttNightPaidTonight')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem('puttNightPaidTonight', JSON.stringify(paidTonight))
  }, [paidTonight])

  const togglePaidStatus = (pId: string) => {
    if (!isAdmin) return
    haptic('light')
    setPaidTonight(prev => 
      prev.includes(pId) ? prev.filter(id => id !== pId) : [...prev, pId]
    )
  }

  const haptic = (type: 'light' | 'medium' | 'heavy' | 'success' = 'light') => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      if (type === 'light') window.navigator.vibrate(10)
      else if (type === 'medium') window.navigator.vibrate(25)
      else if (type === 'heavy') window.navigator.vibrate(50)
      else if (type === 'success') window.navigator.vibrate([15, 30, 15])
    }
  }

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
    }
  }

  const [config, setConfig] = useState<TournamentConfig>({
    type: 'one_and_done',
    players: [],
    addedCash: 0,
    payoutPlaces: 1,
    byeLogic: 'random',
    payoutSplits: [100],
    entryFee: 2,
    customLabel: ''
  })

  // Full list of all tournaments for smart chronological label calculation
  const allTournamentsList = useMemo(() => {
    const list = [...pastTournaments]
    if (activeTournament && !list.some(t => t.id === activeTournament.id)) {
      list.unshift(activeTournament)
    }
    return list
  }, [pastTournaments, activeTournament])

  const fetchData = async () => {
    try {
      const { data: pData, error: pError } = await supabase.from('players').select('*')
      if (pError) console.error("Error fetching players:", pError)

      // Get the most recent active tournament
      const { data: tData, error: tError } = await supabase.from('tournaments')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
      
      if (tError) console.error("Error fetching tournament:", tError)
      
      if (pData) {
        const pMap: Record<string, Player> = {}
        pData.forEach(p => { pMap[p.id] = p })
        setPlayers(pMap)
      }
      if (tData && tData.length > 0) {
        const active = tData[0]
        const timestamp = parseInt(active.id)
        const isRecent = !isNaN(timestamp) && (isToday(timestamp) || (Date.now() - timestamp) < 12 * 60 * 60 * 1000)

        if (isRecent) {
          setActiveTournament({ config: active.config, matches: active.matches, id: active.id, created_at: active.created_at })
        } else {
          // Self-heal: deactivate old zombie tournaments from previous sessions
          setActiveTournament(null)
          await supabase.from('tournaments').update({ is_active: false }).eq('id', active.id)
          await fetchData()
        }
      } else {
        setActiveTournament(null)
      }

      // Always fetch all history for the History tab
      const { data: hData } = await supabase.from('tournaments').select('*').eq('is_active', false).order('created_at', { ascending: false })
      if (hData) {
        setPastTournaments(hData)
        // If currently viewing a past tournament, refresh its local state
        setViewingPastTourney((prev: any) => {
          if (!prev) return null
          const updated = hData.find(t => t.id === prev.id)
          return updated || prev
        })
      }
    } catch (e) {
      console.error("Fetch failed:", e)
    }
  }

  // Supabase Data Load & Realtime
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData()
    // Subscribe to changes in both tables
    const playerSub = supabase.channel('players-all').on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => fetchData()).subscribe()
    const tourneySub = supabase.channel('tourney-all').on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments' }, () => {
      fetchData()
    }).subscribe()

    // Sync on app visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchData()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    const pollInterval = setInterval(() => {
      fetchData()
    }, 15000)

    return () => {
      supabase.removeChannel(playerSub)
      supabase.removeChannel(tourneySub)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearInterval(pollInterval)
    }
  }, [])

  const plateWidth = useMemo(() => {
    const tourney = viewingPastTourney || activeTournament
    if (!tourney) return 140
    const activePlayerIds = tourney.config.players || []
    const maxLen = activePlayerIds.reduce((max: number, id: string) => {
      const len = players[id]?.name.length || 0
      return len > max ? len : max
    }, 0)
    return Math.max(100, maxLen * 8 + 30)
  }, [activeTournament, viewingPastTourney, players])

  useEffect(() => {
    localStorage.setItem('puttNightAdmin', isAdmin.toString())
  }, [isAdmin])

  useEffect(() => {
    if (activeTournament && view === 'home' && !hasManuallyLeftBracket.current) {
      setView('bracket')
    } else if (!activeTournament && view === 'bracket') {
      setView('home')
    }
  }, [activeTournament, view])

  const handleGoHome = () => {
    haptic('light')
    hasManuallyLeftBracket.current = true
    setView('home')
  }

  const calculateH2H = (p1Id: string, p2Id: string) => {
    const p1 = players[p1Id]
    if (!p1 || !p1.history) return { p1Wins: 0, p2Wins: 0 }
    const matchups = p1.history.filter(h => h.startsWith(p2Id + ':'))
    const p1Wins = matchups.filter(h => h.endsWith(':W')).length
    const p2Wins = matchups.filter(h => h.endsWith(':L')).length
    return { p1Wins, p2Wins }
  }

  const handleOpenBracket = () => {
    hasManuallyLeftBracket.current = false
    setView('bracket')
  }

  const playersOwedMap = useMemo(() => {
    const owed: Record<string, number> = {}
    
    // Initialize active/known players to 0
    Object.keys(players).forEach(id => {
      owed[id] = 0
    })

    const countTourney = (t: { config: TournamentConfig; id: string; matches?: any[] }) => {
      const timestamp = parseInt(t.id)
      if (isNaN(timestamp) || !isToday(timestamp)) return

      // Only count if it is currently the active tournament OR a completed tournament (final match has a winner)
      const isCurrentlyActive = activeTournament && activeTournament.id === t.id
      const finalMatch = t.matches?.find((m: any) => m.nextMatchId === null && !m.isConsolation)
      const isCompleted = finalMatch && finalMatch.winnerId !== null

      if (!isCurrentlyActive && !isCompleted) return

      const entryFee = getTournamentEntryFee(t.config)
      const uniquePlayerIds = Array.from(new Set(t.config.players || []))
      uniquePlayerIds.forEach(pId => {
        if (owed[pId] !== undefined) {
          owed[pId] += entryFee
        } else {
          owed[pId] = entryFee
        }
      })
    }

    if (activeTournament) {
      countTourney(activeTournament)
    }

    pastTournaments.forEach(t => {
      countTourney(t)
    })

    return owed
  }, [players, activeTournament, pastTournaments])

  const tourneyHasStarted = useMemo(() => {
    if (!activeTournament) return false
    return activeTournament.matches.some(m => m.winnerId !== null && m.score !== 'BYE')
  }, [activeTournament])

  const availableByes = useMemo(() => {
    if (!activeTournament) return []
    return activeTournament.matches.filter(m => {
      if (m.round !== 1 || m.score !== 'BYE') return false
      const hasSinglePlayer = (m.player1Id && !m.player2Id) || (!m.player1Id && m.player2Id)
      if (!hasSinglePlayer) return false
      if (m.nextMatchId) {
        const nextMatch = activeTournament.matches.find(nm => nm.id === m.nextMatchId)
        if (nextMatch && nextMatch.winnerId !== null) return false
      }
      return true
    })
  }, [activeTournament])

  const handleShuffleBracket = async () => {
    if (!activeTournament || tourneyHasStarted || !isAdmin) return
    haptic('success')
    const newMatches = generateBracket(activeTournament.config, players)

    setActiveTournament(prev => prev ? { ...prev, matches: newMatches } : null)

    const { error } = await supabase.from('tournaments').update({ matches: newMatches }).eq('id', activeTournament.id)
    if (error) {
      alert('Error shuffling bracket: ' + error.message)
      fetchData()
    }
  }

  // Feature #5: Swap Two Players in Round 1 before bracket begins
  const handleExecuteSwap = async (
    slotA: { matchId: string; slot: 'p1' | 'p2'; playerId: string },
    slotB: { matchId: string; slot: 'p1' | 'p2'; playerId: string }
  ) => {
    if (!activeTournament) return
    haptic('success')

    const updatedMatches = activeTournament.matches.map(m => {
      let p1 = m.player1Id
      let p2 = m.player2Id

      if (m.id === slotA.matchId) {
        if (slotA.slot === 'p1') p1 = slotB.playerId
        else p2 = slotB.playerId
      }
      if (m.id === slotB.matchId) {
        if (slotB.slot === 'p1') p1 = slotA.playerId
        else p2 = slotA.playerId
      }

      let winnerId = m.winnerId
      let score = m.score
      if (p1 && !p2) {
        winnerId = p1
        score = 'BYE'
      } else if (p1 && p2 && score === 'BYE') {
        winnerId = null
        score = null
      }

      return { ...m, player1Id: p1, player2Id: p2, winnerId, score }
    })

    // Advance any newly assigned Byes into round 2
    const r1Matches = updatedMatches.filter(m => m.round === 1)
    r1Matches.forEach(r1 => {
      if (r1.nextMatchId) {
        const nextMatch = updatedMatches.find(nm => nm.id === r1.nextMatchId)
        if (nextMatch) {
          if (r1.score === 'BYE' && r1.winnerId) {
            if (r1.order % 2 === 0) nextMatch.player1Id = r1.winnerId
            else nextMatch.player2Id = r1.winnerId
          } else {
            if (r1.order % 2 === 0 && nextMatch.player1Id === slotA.playerId) nextMatch.player1Id = null
            if (r1.order % 2 !== 0 && nextMatch.player2Id === slotA.playerId) nextMatch.player2Id = null
          }
        }
      }
    })

    setActiveTournament(prev => prev ? { ...prev, matches: updatedMatches } : null)
    setSwapSelection(null)

    const { error } = await supabase.from('tournaments').update({ matches: updatedMatches }).eq('id', activeTournament.id)
    if (error) {
      alert('Error saving player swap: ' + error.message)
      fetchData()
    }
  }

  // Feature: Add Player to a Round 1 Bye Slot
  const handleAddPlayerToBye = async (matchId: string, newPlayerId: string) => {
    if (!activeTournament || !isAdmin) return
    const match = activeTournament.matches.find(m => m.id === matchId)
    if (!match || match.round !== 1 || match.score !== 'BYE') return

    const existingPlayerId = match.player1Id || match.player2Id
    if (!existingPlayerId) return

    const emptySlot = match.player1Id ? 'player2Id' : 'player1Id'

    let updatedMatches = activeTournament.matches.map(m => {
      // 1. Fill the bye slot and clear the automatic win / BYE score
      if (m.id === matchId) {
        return {
          ...m,
          [emptySlot]: newPlayerId,
          winnerId: null,
          score: null
        }
      }
      // 2. Clear existing player from Round 2 because they now must play their Round 1 match!
      if (m.id === match.nextMatchId) {
        let p1 = m.player1Id
        let p2 = m.player2Id
        if (p1 === existingPlayerId) p1 = null
        if (p2 === existingPlayerId) p2 = null
        return {
          ...m,
          player1Id: p1,
          player2Id: p2
        }
      }
      return m
    })

    const newPlayerCount = activeTournament.config.players.length + 1

    // 3. Ensure consolation match exists if 4+ players and payoutPlaces > 1
    if (newPlayerCount >= 4 && activeTournament.config.payoutPlaces > 1 && !updatedMatches.some(m => m.isConsolation)) {
      const finalRoundNum = Math.ceil(Math.log2(newPlayerCount))
      updatedMatches.push({
        id: 'consolation',
        round: finalRoundNum,
        order: 0,
        player1Id: null,
        player2Id: null,
        winnerId: null,
        score: null,
        nextMatchId: null,
        isConsolation: true
      })
    }

    const updatedConfig: TournamentConfig = {
      ...activeTournament.config,
      players: [...activeTournament.config.players, newPlayerId]
    }

    setActiveTournament(prev => prev ? {
      ...prev,
      matches: updatedMatches,
      config: updatedConfig
    } : null)

    setShowAddPlayerToByeModal(false)
    setSelectedByeMatchId(null)
    setByeSelectedPlayerId(null)
    setByeNewPlayerName('')
    setByeSearchQuery('')
    haptic('success')

    const { error } = await supabase.from('tournaments').update({
      matches: updatedMatches,
      config: updatedConfig
    }).eq('id', activeTournament.id)

    if (error) {
      alert('Error adding player to bracket: ' + error.message)
      fetchData()
    }
  }

  const handleConfirmAddPlayerToBye = async () => {
    if (!selectedByeMatchId) return
    let targetPlayerId = byeSelectedPlayerId

    if (byeActiveTab === 'new') {
      const name = byeNewPlayerName.trim()
      if (!name) return
      const newId = Math.random().toString(36).substring(2, 9)
      const newPlayer: Player = { id: newId, name, wins: 0, losses: 0, earnings: 0, history: [], status: 'coming' }
      setPlayers(prev => ({ ...prev, [newId]: newPlayer }))
      await supabase.from('players').insert(newPlayer)
      targetPlayerId = newId
    } else {
      if (!targetPlayerId) return
      if (players[targetPlayerId]?.status !== 'coming') {
        await supabase.from('players').update({ status: 'coming' }).eq('id', targetPlayerId)
        setPlayers(prev => ({ ...prev, [targetPlayerId!]: { ...prev[targetPlayerId!], status: 'coming' } }))
      }
    }

    if (targetPlayerId) {
      await handleAddPlayerToBye(selectedByeMatchId, targetPlayerId)
    }
  }

  // Attendance and Player Status
  const handleSetStatus = async (id: string, status: Player['status']) => {
    const p = players[id]
    if (!p) return
    haptic('light')
    const nextStatus = p.status === status ? null : status
    await supabase.from('players').update({ status: nextStatus }).eq('id', id)
    setPlayers(prev => ({ ...prev, [id]: { ...p, status: nextStatus } }))
  }

  const submitLogin = () => {
    if (loginCode.trim().toLowerCase() === 'bacon') {
      setIsAdmin(true)
      setLoginCode('')
      haptic('success')
    } else {
      alert('Wrong code!')
    }
  }

  const resetAllAttendance = async () => {
    if (!isAdmin) return
    if (!confirm("Clear attendance (Coming / Out status) for all players? All player stats, wins, and earnings will remain untouched.")) return
    const { error } = await supabase.from('players').update({ status: null }).neq('id', '_')
    if (error) alert('Error clearing attendance: ' + error.message)
    else fetchData()
  }

  const resetAllStats = async () => {
    if (!isAdmin) return
    const { error } = await supabase.from('players').update({ 
      wins: 0, 
      losses: 0, 
      earnings: 0, 
      history: [] 
    }).neq('id', '_')
    if (error) alert('Error resetting stats: ' + error.message)
    else fetchData()
  }

  const addPlayer = async (name: string) => {
    if (!name.trim()) return
    const id = Math.random().toString(36).substring(2, 9)
    const newPlayer: Player = { id, name: name.trim(), wins: 0, losses: 0, earnings: 0, history: [], status: null }
    setPlayers(prev => ({ ...prev, [id]: newPlayer }))
    setNewPlayerName('')
    await supabase.from('players').insert(newPlayer)
    haptic('success')
  }

  const deletePlayer = async (id: string) => {
    const { error } = await supabase.from('players').delete().eq('id', id)
    if (error) alert('Error deleting: ' + error.message)
    else fetchData()
    setConfirmDeletePlayerId(null)
  }

  // --- PLAYER MANAGEMENT: EDIT STATS & MERGE PROFILES ---
  const handleSavePlayerStats = async (updated: {
    id: string;
    name: string;
    wins: number;
    losses: number;
    earnings: number;
    status: 'coming' | 'out' | null;
  }) => {
    if (!updated.name.trim()) return
    haptic('success')
    const { error } = await supabase.from('players').update({
      name: updated.name.trim(),
      wins: Math.max(0, updated.wins || 0),
      losses: Math.max(0, updated.losses || 0),
      earnings: Math.max(0, updated.earnings || 0),
      status: updated.status
    }).eq('id', updated.id)

    if (error) {
      alert('Error updating player stats: ' + error.message)
    } else {
      setPlayers(prev => ({
        ...prev,
        [updated.id]: {
          ...prev[updated.id],
          name: updated.name.trim(),
          wins: Math.max(0, updated.wins || 0),
          losses: Math.max(0, updated.losses || 0),
          earnings: Math.max(0, updated.earnings || 0),
          status: updated.status
        }
      }))
      setEditingPlayerStats(null)
    }
  }

  const handleMergeProfiles = async (primaryId: string, secondaryId: string) => {
    if (!primaryId || !secondaryId || primaryId === secondaryId) {
      return alert('Please select two distinct player profiles to merge.')
    }
    const primary = players[primaryId]
    const secondary = players[secondaryId]
    if (!primary || !secondary) return

    setIsMerging(true)
    try {
      // 1. Calculate merged stats
      const combinedWins = (primary.wins || 0) + (secondary.wins || 0)
      const combinedLosses = (primary.losses || 0) + (secondary.losses || 0)
      const combinedEarnings = (primary.earnings || 0) + (secondary.earnings || 0)

      // Merge match history: replace occurrences of secondaryId with primaryId
      const cleanSecondaryHistory = (secondary.history || []).map(h => {
        if (h.startsWith(primaryId + ':')) return null // Skip internal self-matches
        return h
      }).filter(Boolean) as string[]

      const combinedHistory = [...(primary.history || []), ...cleanSecondaryHistory]

      // 2. Rewrite match history of all other players referencing secondaryId
      const otherPlayerUpdates = Object.values(players)
        .filter(p => p.id !== primaryId && p.id !== secondaryId && (p.history || []).some(h => h.startsWith(secondaryId + ':')))
        .map(async p => {
          const rewritten = (p.history || []).map(h => {
            if (h.startsWith(secondaryId + ':')) {
              return h.replace(secondaryId + ':', primaryId + ':')
            }
            return h
          })
          return supabase.from('players').update({ history: rewritten }).eq('id', p.id)
        })

      await Promise.all(otherPlayerUpdates)

      // 3. Rewrite active and past tournaments
      const { data: allTourneys } = await supabase.from('tournaments').select('*')
      if (allTourneys && allTourneys.length > 0) {
        const tourneyUpdates = allTourneys.map(async t => {
          let modified = false
          const pList = (t.config?.players || []).map((id: string) => {
            if (id === secondaryId) {
              modified = true
              return primaryId
            }
            return id
          })
          // Deduplicate players list
          const uniquePlayers = Array.from(new Set(pList))

          const updatedMatches = (t.matches || []).map((m: Match) => {
            let mMod = false
            let p1 = m.player1Id
            let p2 = m.player2Id
            let win = m.winnerId

            if (p1 === secondaryId) { p1 = primaryId; mMod = true; }
            if (p2 === secondaryId) { p2 = primaryId; mMod = true; }
            if (win === secondaryId) { win = primaryId; mMod = true; }

            if (mMod) {
              modified = true
              return { ...m, player1Id: p1, player2Id: p2, winnerId: win }
            }
            return m
          })

          if (modified) {
            return supabase.from('tournaments').update({
              config: { ...t.config, players: uniquePlayers },
              matches: updatedMatches
            }).eq('id', t.id)
          }
          return null
        })
        await Promise.all(tourneyUpdates)
      }

      // 4. Update primary player in Supabase
      await supabase.from('players').update({
        wins: combinedWins,
        losses: combinedLosses,
        earnings: combinedEarnings,
        history: combinedHistory
      }).eq('id', primaryId)

      // 5. Delete secondary player
      await supabase.from('players').delete().eq('id', secondaryId)

      haptic('success')
      setShowMergeModal(false)
      setMergePrimaryId('')
      setMergeSecondaryId('')
      await fetchData()
      alert(`Successfully merged "${secondary.name}" into "${primary.name}"! All records updated.`)
    } catch (err: any) {
      console.error("Error merging profiles:", err)
      alert("Error merging profiles: " + err.message)
    } finally {
      setIsMerging(false)
    }
  }

  // --- TOURNAMENT CREATION ---
  const handleStartTournament = async () => {
    if (config.players.length < 2) return alert('Select at least 2 players')
    
    // Deactivate any existing active tournaments first
    await supabase.from('tournaments').update({ is_active: false }).eq('is_active', true)

    const matches = generateBracket(config, players)
    const newId = Date.now().toString()
    const entryFee = getTournamentEntryFee(config)
    const normalizedConfig: TournamentConfig = {
      ...config,
      entryFee
    }

    const { data, error } = await supabase.from('tournaments').insert({
      id: newId,
      config: normalizedConfig,
      matches: matches,
      is_active: true
    }).select()

    if (error) alert(`Error starting: ${error.message} (ID: ${newId})`)
    else if (data) {
      setActiveTournament({ config: normalizedConfig, matches, id: data[0].id, created_at: data[0].created_at })
      setView('bracket')
    }
  }

  const quickStartComing = async () => {
    const comingIds = Object.values(players).filter(p => p.status === 'coming').map(p => p.id);
    if (comingIds.length < 2) return alert('At least 2 players must be marked as "Coming" (green)');
    
    await supabase.from('tournaments').update({ is_active: false }).eq('is_active', true)

    const entryFee = getTournamentEntryFee(config)
    const newConfig: TournamentConfig = { ...config, players: comingIds, entryFee }
    const matches = generateBracket(newConfig, players);
    const newId = Date.now().toString()
    const { data, error } = await supabase.from('tournaments').insert({
      id: newId,
      config: newConfig,
      matches,
      is_active: true
    }).select();
    if (error) alert(`Error starting: ${error.message} (ID: ${newId})`);
    else if (data) {
      setActiveTournament({ config: newConfig, matches, id: data[0].id, created_at: data[0].created_at });
      setView('bracket');
    }
  }

  const quickStartLast = async () => {
    const { data: tData } = await supabase.from('tournaments').select('config').order('created_at', { ascending: false }).limit(1);
    if (tData && tData[0]?.config?.players) {
      const lastIds = tData[0].config.players;

      await supabase.from('tournaments').update({ is_active: false }).eq('is_active', true)

      const entryFee = getTournamentEntryFee(config)
      const newConfig: TournamentConfig = { ...config, players: lastIds, entryFee }
      const matches = generateBracket(newConfig, players);
      const { data: nData, error } = await supabase.from('tournaments').insert({
        id: Date.now().toString(),
        config: newConfig,
        matches,
        is_active: true
      }).select();
      if (error) alert(error.message);
      else if (nData) {
        setActiveTournament({ config: newConfig, matches: matches, id: nData[0].id, created_at: nData[0].created_at });
        setView('bracket');
      }
    } else {
      alert("No previous tournament found.");
    }
  }

  // --- MATCH PROGRESSION & STAT RECORDING ---
  const handleMatchClick = (match: Match, winnerId: string, tourney = activeTournament) => {
    const isPast = tourney?.id !== activeTournament?.id;
    const isAdminLocal = isAdmin;
    if (!isAdminLocal) {
      if (match.player1Id && match.player2Id) {
        setShowRivalryMatch(match)
        haptic('light')
      }
      return
    }
    if (match.winnerId) return;
    if (tourney?.config.type === 'best_of_three') {
      setShowScoreModal({ matchId: match.id, winnerId, isPastTourney: isPast })
    } else {
      if (isPast) {
        handleAdvancePastTournament(tourney, match.id, winnerId, '1-0')
      } else {
        handleAdvance(match.id, winnerId, '1-0')
      }
    }
  }

  const handleAdvance = async (matchId: string, winnerId: string, score: string) => {
    if (!activeTournament) return
    const match = activeTournament.matches.find(m => m.id === matchId)
    if (!match || match.winnerId) return

    const finalMatch = activeTournament.matches.find(m => m.nextMatchId === null && !m.isConsolation)
    const isSemifinal = finalMatch && match.nextMatchId === finalMatch.id
    const loserId = winnerId === match.player1Id ? match.player2Id : match.player1Id

    const updatedMatches = activeTournament.matches.map(m => {
      if (m.id === matchId) return { ...m, winnerId, score }
      if (m.id === match.nextMatchId) {
        if (match.order % 2 === 0) return { ...m, player1Id: winnerId }
        return { ...m, player2Id: winnerId }
      }
      if (isSemifinal && m.isConsolation) {
        if (match.order % 2 === 0) return { ...m, player1Id: loserId }
        return { ...m, player2Id: loserId }
      }
      return m
    })
    
    setActiveTournament(prev => prev ? { ...prev, matches: updatedMatches } : null)
    haptic('medium')

    const { error } = await supabase.from('tournaments').update({ matches: updatedMatches }).eq('id', activeTournament.id)
    if (error) {
      alert('Error updating bracket: ' + error.message)
      fetchData()
    }

    if (match.player1Id && match.player2Id) {
      const p1 = players[match.player1Id]
      const p2 = players[match.player2Id]
      if (p1 && p2) {
        const p1Won = winnerId === p1.id
        const p2Won = winnerId === p2.id
        await Promise.all([
          supabase.from('players').update({ 
            history: [...(p1.history || []), `${p2.id}:${p1Won ? 'W' : 'L'}`],
            losses: (p1.losses || 0) + (p1Won ? 0 : 1)
          }).eq('id', p1.id),
          supabase.from('players').update({ 
            history: [...(p2.history || []), `${p1.id}:${p2Won ? 'W' : 'L'}`],
            losses: (p2.losses || 0) + (p2Won ? 0 : 1)
          }).eq('id', p2.id)
        ])
        setPlayers(prev => ({
          ...prev,
          [p1.id]: { ...p1, history: [...(p1.history || []), `${p2.id}:${p1Won ? 'W' : 'L'}`], losses: (p1.losses || 0) + (p1Won ? 0 : 1) },
          [p2.id]: { ...p2, history: [...(p2.history || []), `${p1.id}:${p2Won ? 'W' : 'L'}`], losses: (p2.losses || 0) + (p2Won ? 0 : 1) }
        }))
      }
    }
  }

  const handleUndo = async (matchId: string) => {
    if (!activeTournament) return
    const match = activeTournament.matches.find(m => m.id === matchId)
    if (!match || !match.winnerId) return

    const winnerId = match.winnerId
    const finalMatch = activeTournament.matches.find(m => m.nextMatchId === null && !m.isConsolation)
    const isSemifinal = finalMatch && match.nextMatchId === finalMatch.id

    const updatedMatches = activeTournament.matches.map(m => {
      if (m.id === matchId) return { ...m, winnerId: null, score: null }
      if (m.id === match.nextMatchId) {
        if (m.player1Id === winnerId) return { ...m, player1Id: null }
        if (m.player2Id === winnerId) return { ...m, player2Id: null }
      }
      if (isSemifinal && m.isConsolation) {
        if (match.order % 2 === 0) {
          return { ...m, player1Id: null, winnerId: null, score: null }
        } else {
          return { ...m, player2Id: null, winnerId: null, score: null }
        }
      }
      return m
    })

    setActiveTournament(prev => prev ? { ...prev, matches: updatedMatches } : null)
    haptic('medium')

    const { error } = await supabase.from('tournaments').update({ matches: updatedMatches }).eq('id', activeTournament.id)
    if (error) {
      alert('Error undoing: ' + error.message)
      fetchData()
    }
    setShowOptions(null)
  }

  // --- PAST TOURNAMENT MATCH ADVANCE & UNDO (WITH STAT SYNC) ---
  const handleAdvancePastTournament = async (tourney: any, matchId: string, winnerId: string, score: string) => {
    const match = tourney.matches.find((m: Match) => m.id === matchId)
    if (!match || match.winnerId) return

    const finalMatch = tourney.matches.find((m: Match) => m.nextMatchId === null && !m.isConsolation)
    const isChampionship = finalMatch && match.id === finalMatch.id
    const isSemifinal = finalMatch && match.nextMatchId === finalMatch.id
    const loserId = winnerId === match.player1Id ? match.player2Id : match.player1Id

    const updatedMatches = tourney.matches.map((m: Match) => {
      if (m.id === matchId) return { ...m, winnerId, score }
      if (m.id === match.nextMatchId) {
        if (match.order % 2 === 0) return { ...m, player1Id: winnerId }
        return { ...m, player2Id: winnerId }
      }
      if (isSemifinal && m.isConsolation) {
        if (match.order % 2 === 0) return { ...m, player1Id: loserId }
        return { ...m, player2Id: loserId }
      }
      return m
    })

    const updatedTourney = { ...tourney, matches: updatedMatches }
    setViewingPastTourney(updatedTourney)
    haptic('medium')

    await supabase.from('tournaments').update({ matches: updatedMatches }).eq('id', tourney.id)

    // Update match history and losses for active players
    if (match.player1Id && match.player2Id) {
      const p1 = players[match.player1Id]
      const p2 = players[match.player2Id]
      if (p1 && p2) {
        const p1Won = winnerId === p1.id
        const p2Won = winnerId === p2.id
        await Promise.all([
          supabase.from('players').update({ 
            history: [...(p1.history || []), `${p2.id}:${p1Won ? 'W' : 'L'}`],
            losses: (p1.losses || 0) + (p1Won ? 0 : 1)
          }).eq('id', p1.id),
          supabase.from('players').update({ 
            history: [...(p2.history || []), `${p1.id}:${p2Won ? 'W' : 'L'}`],
            losses: (p2.losses || 0) + (p2Won ? 0 : 1)
          }).eq('id', p2.id)
        ])
      }
    }

    // If championship match was played, award the tournament win and payout
    if (isChampionship) {
      const entryFee = getTournamentEntryFee(tourney.config)
      const pot = tourney.config.players.length * entryFee
      const payouts = calculatePayouts(pot, tourney.config.addedCash, tourney.config.payoutSplits)
      const winner = players[winnerId]
      if (winner) {
        await supabase.from('players').update({
          wins: (winner.wins || 0) + 1,
          earnings: (winner.earnings || 0) + (payouts[0] || 0)
        }).eq('id', winnerId)
      }
    }

    fetchData()
  }

  const handleUndoPastTournament = async (matchId: string) => {
    if (!viewingPastTourney) return
    const match = viewingPastTourney.matches.find((m: Match) => m.id === matchId)
    if (!match || !match.winnerId) return

    const winnerId = match.winnerId
    const finalMatch = viewingPastTourney.matches.find((m: Match) => m.nextMatchId === null && !m.isConsolation)
    const isChampionship = finalMatch && match.id === finalMatch.id
    const isSemifinal = finalMatch && match.nextMatchId === finalMatch.id

    const updatedMatches = viewingPastTourney.matches.map((m: Match) => {
      if (m.id === matchId) return { ...m, winnerId: null, score: null }
      if (m.id === match.nextMatchId) {
        if (m.player1Id === winnerId) return { ...m, player1Id: null }
        if (m.player2Id === winnerId) return { ...m, player2Id: null }
      }
      if (isSemifinal && m.isConsolation) {
        if (match.order % 2 === 0) {
          return { ...m, player1Id: null, winnerId: null, score: null }
        } else {
          return { ...m, player2Id: null, winnerId: null, score: null }
        }
      }
      return m
    })

    const updatedTourney = { ...viewingPastTourney, matches: updatedMatches }
    setViewingPastTourney(updatedTourney)
    haptic('medium')

    await supabase.from('tournaments').update({ matches: updatedMatches }).eq('id', viewingPastTourney.id)

    // Rollback championship win/payout if it was championship
    if (isChampionship) {
      const entryFee = getTournamentEntryFee(viewingPastTourney.config)
      const pot = viewingPastTourney.config.players.length * entryFee
      const payouts = calculatePayouts(pot, viewingPastTourney.config.addedCash, viewingPastTourney.config.payoutSplits)
      const winner = players[winnerId]
      if (winner) {
        await supabase.from('players').update({
          wins: Math.max(0, (winner.wins || 0) - 1),
          earnings: Math.max(0, (winner.earnings || 0) - (payouts[0] || 0))
        }).eq('id', winnerId)
      }
    }

    setShowPastOptions(null)
    fetchData()
  }

  // --- FINISH ACTIVE TOURNAMENT ---
  const handleFinishTournament = async () => {
    if (!activeTournament) return
    const finalMatch = activeTournament.matches.find(m => m.nextMatchId === null && !m.isConsolation)
    if (!finalMatch || !finalMatch.winnerId) return
    
    const entryFee = getTournamentEntryFee(activeTournament.config)
    const totalPot = (activeTournament.config.players.length * entryFee)
    const payouts = calculatePayouts(totalPot, activeTournament.config.addedCash, activeTournament.config.payoutSplits)

    const winnerId = finalMatch.winnerId
    const winner = players[winnerId]
    
    const tUpdate = supabase.from('tournaments').update({ is_active: false }).eq('id', activeTournament.id)

    if (winner) {
      const pUpdate = supabase.from('players').update({
        wins: (winner.wins || 0) + 1,
        earnings: (winner.earnings || 0) + (payouts[0] || 0)
      }).eq('id', winnerId)

      try {
        await Promise.all([tUpdate, pUpdate])
      } catch (err) {
        console.error("Error finalizing tournament:", err)
      }
      setShowFinishSummary({ winner: winner.name, payout: payouts[0] || 0 })
    } else {
      try {
        await tUpdate
      } catch (err) {
        console.error("Error finalizing tournament:", err)
      }
      setShowFinishSummary({ winner: winnerId, payout: payouts[0] || 0 })
    }

    setActiveTournament(null)
    haptic('success')
    setView('home')
  }

  // --- ACTIVE & PAST TOURNAMENT CONFIG EDITING (WITH PAYOUT STAT SYNC) ---
  const handleSaveActiveTourneyConfig = async (newFee: number, newCash: number) => {
    if (!activeTournament) return
    haptic('success')
    const updatedConfig: TournamentConfig = {
      ...activeTournament.config,
      entryFee: Math.max(0, newFee),
      addedCash: Math.max(0, newCash)
    }

    setActiveTournament(prev => prev ? { ...prev, config: updatedConfig } : null)
    setEditingActiveTourneyConfig(false)

    const { error } = await supabase.from('tournaments').update({ config: updatedConfig }).eq('id', activeTournament.id)
    if (error) {
      alert('Error updating bracket settings: ' + error.message)
      fetchData()
    }
  }

  const handleSavePastTourneyConfig = async (form: {
    id: string;
    entryFee: number;
    addedCash: number;
    customLabel: string;
    payoutPlaces: number;
    payoutSplits: number[];
  }) => {
    const oldTourney = pastTournaments.find(t => t.id === form.id)
    if (!oldTourney) return
    haptic('success')

    // 1. Calculate old payouts
    const oldEntryFee = getTournamentEntryFee(oldTourney.config)
    const oldPot = oldTourney.config.players.length * oldEntryFee
    const oldPayouts = calculatePayouts(oldPot, oldTourney.config.addedCash, oldTourney.config.payoutSplits)

    // 2. Calculate new payouts
    const newEntryFee = Math.max(0, form.entryFee)
    const newAddedCash = Math.max(0, form.addedCash)
    const newPot = oldTourney.config.players.length * newEntryFee
    const newPayouts = calculatePayouts(newPot, newAddedCash, form.payoutSplits)

    const finalMatch = oldTourney.matches?.find((m: any) => m.nextMatchId === null && !m.isConsolation)
    const winnerId = finalMatch?.winnerId

    // 3. If there was a completed winner, reconcile the earnings delta
    if (winnerId && players[winnerId]) {
      const delta1st = (newPayouts[0] || 0) - (oldPayouts[0] || 0)
      if (delta1st !== 0) {
        const newEarnings = Math.max(0, (players[winnerId].earnings || 0) + delta1st)
        await supabase.from('players').update({ earnings: newEarnings }).eq('id', winnerId)
      }
    }

    const updatedConfig: TournamentConfig = {
      ...oldTourney.config,
      entryFee: newEntryFee,
      addedCash: newAddedCash,
      customLabel: form.customLabel.trim() || undefined,
      payoutPlaces: form.payoutPlaces,
      payoutSplits: form.payoutSplits
    }

    const { error } = await supabase.from('tournaments').update({ config: updatedConfig }).eq('id', form.id)
    if (error) {
      alert('Error updating tournament: ' + error.message)
    } else {
      setEditingPastTourneyConfig(null)
      if (viewingPastTourney && viewingPastTourney.id === form.id) {
        setViewingPastTourney({ ...viewingPastTourney, config: updatedConfig })
      }
      await fetchData()
    }
  }

  // --- DELETE PAST TOURNAMENT (WITH STAT ROLLBACK) ---
  const handleDeletePastTournament = async (tourney: any, rollback: boolean) => {
    if (!tourney) return
    haptic('heavy')

    if (rollback) {
      // 1. Rollback championship winner stats
      const finalMatch = tourney.matches?.find((m: any) => m.nextMatchId === null && !m.isConsolation)
      const winnerId = finalMatch?.winnerId
      if (winnerId && players[winnerId]) {
        const fee = getTournamentEntryFee(tourney.config)
        const pot = tourney.config.players.length * fee
        const payouts = calculatePayouts(pot, tourney.config.addedCash, tourney.config.payoutSplits)
        const firstPayout = payouts[0] || 0

        const newWins = Math.max(0, (players[winnerId].wins || 0) - 1)
        const newEarnings = Math.max(0, (players[winnerId].earnings || 0) - firstPayout)
        await supabase.from('players').update({ wins: newWins, earnings: newEarnings }).eq('id', winnerId)
      }

      // 2. Rollback match losses from played matches in this tournament
      const completedMatches = (tourney.matches || []).filter((m: Match) => m.winnerId && m.score !== 'BYE' && m.player1Id && m.player2Id)
      for (const m of completedMatches) {
        const loserId = m.winnerId === m.player1Id ? m.player2Id! : m.player1Id!
        if (players[loserId]) {
          const currentLosses = players[loserId].losses || 0
          await supabase.from('players').update({ losses: Math.max(0, currentLosses - 1) }).eq('id', loserId)
        }
      }
    }

    const { error } = await supabase.from('tournaments').delete().eq('id', tourney.id)
    if (error) {
      alert('Error deleting tournament: ' + error.message)
    } else {
      setConfirmDeleteTourney(null)
      if (viewingPastTourney && viewingPastTourney.id === tourney.id) {
        setViewingPastTourney(null)
      }
      await fetchData()
    }
  }

  // --- BRACKET RENDERING ---
  const renderMatch = (match: Match, tourney = activeTournament) => {
    const isPast = tourney?.id !== activeTournament?.id;
    const isAdminLocal = isAdmin;
    let pressTimer: ReturnType<typeof setTimeout>;

    const matches = tourney?.matches || []
    const rounds = Array.from(new Set(matches.map(m => m.round))).sort((a, b) => a - b)
    const maxRound = rounds.length > 0 ? rounds[rounds.length - 1] : 0
    const isFinal = match.round === maxRound && !match.isConsolation && match.round > 1

    const getHeatStyle = (playerId: string | null) => {
      if (!playerId) return {}
      const p = players[playerId]
      if (!p) return {}
      const wins = p.wins || 0
      if (wins < 5) return {}
      const total = wins + (p.losses || 0)
      const rate = wins / total
      if (rate >= 0.8) return { background: 'rgba(245, 158, 11, 0.1)', borderLeft: '3px solid var(--accent)' }
      if (rate >= 0.6) return { background: 'rgba(16, 185, 129, 0.05)', borderLeft: '3px solid var(--primary)' }
      return {}
    }
    
    const startPress = () => {
      pressTimer = setTimeout(() => {
        if (match.winnerId && isAdminLocal) {
          if (isPast) setShowPastOptions(match.id)
          else setShowOptions(match.id)
        }
      }, 600);
    };
    const endPress = () => clearTimeout(pressTimer);

    const isP1SwapSelected = swapSelection?.matchId === match.id && swapSelection?.slot === 'p1'
    const isP2SwapSelected = swapSelection?.matchId === match.id && swapSelection?.slot === 'p2'

    const nextMatchNode = match.nextMatchId ? tourney?.matches.find(nm => nm.id === match.nextMatchId) : null
    const nextRoundHasNotPlayed = !nextMatchNode || nextMatchNode.winnerId === null
    const isP1AvailableBye = match.round === 1 && !match.player1Id && match.score === 'BYE' && !isPast && isAdmin && nextRoundHasNotPlayed
    const isP2AvailableBye = match.round === 1 && !match.player2Id && match.score === 'BYE' && !isPast && isAdmin && nextRoundHasNotPlayed

    const handleSlotClick = (slot: 'p1' | 'p2', playerId: string | null) => {
      if (!isPast && !tourneyHasStarted && isAdmin && isSwapMode && playerId && match.round === 1) {
        if (!swapSelection) {
          setSwapSelection({ matchId: match.id, slot, playerId })
          haptic('light')
          return
        }
        if (swapSelection.matchId === match.id && swapSelection.slot === slot) {
          setSwapSelection(null)
          haptic('light')
          return
        }
        setConfirmSwap({
          slotA: swapSelection,
          slotB: { matchId: match.id, slot, playerId }
        })
        return
      }

      if (playerId) {
        handleMatchClick(match, playerId, tourney)
      }
    }

    return (
      <div key={match.id} className="match-node">
        <div className={`match-card ${isFinal ? 'final-match' : ''}`}>
          <div 
            className={`player-slot ${match.winnerId === match.player1Id ? 'winner' : ''} ${!match.player1Id && match.score === 'BYE' ? 'bye' : ''}`}
            style={{
              ...getHeatStyle(match.player1Id),
              ...(isP1SwapSelected ? { outline: '2px solid var(--accent)', boxShadow: '0 0 12px rgba(245, 158, 11, 0.7)', background: 'rgba(245, 158, 11, 0.15)' } : {}),
              ...(isP1AvailableBye ? { cursor: 'pointer' } : {})
            }}
            onMouseDown={startPress}
            onMouseUp={endPress}
            onTouchStart={startPress}
            onTouchEnd={endPress}
            onClick={() => {
              if (isP1AvailableBye) {
                setSelectedByeMatchId(match.id)
                setShowAddPlayerToByeModal(true)
                return
              }
              handleSlotClick('p1', match.player1Id)
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', width: '100%', minWidth: 0, gap: '4px' }}>
              <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {match.player1Id ? players[match.player1Id]?.name : (
                  match.score === 'BYE' ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <span style={{ fontStyle: 'italic', opacity: 0.7 }}>BYE</span>
                      {isP1AvailableBye && (
                        <span style={{ fontSize: '0.65rem', color: 'var(--accent)', fontWeight: 800, background: 'rgba(245, 158, 11, 0.15)', padding: '0.05rem 0.35rem', borderRadius: '0.25rem', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                          + ADD
                        </span>
                      )}
                    </span>
                  ) : '----'
                )}
              </span>
              {match.winnerId === match.player1Id && <span className="match-score" style={{ flexShrink: 0, whiteSpace: 'nowrap', fontSize: '0.7rem', margin: 0 }}>{match.score}</span>}
              {match.player1Id && players[match.player1Id] && ((players[match.player1Id].wins || 0) + (players[match.player1Id].losses || 0) > 0) && (
                <span style={{ flexShrink: 0, fontSize: '0.55rem', opacity: 0.4, fontWeight: 800, fontFamily: 'monospace' }}>
                  {(((players[match.player1Id].wins || 0) / ((players[match.player1Id].wins || 0) + (players[match.player1Id].losses || 0))) * 100).toFixed(0)}%
                </span>
              )}
            </div>
          </div>
          <div 
            className={`player-slot ${match.winnerId === match.player2Id ? 'winner' : ''} ${!match.player2Id && match.score === 'BYE' ? 'bye' : ''}`}
            style={{
              ...getHeatStyle(match.player2Id),
              ...(isP2SwapSelected ? { outline: '2px solid var(--accent)', boxShadow: '0 0 12px rgba(245, 158, 11, 0.7)', background: 'rgba(245, 158, 11, 0.15)' } : {}),
              ...(isP2AvailableBye ? { cursor: 'pointer' } : {})
            }}
            onMouseDown={startPress}
            onMouseUp={endPress}
            onTouchStart={startPress}
            onTouchEnd={endPress}
            onClick={() => {
              if (isP2AvailableBye) {
                setSelectedByeMatchId(match.id)
                setShowAddPlayerToByeModal(true)
                return
              }
              handleSlotClick('p2', match.player2Id)
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', width: '100%', minWidth: 0, gap: '4px' }}>
              <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {match.player2Id ? players[match.player2Id]?.name : (
                  match.score === 'BYE' ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <span style={{ fontStyle: 'italic', opacity: 0.7 }}>BYE</span>
                      {isP2AvailableBye && (
                        <span style={{ fontSize: '0.65rem', color: 'var(--accent)', fontWeight: 800, background: 'rgba(245, 158, 11, 0.15)', padding: '0.05rem 0.35rem', borderRadius: '0.25rem', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                          + ADD
                        </span>
                      )}
                    </span>
                  ) : '----'
                )}
              </span>
              {match.winnerId === match.player2Id && <span className="match-score" style={{ flexShrink: 0, whiteSpace: 'nowrap', fontSize: '0.7rem', margin: 0 }}>{match.score}</span>}
              {match.player2Id && players[match.player2Id] && ((players[match.player2Id].wins || 0) + (players[match.player2Id].losses || 0) > 0) && (
                <span style={{ flexShrink: 0, fontSize: '0.55rem', opacity: 0.4, fontWeight: 800, fontFamily: 'monospace' }}>
                  {(((players[match.player2Id].wins || 0) / ((players[match.player2Id].wins || 0) + (players[match.player2Id].losses || 0))) * 100).toFixed(0)}%
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderBracket = (tourney = activeTournament) => {
    if (!tourney) return null
    const matches = tourney.matches
    const rounds = Array.from(new Set(matches.map(m => m.round))).sort((a, b) => a - b)
    const totalRounds = rounds.length
    const finalRound = rounds[totalRounds - 1]

    const leftMatches = matches.filter(m => m.round < finalRound && m.order < Math.pow(2, totalRounds - m.round - 1))
    const rightMatches = matches.filter(m => m.round < finalRound && m.order >= Math.pow(2, totalRounds - m.round - 1))
    const centerMatch = matches.find(m => m.round === finalRound && !m.isConsolation)
    const consolationMatch = matches.find(m => m.isConsolation)

    const roundStyle = { minWidth: `${plateWidth}px` }
    const centerWidth = Math.max(160, plateWidth * 1.2)

    const playerCount = (tourney.config.players || []).length
    const roundsCount = Math.ceil(Math.log2(playerCount || 2))
    const initialScale = roundsCount > 4 ? 0.35 : (roundsCount > 3 ? 0.45 : 0.6)

    return (
      <TransformWrapper
        initialScale={initialScale}
        minScale={initialScale * 0.5}
        maxScale={2}
        centerOnInit={true}
        centerZoomedOut={true}
        limitToBounds={true}
      >
        {() => (
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <TransformComponent wrapperStyle={{ width: '100vw', height: '100vh' }}>
                <div className="bracket-container">
                  <div className="bracket-side">
                    {rounds.slice(0, -1).map(round => (
                      <div key={`left-${round}`} className="bracket-round" style={roundStyle}>
                        <span className="stat-label" style={{ textAlign: 'center', marginBottom: '0.5rem' }}>Round {round}</span>
                        {leftMatches.filter(m => m.round === round).sort((a, b) => a.order - b.order).map(m => renderMatch(m, tourney))}
                      </div>
                    ))}
                  </div>

                  <div className="bracket-center" style={{ minWidth: `${centerWidth}px` }}>
                    <span className="stat-label" style={{ color: 'var(--accent)', fontWeight: 800, letterSpacing: '0.1em' }}>CHAMPIONSHIP</span>
                    {centerMatch && <div style={{ width: '100%' }}>{renderMatch(centerMatch, tourney)}</div>}
                    {consolationMatch && (
                      <div style={{ width: '150px', marginTop: '2rem' }}>
                        <span className="stat-label" style={{ display: 'block', textAlign: 'center', marginBottom: '0.4rem' }}>3rd Place Match</span>
                        {renderMatch(consolationMatch, tourney)}
                      </div>
                    )}
                  </div>

                  <div className="bracket-side right">
                    {rounds.slice(0, -1).map(round => (
                      <div key={`right-${round}`} className="bracket-round" style={roundStyle}>
                        <span className="stat-label" style={{ textAlign: 'center', marginBottom: '0.5rem' }}>Round {round}</span>
                        {rightMatches.filter(m => m.round === round).sort((a, b) => a.order - b.order).map(m => renderMatch(m, tourney))}
                      </div>
                    ))}
                  </div>
                </div>
              </TransformComponent>
            </div>
          </div>
        )}
      </TransformWrapper>
    )
  }

  return (
    <div className="app-container">
      <main style={{ paddingBottom: '80px' }}>
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {activeTournament && (
                <div className="card" style={{ border: '1px solid var(--primary)', marginBottom: '1rem', background: 'rgba(16, 185, 129, 0.1)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 800, background: 'var(--primary)', color: 'white', padding: '0.1rem 0.4rem', borderRadius: '0.3rem' }}>ACTIVE</span>
                        <h3 style={{ margin: 0, fontSize: '0.95rem' }}>{getTournamentLabel(activeTournament, allTournamentsList)}</h3>
                      </div>
                      <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.7rem', opacity: 0.7 }}>
                        {activeTournament.config.players.length} Players • ${getTournamentEntryFee(activeTournament.config)} Buy-in • ${activeTournament.config.addedCash} Added
                      </p>
                    </div>
                    <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.7rem' }} onClick={handleOpenBracket}>RESUME</button>
                  </div>
                </div>
              )}
              
              <div className="card">
                <div className="card-title" style={{ margin: 0 }}><UserPlus size={20} className="accent-text" /> Coming Today ({Object.values(players).filter(p => p.status === 'coming').length})</div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                  {Object.values(players).filter(p => p.status === 'coming').sort((a, b) => a.name.localeCompare(b.name)).map(p => (
                    <span key={p.id} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 600, border: '1px solid rgba(16, 185, 129, 0.2)' }}>{p.name}</span>
                  ))}
                  {Object.values(players).filter(p => p.status === 'coming').length === 0 && <p style={{ opacity: 0.5, fontSize: '0.8rem' }}>No players registered for tonight yet.</p>}
                </div>
              </div>

              {/* Tonight's Buy-in Ledger Card */}
              {Object.values(playersOwedMap).some(owed => owed > 0) && (
                <div className="card">
                  {(() => {
                    const totalPot = Object.values(playersOwedMap).reduce((sum, val) => sum + val, 0)
                    const collected = Object.entries(playersOwedMap)
                      .filter(([pId]) => paidTonight.includes(pId))
                      .reduce((sum, [_, val]) => sum + val, 0)
                    const outstanding = totalPot - collected
                    
                    return (
                      <>
                        <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: 0 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Coins size={20} className="accent-text" /> Tonight's Buy-ins
                          </span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary)', background: 'rgba(16, 185, 129, 0.1)', padding: '0.2rem 0.6rem', borderRadius: '0.75rem', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                            Total Pot: ${totalPot}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', marginBottom: '0.25rem', fontSize: '0.7rem', fontWeight: 700 }}>
                          <span style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.08)', padding: '0.15rem 0.4rem', borderRadius: '0.25rem', border: '1px solid rgba(16, 185, 129, 0.1)' }}>Collected: ${collected}</span>
                          <span style={{ color: 'var(--accent)', background: 'rgba(245, 158, 11, 0.08)', padding: '0.15rem 0.4rem', borderRadius: '0.25rem', border: '1px solid rgba(245, 158, 11, 0.1)' }}>Outstanding: ${outstanding}</span>
                        </div>
                      </>
                    )
                  })()}
                  
                  {isAdmin && (
                    <p style={{ fontSize: '0.65rem', opacity: 0.5, marginTop: '0.35rem', marginBottom: '0.5rem' }}>
                      💡 Admin Tip: Tap a player to mark them as Paid.
                    </p>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.75rem' }}>
                    {Object.entries(playersOwedMap)
                      .filter(([_, owed]) => owed > 0)
                      .sort((a, b) => b[1] - a[1] || (players[a[0]]?.name || '').localeCompare(players[b[0]]?.name || ''))
                      .map(([pId, owed]) => {
                        const isPaid = paidTonight.includes(pId)
                        return (
                          <div 
                            key={pId} 
                            onClick={() => togglePaidStatus(pId)}
                            style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center', 
                              padding: '0.4rem 0.6rem', 
                              background: isPaid ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255,255,255,0.02)', 
                              borderRadius: '0.5rem', 
                              border: isPaid ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid var(--glass-border)',
                              cursor: isAdmin ? 'pointer' : 'default',
                              opacity: isPaid ? 0.7 : 1,
                              transition: 'all 0.2s'
                            }}
                          >
                            <span style={{ fontWeight: 600, fontSize: '0.85rem', textDecoration: isPaid ? 'line-through' : 'none' }}>
                              {players[pId]?.name || 'Unknown'}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              {isPaid ? (
                                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '0.1rem 0.4rem', borderRadius: '0.25rem' }}>
                                  ✓ PAID
                                </span>
                              ) : (
                                <span style={{ color: 'var(--accent)', fontWeight: 800, fontSize: '0.85rem' }}>
                                  ${owed}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}

              {/* Tournament Creation Card */}
              <div className="card">
                <div className="card-title"><Plus size={20} className="accent-text" /> {activeTournament ? 'Start New Tournament' : 'New Bracket'}</div>
                {activeTournament && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--danger)', marginBottom: '1rem', marginTop: '-0.5rem' }}>
                    Note: Starting a new bracket will replace the current active one.
                  </p>
                )}
                
                {isAdmin ? (
                  <>
                    <div className="option-group">
                      <label>Format</label>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className={`btn ${config.type === 'one_and_done' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }} onClick={() => setConfig({ ...config, type: 'one_and_done', entryFee: config.entryFee || 2 })}>One & Done</button>
                        <button className={`btn ${config.type === 'best_of_three' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }} onClick={() => setConfig({ ...config, type: 'best_of_three', entryFee: config.entryFee || 5 })}>Best of 3</button>
                      </div>
                    </div>

                    <div className="form-grid">
                      <div className="option-group">
                        <label>Entry Fee ($ / Player)</label>
                        <input 
                          type="number" 
                          className="input" 
                          min="0" 
                          value={config.entryFee ?? (config.type === 'one_and_done' ? 2 : 5)} 
                          onChange={e => setConfig({ ...config, entryFee: Math.max(0, parseInt(e.target.value) || 0) })} 
                        />
                      </div>
                      <div className="option-group">
                        <label>Added Cash ($)</label>
                        <input 
                          type="number" 
                          className="input" 
                          min="0" 
                          value={config.addedCash} 
                          onChange={e => setConfig({ ...config, addedCash: Math.max(0, parseInt(e.target.value) || 0) })} 
                        />
                      </div>
                    </div>
                    
                    <div className="option-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <label style={{ margin: 0 }}>Select Players ({config.players.length})</label>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem', maxHeight: '240px', overflowY: 'auto', padding: '0.25rem' }}>
                        {Object.values(players).sort((a, b) => a.name.localeCompare(b.name)).map(p => (
                          <button 
                            key={p.id} 
                            className={`btn ${config.players.includes(p.id) ? 'btn-primary' : 'btn-secondary'}`} 
                            style={{ 
                              padding: '0.45rem 0.25rem', 
                              fontSize: '0.75rem', 
                              fontWeight: 700,
                              whiteSpace: 'nowrap', 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis',
                              textAlign: 'center',
                              display: 'block'
                            }}
                            title={p.name}
                            onClick={() => {
                              const newP = config.players.includes(p.id) ? config.players.filter(id => id !== p.id) : [...config.players, p.id]
                              setConfig({ ...config, players: newP })
                            }}
                          >
                            {p.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', padding: '1rem' }} onClick={handleStartTournament}>
                      START CUSTOM BRACKET <Swords size={18} />
                    </button>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.75rem' }}>
                      <button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.8rem' }} onClick={quickStartComing}>
                        <UserPlus size={16} /> QUICK START: COMING
                      </button>
                      <button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.8rem' }} onClick={quickStartLast}>
                        <History size={16} /> QUICK START: LAST
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '1rem', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Bracket creation is restricted to Admins.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {view === 'bracket' && activeTournament && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--bg-dark)', zIndex: 100 }}>
              {/* Responsive Floating Bracket Header */}
              <div className="bracket-controls-overlay">
                <div className="bracket-top-row">
                  {/* Nav & Info Group */}
                  <div className="bracket-nav-group">
                    <button className="btn btn-secondary bracket-circle-btn" onClick={handleGoHome} title="Back to Lobby"><ArrowLeft size={20} /></button>
                    
                    <div className="bracket-title-badge">
                      <span className="title-text">{getTournamentLabel(activeTournament, allTournamentsList)}</span>
                      <span className="subtitle-text">${getTournamentEntryFee(activeTournament.config)}/PLAYER • {activeTournament.config.players.length} PLAYERS</span>
                    </div>

                    <div className={`bracket-admin-badge ${isAdmin ? 'is-admin' : ''}`}>
                      {isAdmin ? <LockOpen size={10} color="#10b981" /> : <LockIcon size={10} style={{ opacity: 0.5 }} />}
                      <span>{isAdmin ? 'ADMIN' : 'VIEW'}</span>
                    </div>
                  </div>

                  {/* Action Buttons Toolbar */}
                  <div className="bracket-actions-group">
                    {isAdmin && (
                      <button 
                        className="btn btn-secondary bracket-circle-btn" 
                        onClick={() => {
                          setActiveTourneyEditFee(getTournamentEntryFee(activeTournament.config));
                          setActiveTourneyEditCash(activeTournament.config.addedCash || 0);
                          setEditingActiveTourneyConfig(true);
                        }} 
                        title="Edit Entry Fee & Added Cash"
                      >
                        <Sliders size={18} className="accent-text" />
                      </button>
                    )}

                    {isAdmin && (
                      <button className="btn" style={{ padding: '0.3rem 0.75rem', fontSize: '0.65rem', background: 'var(--primary)', color: 'white', borderRadius: '1rem', height: '2.5rem', fontWeight: 800 }} 
                        onClick={handleFinishTournament}
                        onMouseDown={() => cancelTimerRef.current = setTimeout(() => setConfirmCancel(true), 1200)}
                        onMouseUp={() => cancelTimerRef.current && clearTimeout(cancelTimerRef.current)}
                        onTouchStart={() => cancelTimerRef.current = setTimeout(() => setConfirmCancel(true), 1200)}
                        onTouchEnd={() => cancelTimerRef.current && clearTimeout(cancelTimerRef.current)}
                      >FINISH</button>
                    )}

                    {isAdmin && !tourneyHasStarted && (
                      <button 
                        className="btn btn-secondary bracket-circle-btn" 
                        onClick={() => {
                          haptic('light')
                          setIsSwapMode(prev => !prev)
                          setSwapSelection(null)
                        }} 
                        style={{ 
                          background: isSwapMode ? 'rgba(245, 158, 11, 0.25)' : undefined, 
                          border: isSwapMode ? '1.5px solid var(--accent)' : undefined 
                        }} 
                        title={isSwapMode ? "Cancel Matchup Swap" : "Swap Starting Matchups"}
                      >
                        <ArrowLeftRight size={18} className="accent-text" />
                      </button>
                    )}

                    {isAdmin && !tourneyHasStarted && (
                      <button 
                        className="btn btn-secondary bracket-circle-btn" 
                        onClick={() => setConfirmShuffle(true)} 
                        title="Shuffle Bracket"
                      >
                        <Shuffle size={18} className="accent-text" />
                      </button>
                    )}

                    {isAdmin && availableByes.length > 0 && (
                      <button 
                        className="btn btn-secondary bracket-circle-btn" 
                        onClick={() => {
                          setSelectedByeMatchId(availableByes[0]?.id || null)
                          setShowAddPlayerToByeModal(true)
                        }} 
                        title={`Add Player to Bye (${availableByes.length} available)`}
                        style={{ border: '1.5px solid var(--accent)' }}
                      >
                        <UserPlus size={18} className="accent-text" />
                      </button>
                    )}
                    
                    <button 
                      className="btn btn-secondary bracket-circle-btn" 
                      onClick={toggleKioskMode} 
                      style={{ 
                        background: isKioskMode ? 'rgba(16, 185, 129, 0.25)' : undefined, 
                        border: isKioskMode ? '1.5px solid var(--primary)' : undefined 
                      }}
                      title={isKioskMode ? "Exit Fullscreen Kiosk" : "Fullscreen TV / Kiosk Mode"}
                    >
                      {isKioskMode ? <Minimize2 size={18} color="var(--primary)" /> : <Tv size={18} />}
                    </button>

                    <button 
                      className="btn btn-secondary bracket-circle-btn" 
                      onClick={() => setShowQR(true)} 
                      title="Share QR Code"
                    >
                      <QrCode size={18} />
                    </button>
                  </div>

                  {/* Pot Info Group */}
                  <div className="bracket-pot-group">
                    <span style={{ fontSize: '0.5rem', opacity: 0.5, fontWeight: 700 }}>TOTAL POT</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--accent)', textShadow: '0 2px 10px rgba(255, 184, 0, 0.3)' }}>
                      ${getTournamentPot(activeTournament.config)}
                    </span>
                    <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.1rem' }}>
                      {(() => {
                        const pot = (activeTournament.config.players.length) * getTournamentEntryFee(activeTournament.config);
                        const payouts = calculatePayouts(pot, activeTournament.config.addedCash, activeTournament.config.payoutSplits);
                        return payouts.map((p, i) => (
                          <span key={i} style={{ fontSize: '0.55rem', fontWeight: 800, color: i === 0 ? 'var(--accent)' : 'var(--text-muted)' }}>
                            {i+1}st: ${p}
                          </span>
                        ));
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Pre-start Matchup Swap Floating Helper Banner */}
              {isSwapMode && !tourneyHasStarted && (
                <div className="bracket-swap-banner">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ArrowLeftRight size={16} className="accent-text" />
                    <span style={{ fontWeight: 700, color: 'white' }}>
                      {swapSelection 
                        ? `Selected: ${players[swapSelection.playerId]?.name || 'Player'} — Tap another player to swap` 
                        : 'Tap any player in Round 1 to select'}
                    </span>
                  </div>
                  <button 
                    className="btn btn-ghost" 
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.65rem', background: 'rgba(255,255,255,0.1)', borderRadius: '0.5rem' }} 
                    onClick={() => { setIsSwapMode(false); setSwapSelection(null); }}
                  >
                    Done
                  </button>
                </div>
              )}

              <div style={{ width: '100%', height: '100%' }}>
                {renderBracket()}
              </div>
            </motion.div>
          )}

          {/* PLAYERS VIEW */}
          {view === 'players' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div className="card-title" style={{ margin: 0 }}><UserPlus size={20} className="accent-text" /> Player Registry</div>
                  {isAdmin && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem', fontSize: '0.7rem' }} onClick={() => setShowMergeModal(true)}>
                        <GitMerge size={14} /> MERGE
                      </button>
                      <button className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }} onClick={resetAllAttendance} title="Clear Coming/Out attendance status for next week">
                        <RotateCcw size={13} /> CLEAR ATTENDANCE
                      </button>
                    </div>
                  )}
                </div>

                <input className="input" placeholder="Search players..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ marginBottom: '1rem' }} />
                
                {/* Sort Selector Bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '0.25rem', flexShrink: 0 }}>Sort:</span>
                  {(['name', 'wins', 'earnings', 'pct'] as const).map(mode => (
                    <button 
                      key={mode} 
                      className="btn" 
                      onClick={() => { haptic(); setPlayerSort(mode); }}
                      style={{ 
                        padding: '0.25rem 0.6rem', 
                        fontSize: '0.65rem', 
                        background: playerSort === mode ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.02)', 
                        color: playerSort === mode ? 'var(--primary)' : 'var(--text-muted)', 
                        border: playerSort === mode ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--glass-border)',
                        borderRadius: '0.5rem',
                        fontWeight: 700,
                        textTransform: 'uppercase'
                      }}
                    >
                      {mode === 'pct' ? 'Win %' : mode}
                    </button>
                  ))}
                </div>

                {isAdmin && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <input className="input" placeholder="Add new player..." value={newPlayerName} onChange={e => setNewPlayerName(e.target.value)} onKeyPress={e => e.key === 'Enter' && addPlayer(newPlayerName)} />
                    <button className="btn btn-primary" onClick={() => addPlayer(newPlayerName)}><Plus size={24} /></button>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {Object.values(players)
                    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .sort((a, b) => {
                      if (playerSort === 'wins') return (b.wins || 0) - (a.wins || 0) || a.name.localeCompare(b.name)
                      if (playerSort === 'earnings') return (b.earnings || 0) - (a.earnings || 0) || a.name.localeCompare(b.name)
                      if (playerSort === 'pct') {
                        const aTotal = (a.wins || 0) + (a.losses || 0)
                        const bTotal = (b.wins || 0) + (b.losses || 0)
                        const aPct = aTotal > 0 ? (a.wins || 0) / aTotal : 0
                        const bPct = bTotal > 0 ? (b.wins || 0) / bTotal : 0
                        return bPct - aPct || (b.wins || 0) - (a.wins || 0) || a.name.localeCompare(b.name)
                      }
                      return a.name.localeCompare(b.name)
                    })
                    .map(p => {
                    const total = (p.wins || 0) + (p.losses || 0);
                    const winPct = total > 0 ? ((p.wins / total) * 100).toFixed(0) : 0;
                    return (
                      <motion.div key={p.id} className="card" onClick={() => setSelectedH2HPlayerId(p.id)}
                        style={{ 
                          margin: 0, 
                          padding: '0.75rem 1rem', 
                          background: 'var(--bg-card)', 
                          cursor: 'pointer',
                          display: 'grid',
                          gridTemplateColumns: '1fr auto',
                          alignItems: 'center',
                          gap: '0.75rem',
                          border: p.status === 'coming' ? '1.5px solid #10b981' : (p.status === 'out' ? '1.5px solid #ef4444' : '1px solid var(--glass-border)'),
                          boxShadow: p.status === 'coming' ? '0 0 12px rgba(16, 185, 129, 0.15)' : (p.status === 'out' ? '0 0 12px rgba(239, 68, 68, 0.15)' : 'none'),
                          borderRadius: '0.85rem',
                          transition: 'all 0.2s ease-in-out'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: 0 }}>
                          <span style={{ fontWeight: 750, fontSize: '1.05rem', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.01em' }}>{p.name}</span>
                          <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', alignItems: 'center' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#f59e0b', fontWeight: 600 }}>
                              <Trophy size={12} strokeWidth={2.5} /> <span>{p.wins || 0}</span>
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#10b981', fontWeight: 600 }}>
                              <Coins size={12} strokeWidth={2.5} /> <span>${p.earnings || 0}</span>
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#3b82f6', fontWeight: 600 }}>
                              <Percent size={12} strokeWidth={2.5} /> <span>{winPct}%</span>
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={(e) => e.stopPropagation()}>
                          {isAdmin ? (
                            <>
                              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', padding: '2px', borderRadius: '0.5rem', border: '1px solid var(--glass-border)' }}>
                                <button 
                                  className="btn-ghost" 
                                  title="Mark as Coming"
                                  style={{ 
                                    padding: '0.3rem 0.5rem', 
                                    background: p.status === 'coming' ? '#10b981' : 'transparent', 
                                    color: p.status === 'coming' ? 'white' : 'rgba(16, 185, 129, 0.6)', 
                                    borderRadius: '0.35rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.15s ease'
                                  }} 
                                  onClick={() => handleSetStatus(p.id, 'coming')}
                                >
                                  <Check size={13} strokeWidth={3} />
                                </button>
                                <button 
                                  className="btn-ghost" 
                                  title="Mark as Out"
                                  style={{ 
                                    padding: '0.3rem 0.5rem', 
                                    background: p.status === 'out' ? '#ef4444' : 'transparent', 
                                    color: p.status === 'out' ? 'white' : 'rgba(239, 68, 68, 0.6)', 
                                    borderRadius: '0.35rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.15s ease'
                                  }} 
                                  onClick={() => handleSetStatus(p.id, 'out')}
                                >
                                  <X size={13} strokeWidth={3} />
                                </button>
                              </div>

                              <button 
                                className="btn-ghost" 
                                title="Player Options"
                                style={{ 
                                  padding: '0.45rem', 
                                  background: 'rgba(255,255,255,0.03)', 
                                  border: '1px solid var(--glass-border)', 
                                  borderRadius: '50%', 
                                  color: 'var(--text-muted)', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center' 
                                }} 
                                onClick={() => {
                                  haptic('light')
                                  setShowPlayerActionMenuId(p.id)
                                }}
                              >
                                <MoreVertical size={16} />
                              </button>
                            </>
                          ) : (
                            p.status && (
                              <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '4px',
                                padding: '0.25rem 0.6rem', 
                                borderRadius: '0.5rem', 
                                fontSize: '0.65rem', 
                                fontWeight: 800, 
                                letterSpacing: '0.02em',
                                background: p.status === 'coming' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                color: p.status === 'coming' ? '#10b981' : '#ef4444',
                                border: p.status === 'coming' ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
                              }}>
                                {p.status === 'coming' ? (
                                  <>
                                    <Check size={11} strokeWidth={3} />
                                    <span>COMING</span>
                                  </>
                                ) : (
                                  <>
                                    <X size={11} strokeWidth={3} />
                                    <span>OUT</span>
                                  </>
                                )}
                              </div>
                            )
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* HISTORY VIEW */}
          {view === 'history' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <h2 className="page-title">History</h2>
              <div className="card">
                <div className="card-title"><Trophy size={20} className="accent-text" /> Hall of Fame</div>
                {Object.values(players).sort((a, b) => b.earnings - a.earnings).slice(0, 5).map((p, idx) => (
                  <div key={p.id} onClick={() => setSelectedH2HPlayerId(p.id)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span className={`payout-badge payout-${idx + 1}`}>{idx + 1}</span>
                      <span style={{ fontWeight: 600 }}>{p.name}</span>
                    </div>
                    <span style={{ color: 'var(--primary)', fontWeight: 800 }}>${p.earnings}</span>
                  </div>
                ))}
              </div>

              <div className="card">
                <div className="card-title"><History size={20} className="accent-text" /> Past Tournaments</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {pastTournaments.map(t => {
                    const label = getTournamentLabel(t, allTournamentsList);
                    const fee = getTournamentEntryFee(t.config);
                    const pot = getTournamentPot(t.config);
                    const finalMatch = t.matches?.find((m: any) => m.nextMatchId === null && !m.isConsolation);
                    const winnerName = finalMatch?.winnerId ? players[finalMatch.winnerId]?.name : null;

                    return (
                      <div 
                        key={t.id} 
                        className="card" 
                        style={{ padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', margin: 0, background: 'rgba(255,255,255,0.03)' }} 
                        onClick={() => setViewingPastTourney(t)}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {label}
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                            {t.config.players.length} Players • ${fee} Entry • Total Pot: ${pot}
                            {winnerName && <span style={{ color: 'var(--accent)', marginLeft: '0.5rem', fontWeight: 600 }}>🏆 {winnerName}</span>}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={e => e.stopPropagation()}>
                          {isAdmin && (
                            <>
                              <button 
                                className="btn-ghost" 
                                title="Edit Bracket Details & Payouts"
                                style={{ padding: '0.45rem', background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }}
                                onClick={() => setEditingPastTourneyConfig({
                                  id: t.id,
                                  entryFee: fee,
                                  addedCash: t.config.addedCash || 0,
                                  customLabel: t.config.customLabel || '',
                                  payoutPlaces: t.config.payoutPlaces || 1,
                                  payoutSplits: t.config.payoutSplits || [100]
                                })}
                              >
                                <Edit2 size={15} color="var(--primary)" />
                              </button>

                              <button 
                                className="btn-ghost" 
                                title="Delete Tournament Record"
                                style={{ padding: '0.45rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '50%' }} 
                                onClick={() => setConfirmDeleteTourney(t)}
                              >
                                <Trash2 size={15} color="var(--danger)" />
                              </button>
                            </>
                          )}
                          <ChevronRight size={20} style={{ opacity: 0.3 }} />
                        </div>
                      </div>
                    )
                  })}
                  {pastTournaments.length === 0 && <p style={{ textAlign: 'center', opacity: 0.5, padding: '1rem' }}>No past tournaments found.</p>}
                </div>
              </div>
            </motion.div>
          )}

          {/* SETTINGS VIEW */}
          {view === 'settings' && (
             <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
               <h2 className="page-title">Config</h2>
               {isAdmin ? (
                 <>
                   <div className="card">
                     <div className="card-title"><Settings2 size={20} className="accent-text" /> Tournament Defaults</div>
                     <div className="option-group">
                       <label>Default Added Cash</label>
                       <input type="number" className="input" value={config.addedCash} onChange={e => setConfig({ ...config, addedCash: parseInt(e.target.value) || 0 })} />
                     </div>
                     <div className="option-group">
                       <label>Default Payout Strategy</label>
                       <select className="input" value={config.payoutPlaces} onChange={e => {
                         const val = parseInt(e.target.value);
                         let splits = [100];
                         if (val === 2) splits = [70, 30];
                         if (val === 3) splits = [60, 30, 10];
                         setConfig({ ...config, payoutPlaces: val, payoutSplits: splits });
                       }}>
                         <option value={1}>1st Only</option>
                         <option value={2}>Top 2</option>
                         <option value={3}>Top 3</option>
                       </select>
                     </div>
                     <div className="option-group">
                        <label>Bye Logic</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className={`btn ${config.byeLogic === 'random' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }} onClick={() => setConfig({ ...config, byeLogic: 'random' })}>Random</button>
                          <button className={`btn ${config.byeLogic === 'lowest_wins' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }} onClick={() => setConfig({ ...config, byeLogic: 'lowest_wins' })}>Fair (Low Wins First)</button>
                        </div>
                     </div>
                   </div>

                   <div className="card" style={{ border: '1px solid var(--danger)', opacity: 0.8 }}>
                     <div className="card-title" style={{ color: 'var(--danger)' }}><Trash2 size={20} /> Danger Zone</div>
                     <p style={{ fontSize: '0.8rem', marginBottom: '1rem' }}>Admin operations that affect global state.</p>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <button className="btn" style={{ width: '100%', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid var(--danger)' }} onClick={() => { 
                          if(confirm("Are you sure? This will hide all current players from the 'Coming' list.")) {
                            resetAllAttendance();
                          }
                        }}>Reset Attendance</button>
                        <button className="btn" style={{ width: '100%', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid var(--danger)' }} onClick={() => { 
                          if(confirm("DANGER: This will permanently wipe all wins, losses, and earnings for EVERY player. Are you absolutely sure?")) {
                            resetAllStats();
                          }
                        }}>Clear All Player Stats</button>
                        {activeTournament && (
                          <button className="btn" style={{ width: '100%', background: 'var(--danger)', color: 'white' }} onClick={async () => {
                            if(confirm("DELETE current tournament permanently? This cannot be undone.")) {
                              await supabase.from('tournaments').delete().eq('id', activeTournament.id);
                              setActiveTournament(null);
                              setView('home');
                            }
                          }}>Delete Current Tournament</button>
                        )}
                     </div>
                   </div>

                   <button className="btn btn-secondary" style={{ width: '100%', marginTop: '1rem', border: '1px solid rgba(255,255,255,0.1)' }} onClick={() => setIsAdmin(false)}>
                     LOGOUT ADMIN
                   </button>
                 </>
               ) : (
                  <div className="card">
                    <div className="card-title"><LockIcon size={20} className="accent-text" /> Admin Access</div>
                    <p style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '1.5rem' }}>Enter password to unlock tournament configuration and administrative controls.</p>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input 
                        type="password" 
                        className="input" 
                        placeholder="Password" 
                        value={loginCode} 
                        onChange={e => setLoginCode(e.target.value)} 
                        onKeyPress={e => e.key === 'Enter' && submitLogin()}
                        style={{ flex: 1 }}
                      />
                      <button className="btn btn-primary" onClick={submitLogin}>UNLOCK</button>
                    </div>
                  </div>
               )}

               <div style={{ textAlign: 'center', marginTop: '2rem', marginBottom: '1rem' }}>
                  <button onClick={() => {
                    if ('serviceWorker' in navigator) {
                      navigator.serviceWorker.getRegistrations().then(regs => {
                        for(const r of regs) r.unregister();
                        window.location.reload();
                      });
                    } else {
                      window.location.reload();
                    }
                  }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.1)', fontSize: '0.6rem', cursor: 'pointer', letterSpacing: '0.1em' }}>
                    REFRESH v2.0.0
                  </button>
               </div>
             </motion.div>
          )}
        </AnimatePresence>

        {/* --- GLOBAL MODALS & DIALOGS --- */}
        <AnimatePresence>
          {/* Active Tournament Match Options Modal */}
          {showOptions && (
            <motion.div className="modal-overlay" onClick={() => setShowOptions(null)}>
              <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h3 className="card-title">Match Options</h3>
                <button className="btn btn-secondary" style={{ width: '100%', marginBottom: '1rem' }} onClick={() => handleUndo(showOptions)}>Undo Result</button>
                <button className="btn btn-ghost" style={{ width: '100%' }} onClick={() => setShowOptions(null)}>Close</button>
              </div>
            </motion.div>
          )}

          {/* Past Tournament Match Options Modal */}
          {showPastOptions && (
            <motion.div className="modal-overlay" onClick={() => setShowPastOptions(null)}>
              <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h3 className="card-title">Edit Past Match</h3>
                <p style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '1.25rem' }}>
                  Undoing this match will recalculate wins, losses, and tournament earnings if applicable.
                </p>
                <button className="btn btn-secondary" style={{ width: '100%', marginBottom: '1rem' }} onClick={() => handleUndoPastTournament(showPastOptions)}>Undo Match Outcome</button>
                <button className="btn btn-ghost" style={{ width: '100%' }} onClick={() => setShowPastOptions(null)}>Close</button>
              </div>
            </motion.div>
          )}

          {/* Score Selector Modal */}
          {showScoreModal && (
            <motion.div className="modal-overlay" onClick={() => setShowScoreModal(null)}>
              <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h3 className="card-title">Select Score</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <button className="btn btn-primary" onClick={() => { 
                    if (showScoreModal.isPastTourney && viewingPastTourney) {
                      handleAdvancePastTournament(viewingPastTourney, showScoreModal.matchId, showScoreModal.winnerId, '2-0')
                    } else {
                      handleAdvance(showScoreModal.matchId, showScoreModal.winnerId, '2-0')
                    }
                    setShowScoreModal(null)
                  }}>2 - 0</button>
                  <button className="btn btn-primary" onClick={() => { 
                    if (showScoreModal.isPastTourney && viewingPastTourney) {
                      handleAdvancePastTournament(viewingPastTourney, showScoreModal.matchId, showScoreModal.winnerId, '2-1')
                    } else {
                      handleAdvance(showScoreModal.matchId, showScoreModal.winnerId, '2-1')
                    }
                    setShowScoreModal(null)
                  }}>2 - 1</button>
                  <button className="btn btn-ghost" onClick={() => setShowScoreModal(null)}>Cancel</button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Player Matchup Stats (H2H) Modal */}
          {selectedH2HPlayerId && (
             <motion.div className="modal-overlay" onClick={() => setSelectedH2HPlayerId(null)}>
               <div className="modal-content" onClick={e => e.stopPropagation()}>
                 <h3 className="card-title">Matchup Stats: {players[selectedH2HPlayerId]?.name}</h3>
                 <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {(() => {
                      const p = players[selectedH2HPlayerId];
                      const stats: Record<string, { wins: number, total: number }> = {};
                      p.history?.forEach(entry => {
                        if (entry.includes(':')) {
                          const [oppId, res] = entry.split(':');
                          if (!stats[oppId]) stats[oppId] = { wins: 0, total: 0 };
                          stats[oppId].total++;
                          if (res === 'W') stats[oppId].wins++;
                        }
                      });
                      const list = Object.entries(stats).sort((a, b) => b[1].total - a[1].total);
                      if (list.length === 0) return <p style={{ opacity: 0.5, textAlign: 'center', padding: '1rem' }}>No matchup data yet.</p>;
                      return list.map(([oppId, s]) => (
                        <div key={oppId} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--glass-border)' }}>
                          <span style={{ fontWeight: 600 }}>vs {players[oppId]?.name || 'Unknown'}</span>
                          <span>{s.wins}W - {s.total - s.wins}L <span style={{ opacity: 0.5, fontSize: '0.8rem', marginLeft: '0.5rem' }}>({((s.wins / s.total) * 100).toFixed(0)}%)</span></span>
                        </div>
                      ));
                    })()}
                 </div>
                 <button className="btn btn-ghost" style={{ width: '100%', marginTop: '1rem' }} onClick={() => setSelectedH2HPlayerId(null)}>Close</button>
               </div>
             </motion.div>
           )}

           {/* PLAYER 3-DOT ACTION MENU MODAL */}
           {showPlayerActionMenuId && players[showPlayerActionMenuId] && (
             <motion.div className="modal-overlay" onClick={() => setShowPlayerActionMenuId(null)}>
               <div className="modal-content" onClick={e => e.stopPropagation()}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                   <div>
                     <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase' }}>Player Options</span>
                     <h3 className="card-title" style={{ margin: '0.2rem 0 0 0' }}>{players[showPlayerActionMenuId].name}</h3>
                   </div>
                   <button className="btn-ghost" onClick={() => setShowPlayerActionMenuId(null)} style={{ padding: '0.4rem', borderRadius: '50%' }}>
                     <X size={18} />
                   </button>
                 </div>

                 <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                   <button 
                     className="btn btn-secondary" 
                     style={{ width: '100%', justifyContent: 'flex-start', padding: '0.85rem 1rem', fontSize: '0.9rem' }}
                     onClick={() => {
                       const p = players[showPlayerActionMenuId]
                       setShowPlayerActionMenuId(null)
                       setEditingPlayerStats({
                         id: p.id,
                         name: p.name,
                         wins: p.wins || 0,
                         losses: p.losses || 0,
                         earnings: p.earnings || 0,
                         status: p.status || null
                       })
                     }}
                   >
                     <Edit2 size={16} className="accent-text" /> Edit Profile & Stats
                   </button>

                   <button 
                     className="btn btn-secondary" 
                     style={{ width: '100%', justifyContent: 'flex-start', padding: '0.85rem 1rem', fontSize: '0.9rem' }}
                     onClick={() => {
                       const pId = showPlayerActionMenuId
                       setShowPlayerActionMenuId(null)
                       setMergePrimaryId(pId)
                       setShowMergeModal(true)
                     }}
                   >
                     <GitMerge size={16} color="var(--primary)" /> Merge With Another Profile
                   </button>

                   <button 
                     className="btn" 
                     style={{ width: '100%', justifyContent: 'flex-start', padding: '0.85rem 1rem', fontSize: '0.9rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                     onClick={() => {
                       const pId = showPlayerActionMenuId
                       setShowPlayerActionMenuId(null)
                       setConfirmDeletePlayerId(pId)
                     }}
                   >
                     <Trash2 size={16} /> Delete Profile
                   </button>
                 </div>
               </div>
             </motion.div>
           )}

          {/* EDIT PLAYER STATS & PROFILE MODAL */}
          {editingPlayerStats && (
            <motion.div className="modal-overlay" onClick={() => setEditingPlayerStats(null)}>
              <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h3 className="card-title"><Edit2 size={18} className="accent-text" /> Edit Player Profile</h3>
                
                <div className="option-group">
                  <label>Player Name</label>
                  <input 
                    type="text" 
                    className="input" 
                    value={editingPlayerStats.name} 
                    onChange={e => setEditingPlayerStats({ ...editingPlayerStats, name: e.target.value })} 
                  />
                </div>

                <div className="form-grid">
                  <div className="option-group">
                    <label>Tournament Wins</label>
                    <input 
                      type="number" 
                      className="input" 
                      min="0"
                      value={editingPlayerStats.wins} 
                      onChange={e => setEditingPlayerStats({ ...editingPlayerStats, wins: parseInt(e.target.value) || 0 })} 
                    />
                  </div>
                  <div className="option-group">
                    <label>Match Losses</label>
                    <input 
                      type="number" 
                      className="input" 
                      min="0"
                      value={editingPlayerStats.losses} 
                      onChange={e => setEditingPlayerStats({ ...editingPlayerStats, losses: parseInt(e.target.value) || 0 })} 
                    />
                  </div>
                </div>

                <div className="option-group">
                  <label>Total Earnings ($)</label>
                  <input 
                    type="number" 
                    className="input" 
                    min="0"
                    value={editingPlayerStats.earnings} 
                    onChange={e => setEditingPlayerStats({ ...editingPlayerStats, earnings: parseInt(e.target.value) || 0 })} 
                  />
                </div>

                <div className="option-group">
                  <label>Attendance Status Tonight</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      type="button"
                      className={`btn ${editingPlayerStats.status === 'coming' ? 'btn-primary' : 'btn-secondary'}`} 
                      style={{ flex: 1, fontSize: '0.8rem', padding: '0.5rem' }}
                      onClick={() => setEditingPlayerStats({ ...editingPlayerStats, status: editingPlayerStats.status === 'coming' ? null : 'coming' })}
                    >
                      Coming
                    </button>
                    <button 
                      type="button"
                      className={`btn ${editingPlayerStats.status === 'out' ? 'btn-primary' : 'btn-secondary'}`} 
                      style={{ flex: 1, fontSize: '0.8rem', padding: '0.5rem', background: editingPlayerStats.status === 'out' ? 'var(--danger)' : undefined }}
                      onClick={() => setEditingPlayerStats({ ...editingPlayerStats, status: editingPlayerStats.status === 'out' ? null : 'out' })}
                    >
                      Out
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditingPlayerStats(null)}>Cancel</button>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => handleSavePlayerStats(editingPlayerStats)}>Save Changes</button>
                </div>
              </div>
            </motion.div>
          )}

          {/* MERGE PLAYER PROFILES MODAL */}
          {showMergeModal && (
            <motion.div className="modal-overlay" onClick={() => !isMerging && setShowMergeModal(false)}>
              <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h3 className="card-title"><GitMerge size={20} className="accent-text" /> Merge Duplicate Profiles</h3>
                <p style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '1.25rem' }}>
                  Combine stats and match history from two profiles into one. All historical bracket appearances will be updated.
                </p>

                <div className="option-group">
                  <label>Primary Profile (Keep)</label>
                  <select 
                    className="input" 
                    value={mergePrimaryId} 
                    onChange={e => setMergePrimaryId(e.target.value)}
                  >
                    <option value="">-- Select Profile to Keep --</option>
                    {Object.values(players).sort((a, b) => a.name.localeCompare(b.name)).map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.wins || 0}W, ${p.earnings || 0})</option>
                    ))}
                  </select>
                </div>

                <div className="option-group">
                  <label>Duplicate Profile (Merge into Primary & Remove)</label>
                  <select 
                    className="input" 
                    value={mergeSecondaryId} 
                    onChange={e => setMergeSecondaryId(e.target.value)}
                  >
                    <option value="">-- Select Duplicate to Remove --</option>
                    {Object.values(players)
                      .filter(p => p.id !== mergePrimaryId)
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.wins || 0}W, ${p.earnings || 0})</option>
                      ))}
                  </select>
                </div>

                {mergePrimaryId && mergeSecondaryId && players[mergePrimaryId] && players[mergeSecondaryId] && (
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--glass-border)', marginBottom: '1.25rem' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase' }}>Combined Result Preview</span>
                    <div style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                      <div><b>Name:</b> {players[mergePrimaryId]?.name}</div>
                      <div><b>Wins:</b> {(players[mergePrimaryId]?.wins || 0) + (players[mergeSecondaryId]?.wins || 0)}</div>
                      <div><b>Losses:</b> {(players[mergePrimaryId]?.losses || 0) + (players[mergeSecondaryId]?.losses || 0)}</div>
                      <div><b>Earnings:</b> ${(players[mergePrimaryId]?.earnings || 0) + (players[mergeSecondaryId]?.earnings || 0)}</div>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button className="btn btn-secondary" style={{ flex: 1 }} disabled={isMerging} onClick={() => setShowMergeModal(false)}>Cancel</button>
                  <button 
                    className="btn btn-primary" 
                    style={{ flex: 1 }} 
                    disabled={!mergePrimaryId || !mergeSecondaryId || isMerging} 
                    onClick={() => handleMergeProfiles(mergePrimaryId, mergeSecondaryId)}
                  >
                    {isMerging ? 'Merging...' : 'Merge Profiles'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* EDIT ACTIVE TOURNAMENT ENTRY FEE & CASH MODAL */}
          {editingActiveTourneyConfig && activeTournament && (
            <motion.div className="modal-overlay" onClick={() => setEditingActiveTourneyConfig(false)}>
              <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h3 className="card-title"><Sliders size={18} className="accent-text" /> Bracket Settings</h3>
                <p style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '1.25rem' }}>
                  Adjust the entry fee and added cash for the active tournament if it was started incorrectly.
                </p>

                <div className="form-grid">
                  <div className="option-group">
                    <label>Entry Fee ($ / Player)</label>
                    <input 
                      type="number" 
                      className="input" 
                      min="0"
                      value={activeTourneyEditFee} 
                      onChange={e => setActiveTourneyEditFee(Math.max(0, parseInt(e.target.value) || 0))} 
                    />
                  </div>
                  <div className="option-group">
                    <label>Added Cash ($)</label>
                    <input 
                      type="number" 
                      className="input" 
                      min="0"
                      value={activeTourneyEditCash} 
                      onChange={e => setActiveTourneyEditCash(Math.max(0, parseInt(e.target.value) || 0))} 
                    />
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1.25rem', fontSize: '0.8rem' }}>
                  New Total Pot: <b>${(activeTournament.config.players.length * activeTourneyEditFee) + activeTourneyEditCash}</b>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditingActiveTourneyConfig(false)}>Cancel</button>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => handleSaveActiveTourneyConfig(activeTourneyEditFee, activeTourneyEditCash)}>Save Settings</button>
                </div>
              </div>
            </motion.div>
          )}

          {/* EDIT PAST TOURNAMENT CONFIG MODAL */}
          {editingPastTourneyConfig && (
            <motion.div className="modal-overlay" onClick={() => setEditingPastTourneyConfig(null)}>
              <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h3 className="card-title"><Edit2 size={18} className="accent-text" /> Edit Past Tournament</h3>
                <p style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '1.25rem' }}>
                  Updating the entry fee or added cash will automatically adjust the tournament payout delta in the winner's earnings!
                </p>

                <div className="option-group">
                  <label>Custom Label (Optional)</label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="e.g. 8/12 $5 Bracket #1 or Championship Final"
                    value={editingPastTourneyConfig.customLabel} 
                    onChange={e => setEditingPastTourneyConfig({ ...editingPastTourneyConfig, customLabel: e.target.value })} 
                  />
                </div>

                <div className="form-grid">
                  <div className="option-group">
                    <label>Entry Fee ($ / Player)</label>
                    <input 
                      type="number" 
                      className="input" 
                      min="0"
                      value={editingPastTourneyConfig.entryFee} 
                      onChange={e => setEditingPastTourneyConfig({ ...editingPastTourneyConfig, entryFee: Math.max(0, parseInt(e.target.value) || 0) })} 
                    />
                  </div>
                  <div className="option-group">
                    <label>Added Cash ($)</label>
                    <input 
                      type="number" 
                      className="input" 
                      min="0"
                      value={editingPastTourneyConfig.addedCash} 
                      onChange={e => setEditingPastTourneyConfig({ ...editingPastTourneyConfig, addedCash: Math.max(0, parseInt(e.target.value) || 0) })} 
                    />
                  </div>
                </div>

                <div className="option-group">
                  <label>Payout Structure</label>
                  <select 
                    className="input" 
                    value={editingPastTourneyConfig.payoutPlaces} 
                    onChange={e => {
                      const val = parseInt(e.target.value);
                      let splits = [100];
                      if (val === 2) splits = [70, 30];
                      if (val === 3) splits = [60, 30, 10];
                      setEditingPastTourneyConfig({ ...editingPastTourneyConfig, payoutPlaces: val, payoutSplits: splits });
                    }}
                  >
                    <option value={1}>1st Place Only (100%)</option>
                    <option value={2}>Top 2 (70% / 30%)</option>
                    <option value={3}>Top 3 (60% / 30% / 10%)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditingPastTourneyConfig(null)}>Cancel</button>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => handleSavePastTourneyConfig(editingPastTourneyConfig)}>Save Changes</button>
                </div>
              </div>
            </motion.div>
          )}

          {/* CONFIRM DELETE PAST TOURNAMENT MODAL */}
          {confirmDeleteTourney && (
            <motion.div className="modal-overlay" onClick={() => setConfirmDeleteTourney(null)}>
              <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h3 className="card-title" style={{ color: 'var(--danger)' }}><AlertTriangle size={20} /> Delete Tournament?</h3>
                <p style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '1rem' }}>
                  Are you sure you want to permanently delete <b>{getTournamentLabel(confirmDeleteTourney, allTournamentsList)}</b>?
                </p>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--glass-border)', marginBottom: '1.25rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={rollbackStatsOnDelete} 
                      onChange={e => setRollbackStatsOnDelete(e.target.checked)} 
                    />
                    <span>Rollback winner's tournament wins and earnings from this bracket</span>
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setConfirmDeleteTourney(null)}>Cancel</button>
                  <button className="btn" style={{ flex: 1, background: 'var(--danger)', color: 'white' }} onClick={() => handleDeletePastTournament(confirmDeleteTourney, rollbackStatsOnDelete)}>Delete</button>
                </div>
              </div>
            </motion.div>
          )}

          {/* VIEWING PAST TOURNAMENT BRACKET OVERLAY */}
          {viewingPastTourney && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" style={{ background: 'var(--bg-dark)', zIndex: 1000, padding: 0 }}>
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div className="bracket-controls-overlay">
                  <div className="bracket-top-row">
                    <div className="bracket-nav-group">
                      <button className="btn btn-secondary bracket-circle-btn" onClick={() => setViewingPastTourney(null)} title="Back to History"><ArrowLeft size={20} /></button>
                      
                      <div className="bracket-title-badge">
                        <span className="title-text">{getTournamentLabel(viewingPastTourney, allTournamentsList)}</span>
                        <span className="subtitle-text">${getTournamentEntryFee(viewingPastTourney.config)}/PLAYER • {viewingPastTourney.config.players.length} PLAYERS</span>
                      </div>
                    </div>

                    <div className="bracket-actions-group">
                      {isAdmin && (
                        <>
                          <button 
                            className="btn btn-secondary bracket-circle-btn" 
                            onClick={() => setEditingPastTourneyConfig({
                              id: viewingPastTourney.id,
                              entryFee: getTournamentEntryFee(viewingPastTourney.config),
                              addedCash: viewingPastTourney.config.addedCash || 0,
                              customLabel: viewingPastTourney.config.customLabel || '',
                              payoutPlaces: viewingPastTourney.config.payoutPlaces || 1,
                              payoutSplits: viewingPastTourney.config.payoutSplits || [100]
                            })}
                            title="Edit Bracket Details"
                          >
                            <Edit2 size={18} className="accent-text" />
                          </button>

                          <button 
                            className="btn btn-secondary bracket-circle-btn" 
                            onClick={() => setConfirmDeleteTourney(viewingPastTourney)}
                            title="Delete Past Bracket"
                          >
                            <Trash2 size={18} color="var(--danger)" />
                          </button>
                        </>
                      )}

                      <button 
                        className="btn btn-secondary bracket-circle-btn" 
                        onClick={toggleKioskMode} 
                        style={{ 
                          background: isKioskMode ? 'rgba(16, 185, 129, 0.25)' : undefined, 
                          border: isKioskMode ? '1.5px solid var(--primary)' : undefined 
                        }}
                        title={isKioskMode ? "Exit Fullscreen Kiosk" : "Fullscreen TV / Kiosk Mode"}
                      >
                        {isKioskMode ? <Minimize2 size={18} color="var(--primary)" /> : <Tv size={18} />}
                      </button>

                      <button 
                        className="btn btn-secondary bracket-circle-btn" 
                        onClick={() => setShowQR(true)} 
                        title="Share QR Code"
                      >
                        <QrCode size={18} />
                      </button>
                    </div>

                    <div className="bracket-pot-group">
                      <span style={{ fontSize: '0.5rem', opacity: 0.5, fontWeight: 700 }}>TOTAL POT</span>
                      <span style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--accent)', textShadow: '0 2px 10px rgba(255, 184, 0, 0.3)' }}>
                        ${getTournamentPot(viewingPastTourney.config)}
                      </span>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem' }}>
                        {(() => {
                          const pot = (viewingPastTourney.config.players.length) * getTournamentEntryFee(viewingPastTourney.config);
                          const payouts = calculatePayouts(pot, viewingPastTourney.config.addedCash, viewingPastTourney.config.payoutSplits);
                          return payouts.map((p, i) => (
                            <span key={i} style={{ fontSize: '0.55rem', fontWeight: 700, color: i === 0 ? 'var(--accent)' : 'var(--text-muted)' }}>
                              {i+1}: ${p}
                            </span>
                          ));
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                  {renderBracket(viewingPastTourney)}
                </div>
              </div>
            </motion.div>
          )}

          {/* Delete Single Player Modal */}
          {confirmDeletePlayerId && (
            <motion.div className="modal-overlay" onClick={() => setConfirmDeletePlayerId(null)}>
              <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h3 className="card-title">Delete Player?</h3>
                <p style={{ fontSize: '0.9rem', opacity: 0.7, marginBottom: '1.5rem', textAlign: 'center' }}>
                  Are you sure you want to delete <b>{players[confirmDeletePlayerId]?.name}</b>? This will permanently remove their history.
                </p>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setConfirmDeletePlayerId(null)}>Cancel</button>
                  <button className="btn" style={{ flex: 1, background: 'var(--danger)', color: 'white' }} onClick={() => deletePlayer(confirmDeletePlayerId)}>Delete</button>
                </div>
              </div>
            </motion.div>
          )}

          {/* QR Code Modal */}
          {showQR && (
            <motion.div className="modal-overlay" onClick={() => setShowQR(false)}>
              <div className="modal-content" style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                <h3 className="card-title">Scan to View Bracket</h3>
                <div style={{ background: 'white', padding: '1rem', borderRadius: '1rem', display: 'inline-block', marginBottom: '1rem' }}>
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.href)}`} 
                    alt="QR Code" 
                    style={{ display: 'block', width: '200px', height: '200px' }}
                  />
                </div>
                <p style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '1.5rem' }}>Anyone can scan this to view the live bracket on their device.</p>
                <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setShowQR(false)}>CLOSE</button>
              </div>
            </motion.div>
          )}

          {/* Rivalry Matchup Modal */}
          {showRivalryMatch && (
            <motion.div className="modal-overlay" onClick={() => setShowRivalryMatch(null)}>
              <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--accent)', letterSpacing: '0.1em' }}>RIVALRY STATS</span>
                  <h3 className="card-title" style={{ justifyContent: 'center', marginTop: '0.5rem' }}>
                    {players[showRivalryMatch.player1Id!]?.name || '???'} 
                    <span style={{ margin: '0 0.75rem', opacity: 0.3, fontSize: '0.8rem' }}>VS</span> 
                    {players[showRivalryMatch.player2Id!]?.name || '???'}
                  </h3>
                </div>

                {showRivalryMatch.player1Id && showRivalryMatch.player2Id ? (() => {
                  const h2h = calculateH2H(showRivalryMatch.player1Id, showRivalryMatch.player2Id)
                  const total = h2h.p1Wins + h2h.p2Wins
                  return (
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--glass-border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: 700 }}>
                        <span>{h2h.p1Wins} WINS</span>
                        <span>{h2h.p2Wins} WINS</span>
                      </div>
                      <div style={{ height: '8px', background: 'var(--bg-accent)', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
                        <div style={{ width: total > 0 ? `${(h2h.p1Wins/total)*100}%` : '50%', background: 'var(--primary)' }} />
                        <div style={{ width: total > 0 ? `${(h2h.p2Wins/total)*100}%` : '50%', background: 'var(--secondary)' }} />
                      </div>
                      <p style={{ marginTop: '1rem', fontSize: '0.75rem', opacity: 0.6, textAlign: 'center' }}>
                        {total === 0 ? "First time meeting! No history found." : `${players[showRivalryMatch.player1Id]?.name} vs ${players[showRivalryMatch.player2Id]?.name} all-time.`}
                      </p>
                    </div>
                  )
                })() : (
                  <p style={{ textAlign: 'center', opacity: 0.5 }}>Waiting for opponent...</p>
                )}
                
                <button className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem' }} onClick={() => setShowRivalryMatch(null)}>CLOSE</button>
              </div>
            </motion.div>
          )}

          {/* Confirm Cancel Tournament Modal */}
          {confirmCancel && (
            <motion.div className="modal-overlay" onClick={() => setConfirmCancel(false)}>
              <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h3 className="card-title">Cancel?</h3>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setConfirmCancel(false)}>No</button>
                  <button className="btn" style={{ flex: 1, background: 'var(--danger)', color: 'white' }} onClick={async () => { await supabase.from('tournaments').delete().eq('id', activeTournament?.id); setConfirmCancel(false); setView('home'); }}>Yes, Cancel</button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Confirm Shuffle Bracket Modal */}
          {confirmShuffle && (
            <motion.div className="modal-overlay" onClick={() => setConfirmShuffle(false)}>
              <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.2)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Shuffle size={20} className="accent-text" />
                  </div>
                  <h3 className="card-title" style={{ margin: 0 }}>Shuffle Bracket?</h3>
                </div>
                <p style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '1.5rem', lineHeight: 1.5 }}>
                  Are you sure you want to shuffle the bracket? This will regenerate and randomize all starting matchups. Any announced pairings will change.
                </p>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setConfirmShuffle(false)}>
                    Cancel
                  </button>
                  <button 
                    className="btn" 
                    style={{ flex: 1, background: 'var(--accent)', color: '#000', fontWeight: 700 }} 
                    onClick={() => {
                      setConfirmShuffle(false)
                      handleShuffleBracket()
                    }}
                  >
                    Yes, Shuffle
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Confirm Swap Players Modal */}
          {confirmSwap && (
            <motion.div className="modal-overlay" onClick={() => setConfirmSwap(null)}>
              <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.2)', border: '1px solid var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ArrowLeftRight size={20} color="var(--secondary)" />
                  </div>
                  <h3 className="card-title" style={{ margin: 0 }}>Swap Matchup?</h3>
                </div>
                <p style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '1.5rem', lineHeight: 1.5 }}>
                  Swap <strong>{players[confirmSwap.slotA.playerId]?.name || 'Player 1'}</strong> with <strong>{players[confirmSwap.slotB.playerId]?.name || 'Player 2'}</strong> in Round 1 matchups?
                </p>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setConfirmSwap(null)}>
                    Cancel
                  </button>
                  <button 
                    className="btn btn-primary" 
                    style={{ flex: 1 }} 
                    onClick={() => {
                      handleExecuteSwap(confirmSwap.slotA, confirmSwap.slotB)
                      setConfirmSwap(null)
                    }}
                  >
                    Confirm Swap
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Add Player to Bye Modal */}
          {showAddPlayerToByeModal && (
            <motion.div className="modal-overlay" onClick={() => {
              setShowAddPlayerToByeModal(false)
              setSelectedByeMatchId(null)
              setByeSelectedPlayerId(null)
              setByeNewPlayerName('')
              setByeSearchQuery('')
            }}>
              <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.2)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <UserPlus size={20} className="accent-text" />
                  </div>
                  <div>
                    <h3 className="card-title" style={{ margin: 0, fontSize: '1.15rem' }}>Add Player to Bracket</h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Fill an open Bye in Round 1 ({availableByes.length} available)
                    </span>
                  </div>
                </div>

                {/* Matchup Selection if multiple Byes */}
                {availableByes.length > 1 ? (
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem', display: 'block' }}>
                      Select Bye Matchup to Join:
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '120px', overflowY: 'auto' }}>
                      {availableByes.map(b => {
                        const oppId = b.player1Id || b.player2Id
                        const oppName = (oppId && players[oppId]?.name) || 'Unknown Player'
                        const isSelected = selectedByeMatchId === b.id
                        return (
                          <div 
                            key={b.id}
                            onClick={() => setSelectedByeMatchId(b.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '0.5rem 0.75rem',
                              borderRadius: '0.6rem',
                              background: isSelected ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                              border: `1.5px solid ${isSelected ? 'var(--accent)' : 'var(--glass-border)'}`,
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <Swords size={15} color={isSelected ? 'var(--accent)' : 'var(--text-muted)'} />
                              <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>vs {oppName}</span>
                            </div>
                            <span style={{ fontSize: '0.7rem', color: isSelected ? 'var(--accent)' : 'var(--text-muted)', fontWeight: 600 }}>
                              Round 1
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  (() => {
                    const b = availableByes[0]
                    const oppId = b ? (b.player1Id || b.player2Id) : null
                    const oppName = (oppId && players[oppId]?.name) || 'Player'
                    return (
                      <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)', padding: '0.5rem 0.75rem', borderRadius: '0.6rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Swords size={16} className="accent-text" />
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Matchup: vs <strong>{oppName}</strong> in Round 1</span>
                      </div>
                    )
                  })()
                )}

                {/* Tab Switch: Existing vs New Player */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', background: 'var(--bg-accent)', padding: '0.25rem', borderRadius: '0.75rem' }}>
                  <button 
                    type="button"
                    className="btn btn-ghost" 
                    onClick={() => setByeActiveTab('existing')}
                    style={{ 
                      flex: 1, 
                      padding: '0.4rem', 
                      fontSize: '0.75rem', 
                      borderRadius: '0.5rem',
                      background: byeActiveTab === 'existing' ? 'var(--bg-card)' : 'transparent',
                      color: byeActiveTab === 'existing' ? 'white' : 'var(--text-muted)',
                      fontWeight: byeActiveTab === 'existing' ? 700 : 500
                    }}
                  >
                    Registered Players
                  </button>
                  <button 
                    type="button"
                    className="btn btn-ghost" 
                    onClick={() => setByeActiveTab('new')}
                    style={{ 
                      flex: 1, 
                      padding: '0.4rem', 
                      fontSize: '0.75rem', 
                      borderRadius: '0.5rem',
                      background: byeActiveTab === 'new' ? 'var(--bg-card)' : 'transparent',
                      color: byeActiveTab === 'new' ? 'white' : 'var(--text-muted)',
                      fontWeight: byeActiveTab === 'new' ? 700 : 500
                    }}
                  >
                    + New Player
                  </button>
                </div>

                {byeActiveTab === 'existing' ? (
                  <div>
                    <input 
                      className="input" 
                      placeholder="Search available players..." 
                      value={byeSearchQuery} 
                      onChange={e => setByeSearchQuery(e.target.value)} 
                      style={{ marginBottom: '0.5rem' }} 
                    />
                    <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {(() => {
                        const candidates = Object.values(players)
                          .filter(p => !activeTournament?.config.players.includes(p.id))
                          .filter(p => p.name.toLowerCase().includes(byeSearchQuery.toLowerCase()))
                          .sort((a, b) => {
                            if (a.status === 'coming' && b.status !== 'coming') return -1
                            if (b.status === 'coming' && a.status !== 'coming') return 1
                            return a.name.localeCompare(b.name)
                          })

                        if (candidates.length === 0) {
                          return (
                            <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                              No unregistered players found. Tap "+ New Player" above to create one.
                            </div>
                          )
                        }

                        return candidates.map(p => {
                          const isSelected = byeSelectedPlayerId === p.id
                          return (
                            <div 
                              key={p.id}
                              onClick={() => setByeSelectedPlayerId(p.id)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '0.5rem 0.75rem',
                                borderRadius: '0.5rem',
                                background: isSelected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                                border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--glass-border)'}`,
                                cursor: 'pointer'
                              }}
                            >
                              <div>
                                <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{p.name}</span>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                                  {p.wins || 0}W - {p.losses || 0}L
                                </span>
                              </div>
                              {p.status === 'coming' && (
                                <span style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 700, background: 'rgba(16, 185, 129, 0.1)', padding: '0.1rem 0.4rem', borderRadius: '0.5rem' }}>
                                  Coming
                                </span>
                              )}
                            </div>
                          )
                        })
                      })()}
                    </div>
                  </div>
                ) : (
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem', display: 'block' }}>
                      Player Name:
                    </label>
                    <input 
                      className="input" 
                      placeholder="e.g. Jordan Spieth" 
                      value={byeNewPlayerName} 
                      onChange={e => setByeNewPlayerName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleConfirmAddPlayerToBye()}
                      autoFocus
                    />
                  </div>
                )}

                {/* Confirmation Footer */}
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                  <button 
                    className="btn btn-secondary" 
                    style={{ flex: 1 }} 
                    onClick={() => {
                      setShowAddPlayerToByeModal(false)
                      setSelectedByeMatchId(null)
                      setByeSelectedPlayerId(null)
                      setByeNewPlayerName('')
                      setByeSearchQuery('')
                    }}
                  >
                    Cancel
                  </button>
                  <button 
                    className="btn btn-primary" 
                    style={{ flex: 1.5 }} 
                    disabled={!selectedByeMatchId || (byeActiveTab === 'existing' ? !byeSelectedPlayerId : !byeNewPlayerName.trim())}
                    onClick={handleConfirmAddPlayerToBye}
                  >
                    Add to Bracket
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Finish Summary Modal */}
      <AnimatePresence>
        {showFinishSummary && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal-content" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} style={{ textAlign: 'center', padding: '2rem' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <Trophy size={64} className="accent-text" style={{ margin: '0 auto' }} />
              </div>
              <h2 style={{ marginBottom: '0.5rem' }}>Tournament Complete!</h2>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '1rem' }}>{showFinishSummary.winner}</div>
              <p style={{ opacity: 0.7, marginBottom: '2rem' }}>Total Payout: <span style={{ color: 'var(--accent)', fontWeight: 800 }}>${showFinishSummary.payout}</span></p>
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setShowFinishSummary(null)}>CLOSE</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isKioskMode && (
        <nav className="nav">
          <div className={`nav-item ${view === 'home' || view === 'bracket' ? 'active' : ''}`} onClick={handleGoHome}><Swords size={22} /><span>Bracket</span></div>
          <div className={`nav-item ${view === 'players' ? 'active' : ''}`} onClick={() => { haptic(); setView('players'); }}><User size={22} /><span>Players</span></div>
          <div className={`nav-item ${view === 'history' ? 'active' : ''}`} onClick={() => { haptic(); setView('history'); fetchData(); }}><History size={22} /><span>History</span></div>
          <div className={`nav-item ${view === 'settings' ? 'active' : ''}`} onClick={() => { haptic(); setView('settings'); }}><Settings2 size={22} /><span>Config</span></div>
        </nav>
      )}

      {deferredPrompt && (
        <div style={{ position: 'fixed', bottom: '80px', left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 100 }}>
          <button className="btn btn-primary" onClick={handleInstallClick}>INSTALL APP</button>
        </div>
      )}
    </div>
  )
}

export default App
