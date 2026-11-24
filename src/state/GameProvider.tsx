import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { fetchOpponent } from "../api";
import { buildOpponentFighter, buildPlayerFighter, simulateBattle } from "../battle";
import { newGame, SEARCH_FAILED_MESSAGE, searchFailed, startBattle } from "../game";
import { CATALOG } from "../items";
import { GOLD_PER_ROUND, START_GOLD, START_LIVES, WINS_TO_VICTORY } from "../run";
import { BACKPACK_SIZE, SHOP_SIZE } from "../shop";
import type { GameState, ItemInstance, Opponent } from "../types";
import { GameContext, type GameContextValue } from "./GameContext";

const SAVE_KEY = "backpack-brawl-game";
const randomSeed = () => Math.floor(Math.random() * 2 ** 32);

/** Holds the game state for all routes, so it survives navigating between pages. */
export function GameProvider({ children }: { children: ReactNode }) {
  // Restore the saved game when the provider first loads.
  const [game, setGame] = useState<GameState | null>(() => {
    const saved = localStorage.getItem(SAVE_KEY);
    if (!saved) return null;
    
    try {
      const parsed: unknown = JSON.parse(saved);
      if (isGameValid(parsed)) return parsed;
      console.error("Invalid saved game");
    } catch (error) {
      console.error("Could not parse saved game:", error);
    }
    return null;
  });
  // Keep the latest state available to consecutive updates before React re-renders.
  const currentGame = useRef(game);

  const save = useCallback((next: GameState) => {
    // Persist before showing the change, so a refresh doesn't restore the previous state.
    localStorage.setItem(SAVE_KEY, JSON.stringify(next));
    currentGame.current = next;
    setGame(next);
  }, []);

  const update = useCallback((transition: (game: GameState) => GameState) => {
    if (currentGame.current) save(transition(currentGame.current));
  }, [save]);

  // Restart an interrupted search for the same round and search ID.
  useEffect(() => {
    const game = currentGame.current;
    if (!game || game.phase !== "searching") return;

    let cancelled = false;
    const onLeave = () => { cancelled = true; };
    window.addEventListener("beforeunload", onLeave);

    fetchOpponent(game.run.round)
      .then(opponent => {
        if (!cancelled) update(current => startBattle(current, game.searchId, opponent));
      })
      .catch(error => {
        if (!cancelled) {
          console.error("Opponent search failed:", error);
          update(current => searchFailed(current, game.searchId, SEARCH_FAILED_MESSAGE));
        }
      });

    // Ignore responses from a request whose effect has been cleaned up.
    return () => {
      cancelled = true;
      window.removeEventListener("beforeunload", onLeave);
    };
  }, [update]);

  const value: GameContextValue = {
    game,
    startNewRun: () => save(newGame(randomSeed())),
    update,
  };

  return <GameContext value={value}>{children}</GameContext>;
}

