import { useEffect, useState } from "react";
import { Link } from "react-router";
import { fetchLeaderboard, type LeaderboardEntry } from "../api";
import { ROUTES } from "../game";

export function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [retry, setRetry] = useState(0);
  const browserId = localStorage.getItem("backpack-brawl-browser-id");

  useEffect(() => {
    let cancelled = false;
    fetchLeaderboard()
      .then(data => {
        if (!cancelled) {
          setEntries(data);
          setStatus("success");
        }
      })
      .catch(cause => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Could not load leaderboard.");
          setStatus("error");
        }
      });
    return () => { cancelled = true; };
  }, [retry]);

  return (
    <section className="mx-auto w-full max-w-2xl rounded-lg border border-panel-edge bg-panel p-6">
      <h2 className="font-display text-2xl font-bold text-gold">🏆 Hall of Fame</h2>
      <p className="mt-2 text-sm text-muted">
        Runs are ranked by most wins, then fewest losses. Earlier submissions break ties.
      </p>

      <div className="my-6 h-96 overflow-y-auto rounded-md border border-panel-edge bg-ink/40 p-4">
        {error ? (
          <div role="alert">
            <p className="text-life">{error}</p>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setStatus("loading");
                setRetry(value => value + 1);
              }}
              className="mt-3 rounded-md bg-gold px-4 py-2 font-bold text-ink"
            >
              Retry
            </button>
          </div>
        ) : status === "loading" || entries === null ? (
          <p className="text-muted" role="status">Loading leaderboard…</p>
        ) : entries.length === 0 ? (
          <p className="text-muted" role="status">No runs have been submitted yet.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {entries.map((entry, index) => {
              const isYours = browserId !== null && entry.browserId === browserId;
              return (
                <li key={entry.gameId} className={`flex items-center justify-between gap-4 rounded-md border p-3 ${isYours ? "border-gold bg-gold/10" : "border-panel-edge bg-panel"}`}>
                  <span className="font-bold text-gold">{index + 1}.</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{entry.name}{isYours && <span className="ml-2 text-xs text-gold">You</span>}</p>
                    <p className="text-sm text-muted">
                      {entry.wins} wins · {entry.losses} losses · {new Date(entry.submittedAt).toLocaleString()}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <Link
        to={ROUTES.start}
        className="inline-block rounded-md bg-gold px-4 py-2 font-bold text-ink hover:brightness-110"
      >
        Homepage
      </Link>
    </section>
  );
}
