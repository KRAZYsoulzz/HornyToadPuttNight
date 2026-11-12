export interface Player {
  id: string;
  name: string;
  wins: number;
  losses: number;
  earnings: number;
  history: string[]; 
  status?: 'coming' | 'out' | null;
}

export interface Match {
  id: string;
  round: number;
  order: number;
  player1Id: string | null;
  player2Id: string | null;
  winnerId: string | null;
  score: string | null;
  nextMatchId: string | null;
  isConsolation?: boolean;
}

export interface TournamentConfig {
  type: 'one_and_done' | 'best_of_three';
  players: string[]; // list of player IDs
  addedCash: number;
  payoutPlaces: number;
  byeLogic: 'random' | 'lowest_wins';
  payoutSplits: number[];
  entryFee?: number;
  customLabel?: string;
}

export function generateBracket(config: TournamentConfig, players: Record<string, Player>): Match[] {
  const playerIds = [...config.players];
  const numPlayers = playerIds.length;
  
  // 1. Calculate bracket size (next power of 2)
  const totalSlots = Math.pow(2, Math.ceil(Math.log2(numPlayers)));
  const numMatches = totalSlots / 2;

  // 2. Sort Players for Byes if needed
  if (config.byeLogic === 'lowest_wins') {
    playerIds.sort((a, b) => (players[a]?.wins || 0) - (players[b]?.wins || 0));
  } else {
    // Shuffle playerIds for random starting order to ensure good baseline randomization
    playerIds.sort(() => Math.random() - 0.5);
  }

  // 3. Separate bye players and active match players
  const numByes = totalSlots - numPlayers;
  const byePlayers = playerIds.slice(0, numByes);
  const activeMatchPlayers = playerIds.slice(numByes);

  // 4. Pair active match players using advanced matchup avoidance logic
  const remainingActive = [...activeMatchPlayers];
  // Shuffle active players before pairing to add healthy unpredictability
  remainingActive.sort(() => Math.random() - 0.5);

  const activePairs: [string, string][] = [];

  while (remainingActive.length > 0) {
    const playerA = remainingActive.shift()!;
    let bestOpponentIdx = 0;
    let lowestScore = Infinity;

    for (let i = 0; i < remainingActive.length; i++) {
      const playerB = remainingActive[i];
      const history = players[playerA]?.history || [];
      
      let playCount = 0;
      let mostRecentIdx = -1;

      history.forEach((h, hIdx) => {
        if (h.startsWith(playerB + ':')) {
          playCount++;
          mostRecentIdx = hIdx;
        }
      });

      // Score formula prioritizing lower play counts, then older recency index
      const score = playCount * 100 + (mostRecentIdx + 1);

      if (score < lowestScore) {
        lowestScore = score;
        bestOpponentIdx = i;
      }
    }

    const playerB = remainingActive.splice(bestOpponentIdx, 1)[0];
    activePairs.push([playerA, playerB]);
  }

  // 5. Create Match Nodes
  const matches: Match[] = [];

  // Build the tree
  const createMatchNodes = () => {
    let currentRound = 1;
    let matchesInRound = numMatches;
    
    while (matchesInRound >= 1) {
      for (let i = 0; i < matchesInRound; i++) {
        const nextMatchId = (matchesInRound > 1) ? `r${currentRound + 1}-m${Math.floor(i / 2)}` : null;
        matches.push({
          id: `r${currentRound}-m${i}`,
          round: currentRound,
          order: i,
          player1Id: null,
          player2Id: null,
          winnerId: null,
          score: null,
          nextMatchId
        });
      }
      matchesInRound /= 2;
      currentRound++;
    }
  };

  createMatchNodes();

  // If we have at least 4 players and are paying out more than 1 place, add a consolation (3rd place) match node
  if (numPlayers >= 4 && config.payoutPlaces > 1) {
    const finalRoundNum = Math.ceil(Math.log2(numPlayers));
    matches.push({
      id: 'consolation',
      round: finalRoundNum,
      order: 0,
      player1Id: null,
      player2Id: null,
      winnerId: null,
      score: null,
      nextMatchId: null,
      isConsolation: true
    });
  }

  // 6. Fill Round 1 Matches in a balanced alternating mirror order
  const r1Matches = matches.filter(m => m.round === 1);
  const leftR1 = r1Matches.filter(m => m.order < numMatches / 2).sort((a, b) => a.order - b.order);
  const rightR1 = r1Matches.filter(m => m.order >= numMatches / 2).sort((a, b) => a.order - b.order);
  
  const orderedMatches: Match[] = [];
  for (let i = 0; i < numMatches / 2; i++) {
    if (leftR1[i]) orderedMatches.push(leftR1[i]);
    if (rightR1[i]) orderedMatches.push(rightR1[i]);
  }

  let matchIdx = 0;

  // First, assign all active matchups
  activePairs.forEach(([p1, p2]) => {
    const match = orderedMatches[matchIdx++];
    if (match) {
      match.player1Id = p1;
      match.player2Id = p2;
    }
  });

  // Second, assign all Bye players to the remaining matches
  byePlayers.forEach(p => {
    const match = orderedMatches[matchIdx++];
    if (match) {
      match.player1Id = p;
      match.player2Id = null; // Bye
    }
  });

  // Handle Byes (auto-advance)
  matches.filter(m => m.round === 1).forEach(m => {
    if (m.player1Id && !m.player2Id) {
      m.winnerId = m.player1Id;
      m.score = 'BYE';
      // Advance to next match
      const nextMatch = matches.find(nm => nm.id === m.nextMatchId);
      if (nextMatch) {
        if (m.order % 2 === 0) nextMatch.player1Id = m.player1Id;
        else nextMatch.player2Id = m.player1Id;
      }
    }
  });

  return matches;
}

