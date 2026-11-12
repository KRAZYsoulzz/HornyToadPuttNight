import {
  removePlayerFromBracket,
  swapPlayerWithBye,
  isRealResult,
  applyPaidLedgerOnRemove,
  computePlayersOwed,
  createBracketEditSnapshot,
  remainingOwedAfterRemoval,
  type Match,
  type TournamentConfig,
} from '../src/logic/tournament.ts'

function match(partial: Partial<Match> & Pick<Match, 'id' | 'round' | 'order'>): Match {
  return {
    player1Id: null,
    player2Id: null,
    winnerId: null,
    score: null,
    nextMatchId: null,
    ...partial,
  }
}

function config(players: string[], entryFee = 2): TournamentConfig {
  return {
    type: 'one_and_done',
    players,
    addedCash: 0,
    payoutPlaces: 1,
    byeLogic: 'random',
    payoutSplits: [100],
    entryFee,
  }
}

/** 2 players, no byes */
function twoPlayerBracket(): Match[] {
  return [
    match({ id: 'r1-m0', round: 1, order: 0, player1Id: 'A', player2Id: 'B', nextMatchId: null }),
  ]
}

/** 3 players, 4-slot, 1 bye */
function threePlayerBracket(): Match[] {
  return [
    match({ id: 'r1-m0', round: 1, order: 0, player1Id: 'A', player2Id: 'B', nextMatchId: 'r2-m0' }),
    match({ id: 'r1-m1', round: 1, order: 1, player1Id: 'C', player2Id: null, winnerId: 'C', score: 'BYE', nextMatchId: 'r2-m0' }),
    match({ id: 'r2-m0', round: 2, order: 0, player1Id: null, player2Id: 'C' }),
  ]
}

/** 5 players, 8-slot, 3 byes */
function fivePlayerBracket(): Match[] {
  return [
    match({ id: 'r1-m0', round: 1, order: 0, player1Id: 'A', player2Id: 'B', nextMatchId: 'r2-m0' }),
    match({ id: 'r1-m1', round: 1, order: 1, player1Id: 'C', player2Id: null, winnerId: 'C', score: 'BYE', nextMatchId: 'r2-m0' }),
    match({ id: 'r1-m2', round: 1, order: 2, player1Id: 'D', player2Id: null, winnerId: 'D', score: 'BYE', nextMatchId: 'r2-m1' }),
    match({ id: 'r1-m3', round: 1, order: 3, player1Id: 'E', player2Id: null, winnerId: 'E', score: 'BYE', nextMatchId: 'r2-m1' }),
    match({ id: 'r2-m0', round: 2, order: 0, player1Id: null, player2Id: 'C', nextMatchId: 'r3-m0' }),
    match({ id: 'r2-m1', round: 2, order: 1, player1Id: 'D', player2Id: 'E', nextMatchId: 'r3-m0' }),
    match({ id: 'r3-m0', round: 3, order: 0 }),
  ]
}

/** 6 players, 8-slot, 2 byes */
function sixPlayerBracket(): Match[] {
  return [
    match({ id: 'r1-m0', round: 1, order: 0, player1Id: 'A', player2Id: 'B', nextMatchId: 'r2-m0' }),
    match({ id: 'r1-m1', round: 1, order: 1, player1Id: 'C', player2Id: 'D', nextMatchId: 'r2-m0' }),
    match({ id: 'r1-m2', round: 1, order: 2, player1Id: 'E', player2Id: null, winnerId: 'E', score: 'BYE', nextMatchId: 'r2-m1' }),
    match({ id: 'r1-m3', round: 1, order: 3, player1Id: 'F', player2Id: null, winnerId: 'F', score: 'BYE', nextMatchId: 'r2-m1' }),
    match({ id: 'r2-m0', round: 2, order: 0, nextMatchId: 'r3-m0' }),
    match({ id: 'r2-m1', round: 2, order: 1, player1Id: 'E', player2Id: 'F', nextMatchId: 'r3-m0' }),
    match({ id: 'r3-m0', round: 3, order: 0 }),
  ]
}

/** 8 players, no byes */
function eightPlayerBracket(): Match[] {
  return [
    match({ id: 'r1-m0', round: 1, order: 0, player1Id: 'A', player2Id: 'B', nextMatchId: 'r2-m0' }),
    match({ id: 'r1-m1', round: 1, order: 1, player1Id: 'C', player2Id: 'D', nextMatchId: 'r2-m0' }),
    match({ id: 'r1-m2', round: 1, order: 2, player1Id: 'E', player2Id: 'F', nextMatchId: 'r2-m1' }),
    match({ id: 'r1-m3', round: 1, order: 3, player1Id: 'G', player2Id: 'H', nextMatchId: 'r2-m1' }),
    match({ id: 'r2-m0', round: 2, order: 0, nextMatchId: 'r3-m0' }),
    match({ id: 'r2-m1', round: 2, order: 1, nextMatchId: 'r3-m0' }),
    match({ id: 'r3-m0', round: 3, order: 0 }),
  ]
}

