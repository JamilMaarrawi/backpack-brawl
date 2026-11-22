import { CATALOG } from "./items";
import type { Opponent } from "./types";

const knownItems = new Set(CATALOG.map((item) => item.id));

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
