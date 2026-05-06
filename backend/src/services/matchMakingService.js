import { v4 as uuidv4 } from "uuid";

function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

function averageRating(players) {
  return players.reduce((sum, p) => sum + p.currentRating, 0) / players.length;
}

function totalGamesPlayed(players) {
  return players.reduce((sum, p) => sum + (p.gamesPlayed || 0), 0);
}

function teamGenderType(team) {
  const genders = team.map((p) => p.gender);

  if (genders.every((g) => g === "male")) return "male";
  if (genders.every((g) => g === "female")) return "female";

  return "mixed";
}

function isValidGenderMatch(teamA, teamB, genderBalanced) {
  if (!genderBalanced) return true;
  return teamGenderType(teamA) === teamGenderType(teamB);
}

function hasPartneredBefore(playerA, playerB) {
  return playerA.history.partners.includes(playerB.id);
}

function hasPlayedAgainstBefore(teamA, teamB) {
  return teamA.some((a) =>
    teamB.some((b) => a.history.opponents.includes(b.id))
  );
}

function getAllTeamCombos(players) {
  const teams = [];

  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      teams.push([players[i], players[j]]);
    }
  }

  return teams;
}

function playersOverlap(teamA, teamB) {
  const ids = teamA.map((p) => p.id);
  return teamB.some((p) => ids.includes(p.id));
}

function scoreMatch(teamA, teamB, event, strictGender = true) {
  if (playersOverlap(teamA, teamB)) {
    return Number.POSITIVE_INFINITY;
  }

  if (strictGender && !isValidGenderMatch(teamA, teamB, event.genderBalanced)) {
    return Number.POSITIVE_INFINITY;
  }

  const players = [...teamA, ...teamB];

  const totalGames = totalGamesPlayed(players);
  const teamRatingGap = Math.abs(averageRating(teamA) - averageRating(teamB));

  const teamGamesGap = Math.abs(
    totalGamesPlayed(teamA) - totalGamesPlayed(teamB)
  );

  const repeatPartnerCount =
    (hasPartneredBefore(teamA[0], teamA[1]) ? 1 : 0) +
    (hasPartneredBefore(teamB[0], teamB[1]) ? 1 : 0);

  const repeatOpponent = hasPlayedAgainstBefore(teamA, teamB);

  let score = 0;

  // MAIN PRIORITY: use players with fewer total games.
  score += totalGames * 100;

  // Keep teams fair.
  score += teamRatingGap * 15;

  // Prefer teams where both sides have similar play count.
  score += teamGamesGap * 8;

  // Avoid repeat partners if enabled.
  if (event.avoidRepeats) {
    score += repeatPartnerCount * 50;
  }

  // Avoid repeat opponents if enabled.
  if (event.avoidRepeats && repeatOpponent) {
    score += 50;
  }

  // If gender balance is enabled but this is fallback mode, penalize invalid gender match.
  if (
    event.genderBalanced &&
    !strictGender &&
    !isValidGenderMatch(teamA, teamB, event.genderBalanced)
  ) {
    score += 40;
  }

  score += Math.random() * 2;

  return score;
}

function findBestMatch(players, event, excludedPlayerIds = []) {
  const availablePlayers = players.filter(
    (player) => !excludedPlayerIds.includes(player.id)
  );

  if (availablePlayers.length < 4) return null;

  const teams = getAllTeamCombos(availablePlayers);

  let bestMatch = null;
  let bestScore = Number.POSITIVE_INFINITY;

  // Pass 1: strict gender rule.
  teams.forEach((teamA) => {
    teams.forEach((teamB) => {
      const score = scoreMatch(teamA, teamB, event, true);

      if (score < bestScore) {
        bestScore = score;
        bestMatch = { teamA, teamB };
      }
    });
  });

  if (bestMatch) return bestMatch;

  // Pass 2: fallback if gender rule makes matching impossible.
  teams.forEach((teamA) => {
    teams.forEach((teamB) => {
      const score = scoreMatch(teamA, teamB, event, false);

      if (score < bestScore) {
        bestScore = score;
        bestMatch = { teamA, teamB };
      }
    });
  });

  return bestMatch;
}

