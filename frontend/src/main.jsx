import React from "react";
import ReactDOM from "react-dom/client";
import "bootstrap/dist/css/bootstrap.min.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import App from "./App.jsx";
import EventsList from "./pages/EventsList.jsx";
import EventDashboard from "./pages/EventDashboard.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<EventsList />} />

        <Route path="/event/new" element={<App />} />

        <Route path="/event/:eventId" element={<App />} />

        <Route
          path="/dashboard/:eventId"
          element={<EventDashboard />}
        />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);