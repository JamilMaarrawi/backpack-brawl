import cors from "cors";
import express from "express";
import { entryExists, getList, isEntryValid, saveEntry } from "./leaderboard.js";
import { opponentForRound, parseRound } from "./opponents.js";

const app = express();
const port = Number(process.env.PORT ?? 4200);

app.use(cors()); app.use(express.json());
app.use((error, _req, res, next) => {
  if (error.type === "entity.parse.failed") return res.status(400).json({ error: "Invalid JSON." });
  return next(error);
});
app.get("/api/health", (_req, res) => res.json({ ok: true, service: "backpack-brawl" }));

app.get("/api/leaderboard", (req, res) => {
  if (req.query.fail === "true" || process.env.API_FAIL === "true") {
    return res.status(503).json({ error: "Could not load the leaderboard. Please try again." });
  }
  try {
    return res.json(getList());
  } catch (error) {
    console.error("Could not load leaderboard:", error);
    return res.status(500).json({ error: "Could not load the leaderboard. Please try again." });
  }
});

app.post("/api/leaderboard", (req, res) => {
  if (!isEntryValid(req.body)) {
    return res.status(400).json({ error: "Provide valid IDs, a name, and a finished run (5 wins or 3 losses)." });
  }
  if (req.query.fail === "true" || process.env.API_FAIL === "true") {
    return res.status(503).json({ error: "Could not save the run. Please try again." });
  }

  try {
    if (entryExists(req.body.gameId)) {
      return res.status(409).json({ error: "This game ID was already submitted." });
    }
    return res.status(201).json(saveEntry(req.body));
  } catch (error) {
    console.error("Could not save leaderboard entry:", error);
    return res.status(500).json({ error: "Could not save the run. Please try again." });
  }
});

app.get("/api/opponents", (req, res) => {
  const requested = Number(req.query.latency ?? process.env.API_LATENCY ?? 1200);
  const latency = Number.isFinite(requested) ? Math.max(0, Math.min(5000, requested)) : 1200;
  setTimeout(() => {
    const round = parseRound(req.query.round);
    if (round === null) return res.status(400).json({ error: "round must be a positive whole number" });
    if (req.query.fail === "true" || process.env.API_FAIL === "true") {
      return res.status(503).json({ error: "The arena gates are shut. No challenger answered the call." });
    }
    res.json(opponentForRound(round));
  }, latency);
});

app.listen(port, () => console.log(`Backpack Brawl API listening on http://localhost:${port}`));