export function createMatches(event, mode = "current") {
  const eligiblePlayers = shuffle(
    event.players.filter(
      (player) => player.isAvailable && !player.isCurrentlyPlaying
    )
  ).sort((a, b) => {
    const gamesDiff = (a.gamesPlayed || 0) - (b.gamesPlayed || 0);

    if (gamesDiff !== 0) {
      return gamesDiff;
    }

    return b.currentRating - a.currentRating;
  });

  const maxMatches = Math.min(
    event.courtsAvailable,
    Math.floor(eligiblePlayers.length / 4)
  );

  const matches = [];
  const usedPlayerIds = [];

  while (matches.length < maxMatches) {
    const bestMatch = findBestMatch(eligiblePlayers, event, usedPlayerIds);

    if (!bestMatch) break;

    const { teamA, teamB } = bestMatch;

    usedPlayerIds.push(...teamA.map((p) => p.id));
    usedPlayerIds.push(...teamB.map((p) => p.id));

    matches.push({
      id: uuidv4(),
      courtNumber: matches.length + 1,
      round: event.currentRound + 1,
      teamA,
      teamB,
      scoreA: null,
      scoreB: null,
      status: mode === "queue" ? "queued" : "generated",
      generatedAt: new Date().toISOString(),
      startedAt: null,
      endedAt: null,
    });
  }

  return matches;
}

export function regenerateSingleMatch(event, oldMatch) {
  const mode = oldMatch.status === "queued" ? "queue" : "current";

  const otherPendingMatchPlayerIds = event.matches
    .filter(
      (match) =>
        match.id !== oldMatch.id &&
        ["generated", "queued", "started"].includes(match.status)
    )
    .flatMap((match) => [...match.teamA, ...match.teamB].map((p) => p.id));

  const eligiblePlayers = event.players.filter((player) => {
    return (
      player.isAvailable &&
      !player.isCurrentlyPlaying &&
      !otherPendingMatchPlayerIds.includes(player.id)
    );
  });

  if (eligiblePlayers.length < 4) return null;

  const temporaryEvent = {
    ...event,
    courtsAvailable: 1,
    players: eligiblePlayers,
  };

  const matches = createMatches(temporaryEvent, mode);

  if (matches.length === 0) return null;

  const newMatch = matches[0];

  return {
    ...newMatch,
    id: oldMatch.id,
    courtNumber: oldMatch.courtNumber,
    round: oldMatch.round,
    status: oldMatch.status,
    generatedAt: new Date().toISOString(),
  };
}

export function findReplacementPlayer(event, match, unavailablePlayerId) {
  const currentMatchPlayerIds = [...match.teamA, ...match.teamB].map(
    (player) => player.id
  );

  const unavailablePlayer = event.players.find(
    (player) => player.id === unavailablePlayerId
  );

  if (!unavailablePlayer) return null;

  const baseCandidates = event.players.filter((player) => {
    return (
      player.id !== unavailablePlayerId &&
      !currentMatchPlayerIds.includes(player.id) &&
      player.isAvailable &&
      !player.isCurrentlyPlaying
    );
  });

  if (baseCandidates.length === 0) return null;

  const getCandidateScore = (candidate, strictGender = true) => {
    const ratingDiff = Math.abs(
      candidate.currentRating - unavailablePlayer.currentRating
    );

    const gamesPlayed = candidate.gamesPlayed || 0;

    let score = 0;

    // Prefer replacements who have played less.
    score += gamesPlayed * 100;

    // Then prefer similar rating.
    score += ratingDiff * 10;

    const newTeamA = match.teamA.map((player) =>
      player.id === unavailablePlayerId ? candidate : player
    );

    const newTeamB = match.teamB.map((player) =>
      player.id === unavailablePlayerId ? candidate : player
    );

    if (
      strictGender &&
      !isValidGenderMatch(newTeamA, newTeamB, event.genderBalanced)
    ) {
      return Number.POSITIVE_INFINITY;
    }

    if (
      event.genderBalanced &&
      !strictGender &&
      !isValidGenderMatch(newTeamA, newTeamB, event.genderBalanced)
    ) {
      score += 40;
    }

    score += Math.random() * 2;

    return score;
  };

  let sortedCandidates = [...baseCandidates].sort(
    (a, b) => getCandidateScore(a, true) - getCandidateScore(b, true)
  );

  if (getCandidateScore(sortedCandidates[0], true) !== Number.POSITIVE_INFINITY) {
    return sortedCandidates[0];
  }

  sortedCandidates = [...baseCandidates].sort(
    (a, b) => getCandidateScore(a, false) - getCandidateScore(b, false)
  );

  return sortedCandidates[0];
}