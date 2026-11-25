import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const leaderboardFile = fileURLToPath(new URL("./leaderboard.json", import.meta.url));

export function isEntryValid(entry) {
  const { gameId, browserId, wins, losses, name } = entry ?? {};
  return typeof gameId === "string" && !!gameId.trim() && gameId.length <= 100 &&
    typeof browserId === "string" && !!browserId.trim() && browserId.length <= 100 &&
    typeof name === "string" && !!name.trim() && name.trim().length <= 40 &&
    Number.isInteger(wins) && wins >= 0 && wins <= 5 &&
    Number.isInteger(losses) && losses >= 0 && losses <= 3 &&
    ((wins === 5 && losses < 3) || (losses === 3 && wins < 5));
}

export function entryExists(gameId) {
  return readEntries().some((entry) => entry.gameId === gameId);
}

export function getList() {
  return readEntries().sort((a, b) =>
    b.wins - a.wins || a.losses - b.losses || a.submittedAt.localeCompare(b.submittedAt)
  );
}

export function saveEntry(entry) {
  const entries = readEntries();
  const { gameId, browserId, wins, losses, name } = entry;
  const saved = { gameId, browserId, wins, losses, name: name.trim(), submittedAt: new Date().toISOString() };
  writeFileSync(`${leaderboardFile}.tmp`, JSON.stringify([...entries, saved], null, 2), "utf8");
  renameSync(`${leaderboardFile}.tmp`, leaderboardFile);
  return saved;
}

function readEntries() {
  const entries = existsSync(leaderboardFile) ? JSON.parse(readFileSync(leaderboardFile, "utf8")) : [];
  if (!Array.isArray(entries)) throw new Error("Leaderboard file must contain an array");
  return entries;
}