export function calculatePayouts(pot: number, added: number, splits: number[]): number[] {
  const total = pot + added;
  return splits.map(s => Math.floor(total * (s / 100)));
}

export function getTournamentEntryFee(config?: TournamentConfig | null): number {
  if (!config) return 2;
  if (typeof config.entryFee === 'number' && !isNaN(config.entryFee)) {
    return config.entryFee;
  }
  return config.type === 'best_of_three' ? 5 : 2;
}

export function getTournamentPot(config?: TournamentConfig | null): number {
  if (!config) return 0;
  const fee = getTournamentEntryFee(config);
  const playerCount = (config.players || []).length;
  return (playerCount * fee) + (config.addedCash || 0);
}

export function getTournamentLabel(
  tournament: { id: string; config: TournamentConfig; created_at?: string },
  allTournaments: Array<{ id: string; config: TournamentConfig; created_at?: string }> = []
): string {
  if (tournament.config?.customLabel && tournament.config.customLabel.trim()) {
    return tournament.config.customLabel.trim();
  }

  const rawTs = parseInt(tournament.id);
  const dateObj = !isNaN(rawTs)
    ? new Date(rawTs)
    : (tournament.created_at ? new Date(tournament.created_at) : new Date());

  const month = dateObj.getMonth() + 1;
  const day = dateObj.getDate();
  const dateKey = `${dateObj.getFullYear()}-${month}-${day}`;
  const dateDisplay = `${month}/${day}`;

  const fee = getTournamentEntryFee(tournament.config);

  if (!allTournaments || allTournaments.length === 0) {
    return `${dateDisplay} $${fee} Bracket`;
  }

  // Filter tournaments on the same calendar day with the same entry fee
  const sameDaySameFee = allTournaments.filter(t => {
    const tTs = parseInt(t.id);
    const tDate = !isNaN(tTs)
      ? new Date(tTs)
      : (t.created_at ? new Date(t.created_at) : new Date());
    const tMonth = tDate.getMonth() + 1;
    const tDay = tDate.getDate();
    const tDateKey = `${tDate.getFullYear()}-${tMonth}-${tDay}`;
    const tFee = getTournamentEntryFee(t.config);
    return tDateKey === dateKey && tFee === fee;
  });

  // Sort chronologically ascending
  sameDaySameFee.sort((a, b) => {
    const aTs = parseInt(a.id) || (a.created_at ? new Date(a.created_at).getTime() : 0);
    const bTs = parseInt(b.id) || (b.created_at ? new Date(b.created_at).getTime() : 0);
    return aTs - bTs;
  });

  const index = sameDaySameFee.findIndex(t => t.id === tournament.id);
  const bracketNum = index >= 0 ? index + 1 : 1;

  return `${dateDisplay} $${fee} Bracket #${bracketNum}`;
}