let failed = 0
function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`ok  ${name}`)
  } else {
    failed++
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

// --- remove / swap across bracket sizes ---
{
  const result = removePlayerFromBracket(twoPlayerBracket(), 'A')
  check('2-player: remove A succeeds', result.ok)
  if (result.ok) {
    const m = result.matches.find(x => x.id === 'r1-m0')!
    check('2-player: B gets the bye', m.player1Id === null && m.player2Id === 'B' && m.winnerId === 'B' && m.score === 'BYE')
  }
}

{
  const result = removePlayerFromBracket(threePlayerBracket(), 'A')
  check('3-player: remove R1 player succeeds', result.ok)
  if (result.ok) {
    const r1 = result.matches.find(m => m.id === 'r1-m0')!
    const r2 = result.matches.find(m => m.id === 'r2-m0')!
    check('3-player: B gets bye and advances', r1.winnerId === 'B' && r1.score === 'BYE' && r2.player1Id === 'B' && r2.player2Id === 'C')
  }
}

{
  const result = swapPlayerWithBye(threePlayerBracket(), { matchId: 'r1-m0', slot: 'p1' }, { matchId: 'r1-m1', slot: 'p2' })
  check('3-player: swap A with C bye succeeds', result.ok)
  if (result.ok) {
    const m0 = result.matches.find(m => m.id === 'r1-m0')!
    const m1 = result.matches.find(m => m.id === 'r1-m1')!
    const r2 = result.matches.find(m => m.id === 'r2-m0')!
    check('3-player: B has the bye, A plays C', m0.winnerId === 'B' && m0.score === 'BYE' && m1.player1Id === 'C' && m1.player2Id === 'A' && m1.winnerId === null)
    check('3-player: R2 auto-advance updates to B', r2.player1Id === 'B' && r2.player2Id === null)
  }
}

{
  const result = removePlayerFromBracket(fivePlayerBracket(), 'A')
  check('5-player: remove R1 player succeeds', result.ok)
  if (result.ok) {
    const r1 = result.matches.find(m => m.id === 'r1-m0')!
    const r2 = result.matches.find(m => m.id === 'r2-m0')!
    check('5-player: opponent gets BYE and advances', r1.player1Id === null && r1.player2Id === 'B' && r1.winnerId === 'B' && r1.score === 'BYE' && r2.player1Id === 'B' && r2.player2Id === 'C')
  }
}

{
  const result = swapPlayerWithBye(fivePlayerBracket(), { matchId: 'r1-m0', slot: 'p1' }, { matchId: 'r1-m1', slot: 'p2' })
  check('5-player: swap with BYE succeeds', result.ok)
  if (result.ok) {
    const m0 = result.matches.find(m => m.id === 'r1-m0')!
    const m1 = result.matches.find(m => m.id === 'r1-m1')!
    const r2 = result.matches.find(m => m.id === 'r2-m0')!
    check('5-player: A moves into BYE match vs C', m1.player1Id === 'C' && m1.player2Id === 'A' && m1.winnerId === null && m1.score === null)
    check('5-player: B now has the bye', m0.player1Id === null && m0.player2Id === 'B' && m0.winnerId === 'B' && m0.score === 'BYE')
    check('5-player: R2 updates auto-advance', r2.player1Id === 'B' && r2.player2Id === null)
  }
}

{
  const result = swapPlayerWithBye(sixPlayerBracket(), { matchId: 'r1-m0', slot: 'p2' }, { matchId: 'r1-m2', slot: 'p2' })
  check('6-player: swap B with E bye succeeds', result.ok)
  if (result.ok) {
    const m0 = result.matches.find(m => m.id === 'r1-m0')!
    const m2 = result.matches.find(m => m.id === 'r1-m2')!
    const r2 = result.matches.find(m => m.id === 'r2-m1')!
    check('6-player: A gets the bye', m0.player1Id === 'A' && m0.player2Id === null && m0.winnerId === 'A' && m0.score === 'BYE')
    check('6-player: E now plays B', m2.player1Id === 'E' && m2.player2Id === 'B' && m2.winnerId === null)
    check('6-player: E is cleared from next until they win', r2.player1Id !== 'E' || m2.winnerId === 'E')
  }
}

{
  const result = removePlayerFromBracket(eightPlayerBracket(), 'A')
  check('8-player: remove unplayed R1 succeeds', result.ok)
  if (result.ok) {
    const r1 = result.matches.find(m => m.id === 'r1-m0')!
    const r2 = result.matches.find(m => m.id === 'r2-m0')!
    check('8-player: B walkover-as-bye and advances', r1.winnerId === 'B' && r1.score === 'BYE' && r2.player1Id === 'B')
  }
}

// completed match + later-round walkover (5-player)
{
  const played = fivePlayerBracket()
  const r1 = played.find(m => m.id === 'r1-m0')!
  r1.winnerId = 'A'
  r1.score = '3-1'
  const r2 = played.find(m => m.id === 'r2-m0')!
  r2.player1Id = 'A'
  check('cannot remove a player with only a completed match', !removePlayerFromBracket(played, 'B').ok)
  const result = removePlayerFromBracket(played, 'A')
  check('remove from unplayed later round succeeds', result.ok)
  if (result.ok) {
    const r1kept = result.matches.find(m => m.id === 'r1-m0')!
    const r2now = result.matches.find(m => m.id === 'r2-m0')!
    const final = result.matches.find(m => m.id === 'r3-m0')!
    check('completed R1 stays as it was', r1kept.winnerId === 'A' && r1kept.score === '3-1' && r1kept.player1Id === 'A' && r1kept.player2Id === 'B')
    check('R2 opponent gets walkover', r2now.player1Id === null && r2now.player2Id === 'C' && r2now.winnerId === 'C' && r2now.score === 'WO')
    check('walkover winner advances to final', final.player1Id === 'C')
  }
}

{
  const played = fivePlayerBracket()
  played.find(m => m.id === 'r2-m1')!.winnerId = 'D'
  played.find(m => m.id === 'r2-m1')!.score = '2-0'
  check('cannot swap when next match is already played', !swapPlayerWithBye(played, { matchId: 'r1-m2', slot: 'p1' }, { matchId: 'r1-m3', slot: 'p2' }).ok)
}

{
  check('BYE is not a real result', !isRealResult(match({ id: 'x', round: 1, order: 0, winnerId: 'A', score: 'BYE' })))
  check('WO is not a real result (no W/L or earnings)', !isRealResult(match({ id: 'x', round: 2, order: 0, winnerId: 'A', score: 'WO' })))
  check('scored match is a real result', isRealResult(match({ id: 'x', round: 1, order: 0, winnerId: 'A', score: '3-1' })))
}

// --- undo snapshot / restore ---
{
  const original = fivePlayerBracket()
  const cfg = config(['A', 'B', 'C', 'D', 'E'])
  const snap = createBracketEditSnapshot({
    matches: original,
    config: cfg,
    paidTonight: ['A'],
    refundsTonight: [],
    label: 'Removed A',
  })
  const removed = removePlayerFromBracket(original, 'A')
  check('snapshot is a deep copy (mutating result does not change snapshot)', removed.ok && snap.matches.find(m => m.id === 'r1-m0')!.player1Id === 'A')
  const ledger = applyPaidLedgerOnRemove({
    playerId: 'A',
    name: 'Alice',
    tournamentId: 't1',
    entryFee: 2,
    owedBefore: 2,
    paidTonight: ['A'],
    refundsTonight: [],
  })
  check('after remove, paid mark cleared and refund flagged', ledger.paidTonight.length === 0 && ledger.refundsTonight.length === 1 && ledger.refundDue === 2)
  // restore
  check('undo restores matches', snap.matches.find(m => m.id === 'r1-m0')!.player1Id === 'A' && snap.matches.find(m => m.id === 'r1-m0')!.player2Id === 'B')
  check('undo restores player list', snap.config.players.join() === 'A,B,C,D,E')
  check('undo restores paid mark and clears refund flag', snap.paidTonight.join() === 'A' && snap.refundsTonight.length === 0)
}

{
  const original = threePlayerBracket()
  const snap = createBracketEditSnapshot({
    matches: original,
    config: config(['A', 'B', 'C']),
    paidTonight: [],
    refundsTonight: [],
    label: 'Swapped A with a BYE',
  })
  const swapped = swapPlayerWithBye(original, { matchId: 'r1-m0', slot: 'p1' }, { matchId: 'r1-m1', slot: 'p2' })
  check('bye-swap snapshot stays at original pairing', snap.matches.find(m => m.id === 'r1-m0')!.player1Id === 'A' && snap.matches.find(m => m.id === 'r1-m1')!.player2Id === null)
  check('bye-swap itself changed the live bracket', swapped.ok && swapped.matches.find(m => m.id === 'r1-m1')!.player2Id === 'A')
}

// --- paid / unpaid / multi-bracket ledger ---
{
  const unpaid = applyPaidLedgerOnRemove({
    playerId: 'A',
    name: 'Alice',
    tournamentId: 't1',
    entryFee: 2,
    owedBefore: 2,
    paidTonight: [],
    refundsTonight: [],
  })
  check('unpaid remove: no refund flag, paid list unchanged', unpaid.refundDue === 0 && unpaid.paidTonight.length === 0 && unpaid.refundsTonight.length === 0)
}

{
  const paid = applyPaidLedgerOnRemove({
    playerId: 'A',
    name: 'Alice',
    tournamentId: 't1',
    entryFee: 2,
    owedBefore: 2,
    paidTonight: ['A', 'B'],
    refundsTonight: [],
  })
  check('paid remove, no other brackets: clear paid mark', !paid.paidTonight.includes('A') && paid.paidTonight.join() === 'B')
  check('paid remove, no other brackets: refund flag for $2', paid.refundDue === 2 && paid.refundsTonight[0]?.amount === 2 && paid.refundsTonight[0]?.playerId === 'A')
}

{
  const multi = applyPaidLedgerOnRemove({
    playerId: 'A',
    name: 'Alice',
    tournamentId: 't-active',
    entryFee: 2,
    owedBefore: 7, // $2 here + $5 other bracket tonight
    paidTonight: ['A'],
    refundsTonight: [],
  })
  check('paid remove, still owes other bracket: keep paid mark', multi.paidTonight.join() === 'A')
  check('paid remove, still owes other bracket: refund flag only for this fee', multi.refundDue === 2 && multi.refundsTonight[0]?.amount === 2)
  check('remaining owed after removal is the other bracket', remainingOwedAfterRemoval(7, 2) === 5)
}

{
  const first = applyPaidLedgerOnRemove({
    playerId: 'A',
    name: 'Alice',
    tournamentId: 't1',
    entryFee: 2,
    owedBefore: 2,
    paidTonight: ['A'],
    refundsTonight: [],
  })
  const again = applyPaidLedgerOnRemove({
    playerId: 'A',
    name: 'Alice',
    tournamentId: 't1',
    entryFee: 2,
    owedBefore: 0,
    paidTonight: first.paidTonight,
    refundsTonight: first.refundsTonight,
  })
  check('does not duplicate refund flag for the same tournament', again.refundsTonight.length === 1)
}

{
  const now = new Date('2026-11-12T19:00:00-06:00')
  const todayA = Date.parse('2026-11-12T18:00:00-06:00').toString()
  const todayB = Date.parse('2026-11-12T20:00:00-06:00').toString()
  const yesterday = Date.parse('2026-11-11T18:00:00-06:00').toString()
  const active = {
    id: todayA,
    config: config(['A', 'B', 'C'], 2),
    matches: threePlayerBracket(),
    isActive: true,
  }
  const otherTonight = {
    id: todayB,
    config: config(['A', 'D'], 5),
    matches: [
      match({ id: 'r1-m0', round: 1, order: 0, player1Id: 'A', player2Id: 'D', winnerId: 'A', score: '3-1', nextMatchId: null }),
    ],
  }
  const old = {
    id: yesterday,
    config: config(['A'], 2),
    matches: [match({ id: 'r1-m0', round: 1, order: 0, player1Id: 'A', winnerId: 'A', score: 'BYE', nextMatchId: null })],
  }
  const owed = computePlayersOwed(['A', 'B', 'C', 'D'], [active, otherTonight, old], todayA, now)
  check('multi-bracket owing: A owes $2 + $5 tonight', owed.A === 7)
  check('multi-bracket owing: B and C owe only the active $2', owed.B === 2 && owed.C === 2)
  check('multi-bracket owing: D owes only the completed $5', owed.D === 5)
  check('yesterday tournament is not counted', owed.A !== 9)

  const afterRemoveA = computePlayersOwed(
    ['A', 'B', 'C', 'D'],
    [{ ...active, config: config(['B', 'C'], 2) }, otherTonight, old],
    todayA,
    now,
  )
  check('after removing A from active, A still owes $5 for the other bracket', afterRemoveA.A === 5)
  check('after removing A, B and C still owe $2', afterRemoveA.B === 2 && afterRemoveA.C === 2)
}

if (failed) {
  console.error(`\n${failed} check(s) failed`)
  process.exit(1)
}
console.log('\nAll bracket-edit checks passed')
