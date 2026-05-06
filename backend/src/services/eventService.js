import { v4 as uuidv4 } from "uuid";
import { events } from "../data/memoryStore.js";
import { createMatches, findReplacementPlayer } from "./matchMakingService.js";
import { updateRatingsAfterMatch } from "./ratingService.js";

const RATING_VALUES = {
  newbie: 1,
  intermediate_beginner: 2,
  advanced_beginner: 3,
  low_intermediate: 4,
  high_intermediate: 5,
  advanced_pro: 6,
};

export function createEvent(data) {
  const event = {
    id: uuidv4(),
    name: data.name,
    sport: data.sport || "tennis",
    courtsAvailable: Number(data.courtsAvailable),
    genderBalanced: Boolean(data.genderBalanced),
    avoidRepeats: Boolean(data.avoidRepeats),
    players: [],
    matches: [],
    currentRound: 0,
    createdAt: new Date().toISOString(),
  };

  events.push(event);
  return event;
}

export function getEvent(eventId) {
  return events.find((event) => event.id === eventId);
}

export function addPlayer(eventId, data) {
  const event = getEvent(eventId);
  if (!event) return null;

  const player = {
    id: uuidv4(),
    name: data.name,
    gender: data.gender,
    selfRating: data.selfRating,
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    currentRating: RATING_VALUES[data.selfRating],
    isAvailable: data.isAvailable ?? true,
    isCurrentlyPlaying: false,
    history: {
      partners: [],
      opponents: [],
    },
  };

  event.players.push(player);
  return player;
}

export function updatePlayerAvailability(eventId, playerId, isAvailable) {
  const event = getEvent(eventId);
  if (!event) return null;

  const player = event.players.find((p) => p.id === playerId);
  if (!player) return null;

  player.isAvailable = Boolean(isAvailable);

  return player;
}

export function generateRound(eventId, mode = "current") {
  const event = getEvent(eventId);
  if (!event) return null;

  const matches = createMatches(event, mode);

  event.currentRound += 1;
  event.matches.push(...matches);

  return {
    round: event.currentRound,
    matches,
  };
}

export function replacePlayerInMatch(eventId, matchId, unavailablePlayerId) {
  const event = getEvent(eventId);
  if (!event) return null;

  const match = event.matches.find((m) => m.id === matchId);
  if (!match || match.status !== "generated") return null;

  const unavailablePlayer = event.players.find(
    (p) => p.id === unavailablePlayerId
  );

  if (!unavailablePlayer) return null;

  unavailablePlayer.isAvailable = false;

  const replacement = findReplacementPlayer(event, match, unavailablePlayerId);

  if (!replacement) return null;

  const replaceInTeam = (team) =>
    team.map((player) =>
      player.id === unavailablePlayerId ? replacement : player
    );

  match.teamA = replaceInTeam(match.teamA);
  match.teamB = replaceInTeam(match.teamB);

  return match;
}

export function startMatch(eventId, matchId) {
  const event = getEvent(eventId);
  if (!event) return null;

  const match = event.matches.find((m) => m.id === matchId);

  if (!match || !["generated", "queued"].includes(match.status)) return null;

  const players = [...match.teamA, ...match.teamB];

  const hasUnavailablePlayer = players.some(
    (player) => !player.isAvailable || player.isCurrentlyPlaying
  );

  if (hasUnavailablePlayer) return null;

  players.forEach((player) => {
    player.isCurrentlyPlaying = true;
  });

  match.status = "started";
  match.startedAt = new Date().toISOString();

  return match;
}

export function getAllEvents() {
  return events;
}

export function endMatch(eventId, matchId, data) {
  const event = getEvent(eventId);
  if (!event) return null;

  const match = event.matches.find((m) => m.id === matchId);

  if (!match || match.status !== "started") return null;

  match.scoreA = Number(data.scoreA);
  match.scoreB = Number(data.scoreB);
  match.status = "completed";
  match.endedAt = new Date().toISOString();

  updateRatingsAfterMatch(match);
  updatePlayerHistory(match);

  const teamAWon = match.scoreA > match.scoreB;

  const winners = teamAWon ? match.teamA : match.teamB;
  const losers = teamAWon ? match.teamB : match.teamA;

  winners.forEach((player) => {
    player.gamesPlayed = (player.gamesPlayed || 0) + 1;
    player.wins = (player.wins || 0) + 1;
    player.isCurrentlyPlaying = false;
  });

  losers.forEach((player) => {
    player.gamesPlayed = (player.gamesPlayed || 0) + 1;
    player.losses = (player.losses || 0) + 1;
    player.isCurrentlyPlaying = false;
  });

  return match;
}

function updatePlayerHistory(match) {
  const [a1, a2] = match.teamA;
  const [b1, b2] = match.teamB;

  a1.history.partners.push(a2.id);
  a2.history.partners.push(a1.id);

  b1.history.partners.push(b2.id);
  b2.history.partners.push(b1.id);

  match.teamA.forEach((a) => {
    match.teamB.forEach((b) => {
      a.history.opponents.push(b.id);
      b.history.opponents.push(a.id);
    });
  });
}