import { CATALOG } from "./items";
import type { Opponent } from "./types";

const knownItems = new Set(CATALOG.map((item) => item.id));

export interface LeaderboardEntry {
  gameId: string;
  browserId: string;
  wins: number;
  losses: number;
  name: string;
  submittedAt: string;
}

/** Checks an API response and returns it as an `Opponent`; throws if it is malformed or uses unknown items. */
export function parseOpponent(data: unknown): Opponent {
  const o = data as Partial<Opponent> | null;
  const valid =
    typeof o === "object" &&
    o !== null &&
    typeof o.name === "string" &&
    o.name.length > 0 &&
    typeof o.hp === "number" &&
    o.hp > 0 &&
    typeof o.round === "number" &&
    Array.isArray(o.items) &&
    o.items.every((id) => typeof id === "string" && knownItems.has(id));
  if (!valid) throw new Error("Invalid opponent from the API");
  return o as Opponent;
}

/** Asks the API for this round's opponent; throws with the server's error text on failure. */
export async function fetchOpponent(round: number): Promise<Opponent> {
  const response = await fetch(`/api/opponents?round=${encodeURIComponent(round)}`);
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Opponent search failed (${response.status})`);
  }
  return parseOpponent(await response.json());
}

export async function submitRun(entry: { gameId: string; browserId: string; name: string; wins: number; losses: number }): Promise<"submitted" | "duplicate"> {
  //const response = await fetch("/api/leaderboard?fail=true", {
  const response = await fetch("/api/leaderboard", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  });
  if (response.status === 409) return "duplicate";
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Could not submit run (${response.status})`);
  }
  return "submitted";
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  //const response = await fetch("/api/leaderboard?fail=true");
  const response = await fetch("/api/leaderboard");
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Could not load leaderboard (${response.status})`);
  }
  const entries: unknown = await response.json();
  if (!Array.isArray(entries) || !entries.every(isLeaderboardEntry)) {
    throw new Error("Invalid leaderboard response");
  }
  return entries;
}

function isLeaderboardEntry(value: unknown): value is LeaderboardEntry {
  return typeof value === "object" && value !== null &&
    "gameId" in value && typeof value.gameId === "string" &&
    "browserId" in value && typeof value.browserId === "string" &&
    "wins" in value && typeof value.wins === "number" &&
    "losses" in value && typeof value.losses === "number" &&
    "name" in value && typeof value.name === "string" &&
    "submittedAt" in value && typeof value.submittedAt === "string";
}
