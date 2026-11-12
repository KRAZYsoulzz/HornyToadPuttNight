import {
  removePlayerFromBracket,
  swapPlayerWithBye,
  isRealResult,
  type Match,
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

function fivePlayerBracket(): Match[] {
  // 8-slot / 4 R1 matches: one real match + 3 byes, then semis + final
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

let failed = 0
function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`ok  ${name}`)
  } else {
    failed++
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

// 1. Remove a first-round player from an unplayed match: opponent gets the bye and advances
{
  const result = removePlayerFromBracket(fivePlayerBracket(), 'A')
  check('remove R1 player succeeds', result.ok)
  if (result.ok) {
    const r1 = result.matches.find(m => m.id === 'r1-m0')!
    const r2 = result.matches.find(m => m.id === 'r2-m0')!
    check('R1 slot becomes BYE for opponent', r1.player1Id === null && r1.player2Id === 'B' && r1.winnerId === 'B' && r1.score === 'BYE')
    check('opponent auto-advances to next match', r2.player1Id === 'B' && r2.player2Id === 'C')
  }
}

// 2. Swap a player with a BYE slot (A trades with C's empty slot)
{
  const result = swapPlayerWithBye(
    fivePlayerBracket(),
    { matchId: 'r1-m0', slot: 'p1' },
    { matchId: 'r1-m1', slot: 'p2' },
  )
  check('swap with BYE succeeds', result.ok)
  if (result.ok) {
    const m0 = result.matches.find(m => m.id === 'r1-m0')!
    const m1 = result.matches.find(m => m.id === 'r1-m1')!
    const r2 = result.matches.find(m => m.id === 'r2-m0')!
    check('A moves into the BYE match vs C', m1.player1Id === 'C' && m1.player2Id === 'A' && m1.winnerId === null && m1.score === null)
    check('B now has the bye', m0.player1Id === null && m0.player2Id === 'B' && m0.winnerId === 'B' && m0.score === 'BYE')
    check('R2 updates auto-advance (B in, C out)', r2.player1Id === 'B' && r2.player2Id === null)
  }
}

// 3. Cannot remove a player after a real result, even if they lost and are done
{
  const played = fivePlayerBracket()
  const r1 = played.find(m => m.id === 'r1-m0')!
  r1.winnerId = 'A'
  r1.score = '3-1'
  const r2 = played.find(m => m.id === 'r2-m0')!
  r2.player1Id = 'A'
  const result = removePlayerFromBracket(played, 'B')
  check('cannot remove a player with only a completed match', !result.ok)
}

// 4. Later-round unplayed: opponent gets a walkover and advances
{
  const played = fivePlayerBracket()
  const r1 = played.find(m => m.id === 'r1-m0')!
  r1.winnerId = 'A'
  r1.score = '3-1'
  const r2 = played.find(m => m.id === 'r2-m0')!
  r2.player1Id = 'A'
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

// 5. Cannot swap once the next-round match has a real result
{
  const played = fivePlayerBracket()
  const r2 = played.find(m => m.id === 'r2-m1')!
  r2.winnerId = 'D'
  r2.score = '2-0'
  const result = swapPlayerWithBye(
    played,
    { matchId: 'r1-m2', slot: 'p1' },
    { matchId: 'r1-m3', slot: 'p2' },
  )
  check('cannot swap when next match is already played', !result.ok)
}

// 6. isRealResult treats BYE and WO as not real results
{
  check('BYE is not a real result', !isRealResult(match({ id: 'x', round: 1, order: 0, winnerId: 'A', score: 'BYE' })))
  check('WO is not a real result', !isRealResult(match({ id: 'x', round: 2, order: 0, winnerId: 'A', score: 'WO' })))
  check('scored match is a real result', isRealResult(match({ id: 'x', round: 1, order: 0, winnerId: 'A', score: '3-1' })))
}

if (failed) {
  console.error(`\n${failed} check(s) failed`)
  process.exit(1)
}
console.log('\nAll bracket-edit checks passed')