/** Checks a parsed save against the current game rules without changing it. */
// eslint-disable-next-line react-refresh/only-export-components -- Exposed for tests until loading uses it.
export function isGameValid(value: unknown): value is GameState {
  if (!isRecord(value) || !isRecord(value.run)) return false;
  const { run } = value;

  // Phase, search ID and displayed error.
  if (value.phase !== "shop" && value.phase !== "searching" && value.phase !== "battle" && value.phase !== "finished") return false;
  if (!isWholeNumber(value.searchId) || (value.error !== null && typeof value.error !== "string")) return false;

  // Round, gold, wins and lives must describe a possible score.
  if (!isWholeNumber(run.round) || run.round < 1 ||
      !isWholeNumber(run.gold) || run.gold > START_GOLD + (run.round - 1) * GOLD_PER_ROUND ||
      !isWholeNumber(run.lives) || run.lives > START_LIVES ||
      !isWholeNumber(run.wins) || run.wins > WINS_TO_VICTORY) return false;
  const finished = run.lives === 0 || run.wins === WINS_TO_VICTORY;
  if ((run.lives === 0 && run.wins === WINS_TO_VICTORY) ||
      run.round !== run.wins + START_LIVES - run.lives + (finished ? 0 : 1)) return false;   

  // Seed and next item UID.
  if (!isWholeNumber(run.seed) || run.seed > 0xffffffff ||
      !isWholeNumber(run.nextUid) || run.nextUid < 1) return false;

  // Shop offers must be known items or already sold.
  if (!Array.isArray(run.shop) || run.shop.length !== SHOP_SIZE ||
      !run.shop.every((item: unknown) => item === null || isKnownItem(item))) return false;

  // Backpack slots must contain known items with unique, previously assigned UIDs.
  if (!Array.isArray(run.backpack) || run.backpack.length !== BACKPACK_SIZE ||
      !run.backpack.every(isBackpackSlot)) return false;
  const backpack: (ItemInstance | null)[] = run.backpack;
  const uids = new Set<string>();
  for (const slot of backpack) {
    if (!slot) continue;
    const number = Number(slot.uid.slice(5));
    if (!/^item-[1-9]\d*$/.test(slot.uid) || !Number.isSafeInteger(number) ||
        number >= run.nextUid || uids.has(slot.uid)) return false;
    uids.add(slot.uid);
  }

  // Gamestate should be playable
  if (
    value.phase === "shop" &&
    run.backpack.every(slot => slot === null) &&
    run.shop.every(offer => offer === null) &&
    run.gold === 0
  ) return false;

  // The phase must agree with the score and whether a battle is present.
  if (value.phase === "finished" && !finished) return false;
  if ((value.phase === "shop" || value.phase === "searching") && finished) return false;
  if ((value.phase === "searching" || value.phase === "battle") && uids.size === 0) return false;
  if (value.phase !== "battle") return value.battle === null;

  // The opponent, replay frame and result must match a battle this run can produce.
  if (!isRecord(value.battle) || !isOpponent(value.battle.opponent) ||
      !isWholeNumber(value.battle.frame)) return false;
  const { opponent, frame } = value.battle;
  const player = buildPlayerFighter(backpack);
  const enemy = buildOpponentFighter(opponent);
  const result = simulateBattle(player, enemy);
  if (frame >= result.frames.length) return false;
  const replayDone = frame === result.frames.length - 1;
  if (finished && !replayDone) return false;
  if (opponent.round !== run.round - (replayDone && !finished ? 1 : 0)) return false;
  if (replayDone && ((result.winner === "player" && run.wins === 0) ||
      (result.winner === "opponent" && run.lives === START_LIVES))) return false;
  return sameData(value.battle.player, player) &&
    sameData(value.battle.enemy, enemy) &&
    sameData(value.battle.result, result);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isWholeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isKnownItem(value: unknown): value is string {
  return typeof value === "string" && CATALOG.some(item => item.id === value);
}

function isBackpackSlot(value: unknown): value is ItemInstance | null {
  return value === null || (isRecord(value) && typeof value.uid === "string" && isKnownItem(value.itemId));
}

function isOpponent(value: unknown): value is Opponent {
  return isRecord(value) &&
    typeof value.id === "string" && value.id.length > 0 &&
    typeof value.name === "string" && value.name.length > 0 &&
    typeof value.icon === "string" && value.icon.length > 0 &&
    typeof value.hp === "number" && Number.isFinite(value.hp) && value.hp > 0 &&
    isWholeNumber(value.round) && value.round > 0 &&
    Array.isArray(value.items) && value.items.length <= BACKPACK_SIZE && value.items.every(isKnownItem);
}

function sameData(actual: unknown, expected: unknown): boolean {
  if (Array.isArray(expected)) {
    return Array.isArray(actual) && actual.length === expected.length &&
      expected.every((item, index) => sameData(actual[index], item));
  }
  if (isRecord(expected)) {
    if (!isRecord(actual)) return false;
    const keys = Object.keys(expected).filter(key => expected[key] !== undefined);
    return Object.keys(actual).filter(key => actual[key] !== undefined).length === keys.length &&
      keys.every(key => Object.hasOwn(actual, key) && sameData(actual[key], expected[key]));
  }
  return actual === expected;
}
