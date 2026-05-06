import { useEffect, useState } from "react";
import api from "./api";
import { useParams } from "react-router-dom";

const ratings = [
  { label: "Newbie", value: "newbie" },
  { label: "Intermediate Beginner", value: "intermediate_beginner" },
  { label: "Advanced Beginner", value: "advanced_beginner" },
  { label: "Low Intermediate", value: "low_intermediate" },
  { label: "High Intermediate", value: "high_intermediate" },
  { label: "Advanced / Pro", value: "advanced_pro" },
];

function App() {
  const [event, setEvent] = useState(null);
  const { eventId } = useParams();

  const [eventForm, setEventForm] = useState({
    name: "Tennis Open Play",
    sport: "tennis",
    courtsAvailable: 1,
    genderBalanced: true,
    avoidRepeats: true,
  });

  const [playerForm, setPlayerForm] = useState({
    name: "",
    gender: "male",
    selfRating: "newbie",
    isAvailable: true,
  });

  const [scoreModal, setScoreModal] = useState({
    show: false,
    match: null,
    scoreA: "",
    scoreB: "",
  });

  useEffect(() => {
    if (eventId) {
      fetchEvent();
    }
  }, [eventId]);

  const fetchEvent = async () => {
    const res = await api.get(`/events/${eventId}`);
    setEvent(res.data);
  };

  const createEvent = async (e) => {
    e.preventDefault();

    const res = await api.post("/events", eventForm);
    setEvent(res.data);
  };

  const refreshEvent = async () => {
    if (!event) return;

    const res = await api.get(`/events/${event.id}`);
    setEvent(res.data);
  };

  const addPlayer = async (e) => {
    e.preventDefault();

    const res = await api.post(`/events/${event.id}/players`, {
      name: playerForm.name,
      gender: playerForm.gender,
      selfRating: playerForm.selfRating,
    });

    if (!playerForm.isAvailable) {
      await api.patch(
        `/events/${event.id}/players/${res.data.id}/availability`,
        {
          isAvailable: false,
        }
      );
    }

    setPlayerForm({
      name: "",
      gender: "male",
      selfRating: "newbie",
      isAvailable: true,
    });

    await refreshEvent();
  };

  const toggleAvailability = async (player) => {
    await api.patch(`/events/${event.id}/players/${player.id}/availability`, {
      isAvailable: !player.isAvailable,
    });

    await refreshEvent();
  };

  const generateCurrentMatchups = async () => {
    await api.post(`/events/${event.id}/generate-round`, {
      mode: "current",
    });

    await refreshEvent();
  };

  const generateNextQueue = async () => {
    await api.post(`/events/${event.id}/generate-round`, {
      mode: "queue",
    });

    await refreshEvent();
  };

  const replacePlayer = async (matchId, playerId) => {
    try {
      await api.patch(`/events/${event.id}/matches/${matchId}/replace-player`, {
        playerId,
      });

      await refreshEvent();
    } catch (error) {
      alert("No available replacement player found.");
    }
  };

  const startMatch = async (matchId) => {
    try {
      await api.patch(`/events/${event.id}/matches/${matchId}/start`);
      await refreshEvent();
    } catch (error) {
      alert("Cannot start match. One or more players may be unavailable.");
    }
  };

  const openEndMatchModal = (match) => {
    setScoreModal({
      show: true,
      match,
      scoreA: "",
      scoreB: "",
    });
  };

  const submitScore = async (e) => {
    e.preventDefault();

    await api.patch(`/events/${event.id}/matches/${scoreModal.match.id}/end`, {
      scoreA: scoreModal.scoreA,
      scoreB: scoreModal.scoreB,
    });

    setScoreModal({
      show: false,
      match: null,
      scoreA: "",
      scoreB: "",
    });

    await refreshEvent();
  };

  if (!event) {
    return (
      <div className="container py-4">
        <h1 className="mb-4">Open Play Matchmaking MVP</h1>

        <div className="card">
          <div className="card-header">Create Open Play Event</div>

          <div className="card-body">
            <form onSubmit={createEvent}>
              <div className="mb-3">
                <label className="form-label">Event Name</label>
                <input
                  className="form-control"
                  value={eventForm.name}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, name: e.target.value })
                  }
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Sport</label>
                <select
                  className="form-select"
                  value={eventForm.sport}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, sport: e.target.value })
                  }
                >
                  <option value="tennis">Tennis</option>
                  <option value="pickleball">Pickleball</option>
                  <option value="badminton">Badminton</option>
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label">Courts Available</label>
                <input
                  type="number"
                  className="form-control"
                  value={eventForm.courtsAvailable}
                  onChange={(e) =>
                    setEventForm({
                      ...eventForm,
                      courtsAvailable: e.target.value,
                    })
                  }
                />
              </div>

              <div className="form-check mb-2">
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={eventForm.genderBalanced}
                  onChange={(e) =>
                    setEventForm({
                      ...eventForm,
                      genderBalanced: e.target.checked,
                    })
                  }
                />

                <label className="form-check-label">
                  Gender-balanced matchups
                </label>
              </div>

              <div className="form-check mb-3">
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={eventForm.avoidRepeats}
                  onChange={(e) =>
                    setEventForm({
                      ...eventForm,
                      avoidRepeats: e.target.checked,
                    })
                  }
                />

                <label className="form-check-label">
                  Avoid repeat partners/opponents
                </label>
              </div>

              <button className="btn btn-primary">Create Event</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const currentMatches = event.matches.filter(
    (match) => match.status === "generated" || match.status === "started"
  );

  const queuedMatches = event.matches.filter(
    (match) => match.status === "queued"
  );

  const completedMatches = event.matches.filter(
    (match) => match.status === "completed"
  );

  const completedMatchesByRound = completedMatches.reduce((acc, match) => {
    acc[match.round] = acc[match.round] || [];
    acc[match.round].push(match);
    return acc;
  }, {});

  const availablePlayersCount = event.players.filter(
    (player) => player.isAvailable && !player.isCurrentlyPlaying
  ).length;

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <h1>{event.name}</h1>

          <p className="mb-0">
            Sport: <strong>{event.sport}</strong> | Courts:{" "}
            <strong>{event.courtsAvailable}</strong>
          </p>

          <p>
            Gender Balanced:{" "}
            <strong>{event.genderBalanced ? "Yes" : "No"}</strong> | Avoid
            Repeats: <strong>{event.avoidRepeats ? "Yes" : "No"}</strong>
          </p>
        </div>

        <div className="d-flex gap-2">
          <button
            className="btn btn-primary"
            onClick={generateCurrentMatchups}
            disabled={availablePlayersCount < 4}
          >
            Generate Current
          </button>

          <button
            className="btn btn-outline-primary"
            onClick={generateNextQueue}
            disabled={availablePlayersCount < 4}
          >
            Generate Next Queue
          </button>
        </div>
      </div>

      <div className="row">
        <div className="col-md-4">
          <div className="card mb-4">
            <div className="card-header">Add Player</div>

            <div className="card-body">
              <form onSubmit={addPlayer}>
                <div className="mb-3">
                  <label className="form-label">Player Name</label>
                  <input
                    className="form-control"
                    value={playerForm.name}
                    onChange={(e) =>
                      setPlayerForm({ ...playerForm, name: e.target.value })
                    }
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Gender</label>

                  <select
                    className="form-select"
                    value={playerForm.gender}
                    onChange={(e) =>
                      setPlayerForm({ ...playerForm, gender: e.target.value })
                    }
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label">Self Rating</label>

                  <select
                    className="form-select"
                    value={playerForm.selfRating}
                    onChange={(e) =>
                      setPlayerForm({
                        ...playerForm,
                        selfRating: e.target.value,
                      })
                    }
                  >
                    {ratings.map((rating) => (
                      <option key={rating.value} value={rating.value}>
                        {rating.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-check mb-3">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={playerForm.isAvailable}
                    onChange={(e) =>
                      setPlayerForm({
                        ...playerForm,
                        isAvailable: e.target.checked,
                      })
                    }
                  />

                  <label className="form-check-label">
                    Present / Available now
                  </label>
                </div>

                <button className="btn btn-success w-100">Add Player</button>
              </form>
            </div>
          </div>

          <div className="card">
            <div className="card-header">Players</div>

            <div className="card-body">
              {event.players.map((player) => (
                <div
                  key={player.id}
                  className="border rounded p-2 mb-2 d-flex justify-content-between align-items-center"
                >
                  <div>
                    <strong>{player.name}</strong>

                    <br />

                    <small>
                      {player.gender} | Rating:{" "}
                      {player.currentRating.toFixed(2)}
                    </small>

                    <br />

                    <span
                      className={`badge ${player.isAvailable ? "bg-success" : "bg-secondary"
                        }`}
                    >
                      {player.isAvailable ? "Available" : "Not Available"}
                    </span>

                    {" "}

                    {player.isCurrentlyPlaying && (
                      <span className="badge bg-warning text-dark">
                        Playing
                      </span>
                    )}
                  </div>

                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => toggleAvailability(player)}
                    disabled={player.isCurrentlyPlaying}
                  >
                    {player.isAvailable ? "Mark Out" : "Mark In"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col-md-8">
          <h3 className="mb-3">Current Courts</h3>

          {currentMatches.length === 0 && (
            <div className="alert alert-info">
              No active court matchups yet.
            </div>
          )}

          <div className="row mb-5">
            {currentMatches.map((match) => (
              <div key={match.id} className="col-md-6 mb-3">
                <MatchCard
                  match={match}
                  replacePlayer={replacePlayer}
                  startMatch={startMatch}
                  openEndMatchModal={openEndMatchModal}
                />
              </div>
            ))}
          </div>

          <h3 className="mb-3">Next Queue</h3>

          {queuedMatches.length === 0 && (
            <div className="alert alert-secondary">No queued matchups yet.</div>
          )}

          <div className="row mb-5">
            {queuedMatches.map((match) => (
              <div key={match.id} className="col-md-6 mb-3">
                <MatchCard
                  match={match}
                  replacePlayer={replacePlayer}
                  startMatch={startMatch}
                  openEndMatchModal={openEndMatchModal}
                />
              </div>
            ))}
          </div>

          <h3 className="mb-3">Match History</h3>

          {completedMatches.length === 0 && (
            <div className="alert alert-secondary">
              No completed matches yet.
            </div>
          )}

          {Object.entries(completedMatchesByRound).map(([round, matches]) => (
            <div key={round} className="mb-4">
              <h5>Round {round}</h5>

              <div className="row">
                {matches.map((match) => (
                  <div key={match.id} className="col-md-6 mb-3">
                    <MatchCard
                      match={match}
                      replacePlayer={replacePlayer}
                      startMatch={startMatch}
                      openEndMatchModal={openEndMatchModal}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {scoreModal.show && (
        <div
          className="modal d-block"
          style={{
            backgroundColor: "rgba(0,0,0,0.5)",
          }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <form onSubmit={submitScore}>
                <div className="modal-header">
                  <h5 className="modal-title">Enter Match Score</h5>

                  <button
                    type="button"
                    className="btn-close"
                    onClick={() =>
                      setScoreModal({
                        show: false,
                        match: null,
                        scoreA: "",
                        scoreB: "",
                      })
                    }
                  />
                </div>

                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Team A Score</label>

                    <input
                      type="number"
                      className="form-control"
                      value={scoreModal.scoreA}
                      onChange={(e) =>
                        setScoreModal({
                          ...scoreModal,
                          scoreA: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Team B Score</label>

                    <input
                      type="number"
                      className="form-control"
                      value={scoreModal.scoreB}
                      onChange={(e) =>
                        setScoreModal({
                          ...scoreModal,
                          scoreB: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() =>
                      setScoreModal({
                        show: false,
                        match: null,
                        scoreA: "",
                        scoreB: "",
                      })
                    }
                  >
                    Cancel
                  </button>

                  <button className="btn btn-primary">Save Score</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MatchCard({
  match,
  replacePlayer,
  startMatch,
  openEndMatchModal,
}) {
  return (
    <div className="card h-100">
      <div className="card-header d-flex justify-content-between">
        <strong>Court {match.courtNumber}</strong>

        <span
          className={`badge ${match.status === "generated"
            ? "bg-secondary"
            : match.status === "queued"
              ? "bg-info text-dark"
              : match.status === "started"
                ? "bg-warning text-dark"
                : "bg-success"
            }`}
        >
          {match.status}
        </span>
      </div>

      <div className="card-body">
        <TeamBlock
          title="Team A"
          team={match.teamA}
          match={match}
          onReplace={replacePlayer}
        />

        <hr />

        <TeamBlock
          title="Team B"
          team={match.teamB}
          match={match}
          onReplace={replacePlayer}
        />

        {match.status === "completed" && (
          <div className="alert alert-success mt-3 mb-0">
            Final Score: {match.scoreA} - {match.scoreB}
          </div>
        )}

        {match.startedAt && (
          <small className="d-block mt-2">
            Started: {new Date(match.startedAt).toLocaleTimeString()}
          </small>
        )}

        {match.endedAt && (
          <small className="d-block">
            Ended: {new Date(match.endedAt).toLocaleTimeString()}
          </small>
        )}
      </div>

      <div className="card-footer">
        {(match.status === "generated" || match.status === "queued") && (
          <button
            className="btn btn-primary w-100"
            onClick={() => startMatch(match.id)}
          >
            Start Match
          </button>
        )}

        {match.status === "started" && (
          <button
            className="btn btn-danger w-100"
            onClick={() => openEndMatchModal(match)}
          >
            End Match
          </button>
        )}

        {match.status === "completed" && (
          <button className="btn btn-outline-success w-100" disabled>
            Completed
          </button>
        )}
      </div>
    </div>
  );
}

function TeamBlock({ title, team, match, onReplace }) {
  return (
    <div>
      <strong>{title}</strong>

      {team.map((player) => (
        <div
          key={player.id}
          className="d-flex justify-content-between align-items-center mt-2"
        >
          <div>
            {player.name}

            <br />

            <small>
              {player.gender} | {player.currentRating.toFixed(2)}
            </small>
          </div>

          {(match.status === "generated" || match.status === "queued") && (
            <button
              className="btn btn-sm btn-outline-danger"
              onClick={() => onReplace(match.id, player.id)}
            >
              Replace
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export default App;