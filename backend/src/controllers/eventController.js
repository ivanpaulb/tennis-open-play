import * as eventService from "../services/eventService.js";

export function getAllEvents(req, res) {
  const events = eventService.getAllEvents();
  res.json(events);
}

export function createEvent(req, res) {
  const event = eventService.createEvent(req.body);
  res.status(201).json(event);
}

export function getEvent(req, res) {
  const event = eventService.getEvent(req.params.eventId);

  if (!event) {
    return res.status(404).json({ message: "Event not found" });
  }

  res.json(event);
}

export function addPlayer(req, res) {
  const player = eventService.addPlayer(req.params.eventId, req.body);

  if (!player) {
    return res.status(404).json({ message: "Event not found" });
  }

  res.status(201).json(player);
}

export function updatePlayerAvailability(req, res) {
  const result = eventService.updatePlayerAvailability(
    req.params.eventId,
    req.params.playerId,
    req.body.isAvailable
  );

  if (!result) {
    return res.status(404).json({ message: "Event or player not found" });
  }

  res.json(result);
}

export function generateRound(req, res) {
  const result = eventService.generateRound(
    req.params.eventId,
    req.body.mode || "current"
  );

  if (!result) {
    return res.status(404).json({ message: "Event not found" });
  }

  res.json(result);
}

export function replacePlayerInMatch(req, res) {
  const result = eventService.replacePlayerInMatch(
    req.params.eventId,
    req.params.matchId,
    req.body.playerId
  );

  if (!result) {
    return res.status(400).json({
      message: "Could not replace player. No available replacement found.",
    });
  }

  res.json(result);
}

export function startMatch(req, res) {
  const result = eventService.startMatch(req.params.eventId, req.params.matchId);

  if (!result) {
    return res.status(400).json({ message: "Match cannot be started" });
  }

  res.json(result);
}

export function endMatch(req, res) {
  const result = eventService.endMatch(
    req.params.eventId,
    req.params.matchId,
    req.body
  );

  if (!result) {
    return res.status(400).json({ message: "Match cannot be ended" });
  }

  res.json(result);
}