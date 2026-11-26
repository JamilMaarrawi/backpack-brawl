import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { submitRun } from "../api";
import { RunHeader } from "../components/RunHeader";
import { RunOver } from "../components/RunOver";
import { ROUTES } from "../game";
import { runOutcome, START_LIVES } from "../run";
import { useActiveGame } from "../state/GameContext";

export function ResultPage() {
  const { game, startNewRun } = useActiveGame();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "sending">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const outcome = runOutcome(game.run);
  if (!outcome) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || status !== "idle") return;
    setStatus("sending");
    setMessage(null);

    try {
      const browserId = localStorage.getItem("backpack-brawl-browser-id") ?? crypto.randomUUID();
      localStorage.setItem("backpack-brawl-browser-id", browserId);
      await submitRun({
        gameId: game.gameId,
        browserId,
        name: name.trim(),
        wins: game.run.wins,
        losses: START_LIVES - game.run.lives,
      });
      navigate(ROUTES.leaderboard);
    } catch (error) {
      console.error("Could not submit run:", error);
      setMessage(error instanceof Error ? error.message : "Could not submit the run. Please try again.");
      setStatus("idle");
    }
  }

  // Starting a new run moves the phase to "shop", so RequireRoute redirects to the shop.
  return (
    <>
      <RunHeader run={game.run} />
      <div className="mx-auto grid w-full max-w-4xl items-start gap-4 md:grid-cols-2">
        <RunOver run={game.run} outcome={outcome} onNewRun={startNewRun} />
        <section className="w-full rounded-lg border-2 border-panel-edge bg-panel p-8">
          <h2 className="font-display text-2xl font-bold">🏆 Hall of Fame</h2>
          <p className="mt-2 text-sm text-muted">Submit your run to the leaderboard.</p>
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
            <label htmlFor="player-name" className="font-bold">Name</label>
            <input
              id="player-name"
              type="text"
              maxLength={40}
              value={name}
              onChange={event => setName(event.target.value)}
              disabled={status !== "idle"}
              className="rounded-md border border-panel-edge bg-ink px-3 py-2 text-parchment"
            />
            <button
              type="submit"
              disabled={!name.trim() || status !== "idle"}
              className="rounded-md bg-gold px-4 py-2 font-bold text-ink hover:brightness-110 disabled:bg-panel-edge disabled:text-muted"
            >
              {status === "sending" ? "Submitting…" : "Submit run"}
            </button>
            {message && <p role="status" className="text-sm">{message}</p>}
          </form>
        </section>
      </div>
    </>
  );
}