/**
 * A completed match with a real score, not an auto-bye or walkover.
 * Walkovers (score 'WO') are administrative — they must not count toward
 * player wins, losses, history, or earnings. Tournament payout still happens
 * only when a director finishes the bracket.
 */
export function isRealResult(match: Match): boolean {
  return match.winnerId != null && match.score != null && match.score !== 'BYE' && match.score !== 'WO'
}

export type BracketSlotRef = {
  matchId: string
  slot: 'p1' | 'p2'
}

export type BracketEditResult =
  | { ok: true; matches: Match[] }
  | { ok: false; error: string }

function cloneMatches(matches: Match[]): Match[] {
  return matches.map(m => ({ ...m }))
}

function getSlot(match: Match, slot: 'p1' | 'p2'): string | null {
  return slot === 'p1' ? match.player1Id : match.player2Id
}

function setSlot(match: Match, slot: 'p1' | 'p2', playerId: string | null): void {
  if (slot === 'p1') match.player1Id = playerId
  else match.player2Id = playerId
}

function nextSlotField(match: Match): 'player1Id' | 'player2Id' {
  return match.order % 2 === 0 ? 'player1Id' : 'player2Id'
}

function findMatch(matches: Match[], id: string | null | undefined): Match | undefined {
  if (!id) return undefined
  return matches.find(m => m.id === id)
}

function nextIsUnplayed(matches: Match[], match: Match): boolean {
  const next = findMatch(matches, match.nextMatchId)
  return !next || !isRealResult(next)
}

function clearPlayerDownstream(matches: Match[], from: Match, playerId: string): void {
  let current: Match | undefined = from
  while (current?.nextMatchId) {
    const next = findMatch(matches, current.nextMatchId)
    if (!next || isRealResult(next)) break
    if (next.player1Id === playerId) next.player1Id = null
    if (next.player2Id === playerId) next.player2Id = null
    if (next.winnerId === playerId) {
      next.winnerId = null
      if (next.score === 'BYE' || next.score === 'WO') next.score = null
    }
    current = next
  }
}

function placeWinnerInNext(matches: Match[], from: Match, winnerId: string): void {
  const next = findMatch(matches, from.nextMatchId)
  if (!next || isRealResult(next)) return
  next[nextSlotField(from)] = winnerId
}

function applySinglePlayerBye(match: Match): void {
  const only = match.player1Id && !match.player2Id
    ? match.player1Id
    : !match.player1Id && match.player2Id
      ? match.player2Id
      : null
  if (only) {
    match.winnerId = only
    match.score = 'BYE'
  } else {
    match.winnerId = null
    match.score = null
  }
}

/**
 * Remove a player from their current unplayed match.
 * Round 1: their slot becomes a BYE and the opponent auto-advances.
 * Later rounds: the opponent gets a walkover (score WO) and advances.
 * Real completed results are left alone.
 */
