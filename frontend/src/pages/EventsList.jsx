import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";

function EventsList() {
  const [events, setEvents] = useState([]);

  const fetchEvents = async () => {
    const res = await api.get("/events");
    setEvents(res.data);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Open Play Events</h1>

        <Link to="/event/new" className="btn btn-primary">
          Create Event
        </Link>
      </div>

      {events.length === 0 && (
        <div className="alert alert-info">
          No events created yet.
        </div>
      )}

      <div className="row">
        {events.map((event) => (
          <div key={event.id} className="col-md-4 mb-3">
            <div className="card h-100">
              <div className="card-body">
                <h5>{event.name}</h5>

                <p className="mb-1">
                  Sport: <strong>{event.sport}</strong>
                </p>

                <p className="mb-1">
                  Courts: <strong>{event.courtsAvailable}</strong>
                </p>

                <p className="mb-3">
                  Players: <strong>{event.players.length}</strong>
                </p>

                <div className="d-flex gap-2">
                  <Link
                    to={`/event/${event.id}`}
                    className="btn btn-primary btn-sm"
                  >
                    Manage
                  </Link>

                  <Link
                    to={`/dashboard/${event.id}`}
                    className="btn btn-outline-primary btn-sm"
                  >
                    Dashboard
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default EventsList;