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