export function removePlayerFromBracket(matches: Match[], playerId: string): BracketEditResult {
  if (!playerId) return { ok: false, error: 'No player selected' }
  const next = cloneMatches(matches)
  const occupied = next.filter(m => m.player1Id === playerId || m.player2Id === playerId)
  if (occupied.length === 0) return { ok: false, error: 'That player is not in this bracket' }

  const editable = occupied.filter(m => !isRealResult(m))
  if (editable.length === 0) {
    return { ok: false, error: 'This player already has a completed match, so they cannot be removed.' }
  }

  const current = [...editable].sort((a, b) => b.round - a.round || Number(!!b.isConsolation) - Number(!!a.isConsolation))[0]

  if (!nextIsUnplayed(next, current) && current.nextMatchId) {
    return { ok: false, error: 'The next-round match has already been played, so this player cannot be removed.' }
  }

  const opponentId = current.player1Id === playerId ? current.player2Id : current.player1Id

  clearPlayerDownstream(next, current, playerId)
  if (current.player1Id === playerId) current.player1Id = null
  else current.player2Id = null

  if (current.round === 1) {
    applySinglePlayerBye(current)
    if (current.score === 'BYE' && current.winnerId) {
      placeWinnerInNext(next, current, current.winnerId)
    }
  } else if (opponentId) {
    current.winnerId = opponentId
    current.score = 'WO'
    placeWinnerInNext(next, current, opponentId)
  } else {
    current.winnerId = null
    current.score = null
  }

  for (const m of next) {
    if (m.id === current.id) continue
    if (isRealResult(m)) continue
    if (m.player1Id !== playerId && m.player2Id !== playerId && m.winnerId !== playerId) continue
    if (m.player1Id === playerId) m.player1Id = null
    if (m.player2Id === playerId) m.player2Id = null
    applySinglePlayerBye(m)
  }

  return { ok: true, matches: next }
}

/**
 * Trade a first-round player with an empty BYE slot so a different player gets the bye.
 * Both first-round matches must be unplayed (BYE auto-advances are ok) and their next
 * matches must not have a real result. Re-resolves auto-advances after the swap.
 */
export function swapPlayerWithBye(
  matches: Match[],
  playerSlot: BracketSlotRef,
  byeSlot: BracketSlotRef
): BracketEditResult {
  const next = cloneMatches(matches)
  const playerMatch = findMatch(next, playerSlot.matchId)
  const byeMatch = findMatch(next, byeSlot.matchId)
  if (!playerMatch || !byeMatch) return { ok: false, error: 'Could not find those bracket slots' }
  if (playerMatch.round !== 1 || byeMatch.round !== 1) {
    return { ok: false, error: 'You can only swap a player with a BYE in Round 1' }
  }
  if (playerMatch.id === byeMatch.id) {
    return { ok: false, error: 'Pick a BYE in a different match' }
  }
  if (isRealResult(playerMatch) || isRealResult(byeMatch)) {
    return { ok: false, error: 'You can only swap unplayed first-round matches' }
  }
  if (!nextIsUnplayed(next, playerMatch) || !nextIsUnplayed(next, byeMatch)) {
    return { ok: false, error: 'The next-round match has already been played' }
  }

  const playerId = getSlot(playerMatch, playerSlot.slot)
  const byeOccupant = getSlot(byeMatch, byeSlot.slot)
  if (!playerId) return { ok: false, error: 'Select a player to swap' }
  if (byeOccupant) return { ok: false, error: 'That slot is not a BYE' }

  const prevPlayerWinner = playerMatch.score === 'BYE' ? playerMatch.winnerId : null
  const prevByeWinner = byeMatch.score === 'BYE' ? byeMatch.winnerId : null

  setSlot(byeMatch, byeSlot.slot, playerId)
  setSlot(playerMatch, playerSlot.slot, null)

  const resolve = (m: Match, prevWinner: string | null) => {
    applySinglePlayerBye(m)
    const nxt = findMatch(next, m.nextMatchId)
    if (!nxt || isRealResult(nxt)) return
    const field = nextSlotField(m)
    if (prevWinner && nxt[field] === prevWinner) nxt[field] = null
    if (nxt[field] === playerId && m.winnerId !== playerId) nxt[field] = null
    if (m.score === 'BYE' && m.winnerId) nxt[field] = m.winnerId
  }

  resolve(playerMatch, prevPlayerWinner)
  resolve(byeMatch, prevByeWinner)

  return { ok: true, matches: next }
}
