import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api";

function EventDashboard() {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);

  const fetchEvent = async () => {
    const res = await api.get(`/events/${eventId}`);
    setEvent(res.data);
  };

  useEffect(() => {
    fetchEvent();

    const interval = setInterval(fetchEvent, 5000);

    return () => clearInterval(interval);
  }, [eventId]);

  if (!event) {
    return <div className="container py-4">Loading dashboard...</div>;
  }

  const currentMatches = event.matches.filter(
    (match) => match.status === "started" || match.status === "generated"
  );

  const queuedMatches = event.matches.filter(
    (match) => match.status === "queued"
  );

  const rankings = [...event.players].sort((a, b) => {
    const gamesA = a.gamesPlayed || 0;
    const gamesB = b.gamesPlayed || 0;

    const winRateA = gamesA === 0 ? 0 : (a.wins || 0) / gamesA;
    const winRateB = gamesB === 0 ? 0 : (b.wins || 0) / gamesB;

    if (gamesB !== gamesA) return gamesB - gamesA;
    return winRateB - winRateA;
  });

  return (
    <div className="container py-4">
      <div className="mb-4">
        <h1>{event.name}</h1>
        <p className="text-muted mb-0">
          Live Open Play Dashboard - {event.sport}
        </p>
      </div>

      <section className="mb-5">
        <h3>Currently Playing / Ready Courts</h3>

        {currentMatches.length === 0 && (
          <div className="alert alert-info">No current matches.</div>
        )}

        <div className="row">
          {currentMatches.map((match) => (
            <div key={match.id} className="col-md-6 mb-3">
              <MatchDisplayCard match={match} />
            </div>
          ))}
        </div>
      </section>

      <section className="mb-5">
        <h3>Next Queue</h3>

        {queuedMatches.length === 0 && (
          <div className="alert alert-secondary">No queued matches yet.</div>
        )}

        <div className="row">
          {queuedMatches.map((match) => (
            <div key={match.id} className="col-md-6 mb-3">
              <MatchDisplayCard match={match} />
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3>Player Rankings</h3>

        <div className="table-responsive">
          <table className="table table-bordered table-striped align-middle">
            <thead>
              <tr>
                <th>#</th>
                <th>Player</th>
                <th>Gender</th>
                <th>Games</th>
                <th>Wins</th>
                <th>Losses</th>
                <th>Win Rate</th>
                <th>Current Rating</th>
              </tr>
            </thead>

            <tbody>
              {rankings.map((player, index) => {
                const games = player.gamesPlayed || 0;
                const wins = player.wins || 0;
                const losses = player.losses || 0;
                const winRate = games === 0 ? 0 : (wins / games) * 100;

                return (
                  <tr key={player.id}>
                    <td>{index + 1}</td>
                    <td>
                      <strong>{player.name}</strong>
                    </td>
                    <td>{player.gender}</td>
                    <td>{games}</td>
                    <td>{wins}</td>
                    <td>{losses}</td>
                    <td>{winRate.toFixed(1)}%</td>
                    <td>{player.currentRating.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function MatchDisplayCard({ match }) {
  return (
    <div className="card h-100">
      <div className="card-header d-flex justify-content-between">
        <strong>Court {match.courtNumber}</strong>

        <span
          className={`badge ${
            match.status === "started"
              ? "bg-warning text-dark"
              : match.status === "queued"
              ? "bg-info text-dark"
              : "bg-secondary"
          }`}
        >
          {match.status}
        </span>
      </div>

      <div className="card-body">
        <TeamDisplay title="Team A" team={match.teamA} />

        <hr />

        <TeamDisplay title="Team B" team={match.teamB} />

        {match.startedAt && (
          <small className="d-block mt-3">
            Started: {new Date(match.startedAt).toLocaleTimeString()}
          </small>
        )}
      </div>
    </div>
  );
}

function TeamDisplay({ title, team }) {
  return (
    <div>
      <strong>{title}</strong>

      {team.map((player) => (
        <div key={player.id} className="mt-2">
          {player.name}
          <br />
          <small>
            {player.gender} | Rating: {player.currentRating.toFixed(2)}
          </small>
        </div>
      ))}
    </div>
  );
}

export default EventDashboard;