function averageRating(players) {
  return players.reduce((sum, p) => sum + p.currentRating, 0) / players.length;
}

export function updateRatingsAfterMatch(match) {
  const ratingA = averageRating(match.teamA);
  const ratingB = averageRating(match.teamB);

  const teamAWon = match.scoreA > match.scoreB;
  const scoreDiff = Math.abs(match.scoreA - match.scoreB);
  const closeGame = scoreDiff <= 2;

  let winnerBonus = 0.2;
  let loserPenalty = closeGame ? 0.05 : 0.15;

  if (teamAWon && ratingA < ratingB) {
    winnerBonus += 0.3;
  }

  if (!teamAWon && ratingB < ratingA) {
    winnerBonus += 0.3;
  }

  const winners = teamAWon ? match.teamA : match.teamB;
  const losers = teamAWon ? match.teamB : match.teamA;

  winners.forEach((player) => {
    player.currentRating += winnerBonus;
  });

  losers.forEach((player) => {
    player.currentRating -= loserPenalty;

    if (player.currentRating < 1) {
      player.currentRating = 1;
    }
  });
}