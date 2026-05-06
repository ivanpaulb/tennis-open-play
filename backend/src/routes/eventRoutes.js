import express from "express";
import {
  createEvent,
  getEvent,
  addPlayer,
  updatePlayerAvailability,
  generateRound,
  replacePlayerInMatch,
  startMatch,
  getAllEvents,
  endMatch,
} from "../controllers/eventController.js";

const router = express.Router();


router.post("/", createEvent);
router.get("/", getAllEvents);
router.get("/:eventId", getEvent);

router.post("/:eventId/players", addPlayer);
router.patch("/:eventId/players/:playerId/availability", updatePlayerAvailability);

router.post("/:eventId/generate-round", generateRound);

router.patch("/:eventId/matches/:matchId/replace-player", replacePlayerInMatch);
router.patch("/:eventId/matches/:matchId/start", startMatch);
router.patch("/:eventId/matches/:matchId/end", endMatch);

export default router;