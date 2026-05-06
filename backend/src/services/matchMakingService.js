import { v4 as uuidv4 } from "uuid";

function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

function averageRating(players) {
  return players.reduce((sum, p) => sum + p.currentRating, 0) / players.length;
}

function averageGamesPlayed(players) {
  return (
    players.reduce((sum, p) => sum + (p.gamesPlayed || 0), 0) / players.length
  );
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

function createTeams(players, avoidRepeats) {
  const availablePlayers = shuffle(players).sort((a, b) => {
    const gamesDiff = (a.gamesPlayed || 0) - (b.gamesPlayed || 0);

    if (gamesDiff !== 0) {
      return gamesDiff;
    }

    return b.currentRating - a.currentRating;
  });

  const teams = [];

  while (availablePlayers.length >= 2) {
    const playerA = availablePlayers.shift();

    let bestPartnerIndex = 0;
    let bestScore = Number.POSITIVE_INFINITY;

    availablePlayers.forEach((playerB, index) => {
      const ratingGap = Math.abs(playerA.currentRating - playerB.currentRating);
      const gamesGap = Math.abs(
        (playerA.gamesPlayed || 0) - (playerB.gamesPlayed || 0)
      );

      const alreadyPartnered = playerA.history.partners.includes(playerB.id);

      let score = 0;

      // Prefer strong + weaker pairing for balanced team creation.
      score -= ratingGap * 2;

      // Prefer pairing players with similar number of games.
      score += gamesGap * 3;

      // Avoid repeat partners.
      if (avoidRepeats && alreadyPartnered) {
        score += 100;
      }

      // Small randomness.
      score += Math.random() * 0.5;

      if (score < bestScore) {
        bestScore = score;
        bestPartnerIndex = index;
      }
    });

    const partner = availablePlayers.splice(bestPartnerIndex, 1)[0];

    teams.push([playerA, partner]);
  }

  return teams;
}

export function createMatches(event, mode = "current") {
  const eligiblePlayers = event.players.filter(
    (player) => player.isAvailable && !player.isCurrentlyPlaying
  );

  const maxMatches = Math.min(
    event.courtsAvailable,
    Math.floor(eligiblePlayers.length / 4)
  );

  const teams = createTeams(eligiblePlayers, event.avoidRepeats);

  teams.sort((a, b) => {
    const gamesDiff = averageGamesPlayed(a) - averageGamesPlayed(b);

    if (gamesDiff !== 0) {
      return gamesDiff;
    }

    return averageRating(b) - averageRating(a);
  });

  const matches = [];

  while (teams.length >= 2 && matches.length < maxMatches) {
    const teamA = teams.shift();

    let opponentIndex = -1;
    let bestOpponentScore = Number.POSITIVE_INFINITY;

    teams.forEach((teamB, index) => {
      const validGender = isValidGenderMatch(
        teamA,
        teamB,
        event.genderBalanced
      );

      if (!validGender) return;

      const teamRatingGap = Math.abs(averageRating(teamA) - averageRating(teamB));
      const teamGamesGap = Math.abs(
        averageGamesPlayed(teamA) - averageGamesPlayed(teamB)
      );

      const repeatOpponent = hasPlayedAgainstBefore(teamA, teamB);

      let score = 0;

      // Maintain balanced match strength.
      score += teamRatingGap * 10;

      // Prefer teams with similar games played.
      score += teamGamesGap * 5;

      // Avoid repeat opponents.
      if (event.avoidRepeats && repeatOpponent) {
        score += 100;
      }

      // Small randomness.
      score += Math.random() * 0.5;

      if (score < bestOpponentScore) {
        bestOpponentScore = score;
        opponentIndex = index;
      }
    });

    if (opponentIndex === -1) continue;

    const teamB = teams.splice(opponentIndex, 1)[0];

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

export function findReplacementPlayer(event, match, unavailablePlayerId) {
  const currentMatchPlayerIds = [...match.teamA, ...match.teamB].map(
    (player) => player.id
  );

  const unavailablePlayer = event.players.find(
    (player) => player.id === unavailablePlayerId
  );

  if (!unavailablePlayer) return null;

  const candidates = event.players.filter((player) => {
    return (
      player.id !== unavailablePlayerId &&
      !currentMatchPlayerIds.includes(player.id) &&
      player.isAvailable &&
      !player.isCurrentlyPlaying
    );
  });

  const validCandidates = candidates.filter((candidate) => {
    const newTeamA = match.teamA.map((player) =>
      player.id === unavailablePlayerId ? candidate : player
    );

    const newTeamB = match.teamB.map((player) =>
      player.id === unavailablePlayerId ? candidate : player
    );

    return isValidGenderMatch(newTeamA, newTeamB, event.genderBalanced);
  });

  if (validCandidates.length === 0) return null;

  validCandidates.sort((a, b) => {
    const unavailableGames = unavailablePlayer.gamesPlayed || 0;

    const gameDiffA = Math.abs((a.gamesPlayed || 0) - unavailableGames);
    const gameDiffB = Math.abs((b.gamesPlayed || 0) - unavailableGames);

    if (gameDiffA !== gameDiffB) {
      return gameDiffA - gameDiffB;
    }

    const ratingDiffA = Math.abs(a.currentRating - unavailablePlayer.currentRating);
    const ratingDiffB = Math.abs(b.currentRating - unavailablePlayer.currentRating);

    return ratingDiffA - ratingDiffB;
  });

  return validCandidates[0];
}