import express from "express";
import cors from "cors";
import eventRoutes from "./routes/eventRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Open Play API running" });
});

app.use("/events", eventRoutes);

export default app;