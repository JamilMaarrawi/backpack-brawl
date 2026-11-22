import { getHighestPrice, getItem } from "./items";
import { BACKPACK_SIZE, rollShop, itemIdsOf } from "./shop";
import type { RunState, Side } from "./types";

export const START_GOLD = 10;
export const START_LIVES = 3;
export const WINS_TO_VICTORY = 5;
export const GOLD_PER_ROUND = 5;
export const REROLL_COST = 1;

export function newRun(seed: number): RunState {
  const roll = rollShop(seed);
  return {
    round: 1,
    gold: START_GOLD,
    lives: START_LIVES,
    wins: 0,
    seed: roll.seed,
    shop: roll.offers,
    backpack: Array(BACKPACK_SIZE).fill(null),
    nextUid: 1,
  };
}

export function firstFreeSlot(state: RunState): number {
  return state.backpack.indexOf(null);
}

/** Why an offer can't be bought right now, or `null` if it can. */
export function buyBlocker(state: RunState, offerIndex: number): string | null {
  const itemId = state.shop[offerIndex];
  if (!itemId) return "Already sold";
  if (state.gold < getItem(itemId).price) return "Not enough gold";
  if (firstFreeSlot(state) === -1) return "Backpack full";
  return null;
}

export function sellBlocker(state: RunState, sellingPrice: number): string | null {
  if (itemIdsOf(state.backpack).length > 1) return null;
  const prices = state.shop
    .filter((id) => id !== null)
    .map((id) => getItem(id).price);
  if (Math.min(...prices) > state.gold + sellingPrice) return "You would end up without any items";
  return null;
}

/** Buys a shop offer into the first free backpack slot; unchanged state if not allowed. */
export function buyItem(state: RunState, offerIndex: number): RunState {
  if (buyBlocker(state, offerIndex) !== null) return state;
  const itemId = state.shop[offerIndex]!;
  const slot = firstFreeSlot(state);
  const backpack = [...state.backpack];
  backpack[slot] = { uid: `item-${state.nextUid}`, itemId };
  const shop = [...state.shop];
  shop[offerIndex] = null;
  return { ...state, gold: state.gold - getItem(itemId).price, shop, backpack, nextUid: state.nextUid + 1 };
}

export function sellItem(state: RunState, uid: string): RunState {
  const item = state.backpack.find(slot => slot && slot.uid === uid);
  const sellingPrice = Math.floor(getItem(item!.itemId).price / 2);
  if (sellBlocker(state, sellingPrice) !== null) return state;
  const backpack = state.backpack.map(slot => slot && slot.uid === uid ? null : slot);
  return { ...state, backpack, gold: state.gold + sellingPrice };
}

export function moveItem(state: RunState, uid: string, to: number): RunState {
  const from = state.backpack.findIndex(slot => slot?.uid === uid);
  if (from === -1 || to < 0 || to >= state.backpack.length || from === to) return state;

  const backpack = [...state.backpack];
  [backpack[from], backpack[to]] = [backpack[to], backpack[from]];
  return { ...state, backpack };
}

export type RunOutcome = "victory" | "defeat";

/** `victory` / `defeat` once the run is over, otherwise `null`. */
export function runOutcome(state: RunState): RunOutcome | null {
  if (state.wins >= WINS_TO_VICTORY) return "victory";
  if (state.lives <= 0) return "defeat";
  return null;
}

/** Starts the next round: round + 1, round gold, fresh shop. The backpack is kept. */
export function startNextRound(state: RunState): RunState {
  const roll = rollShop(state.seed);
  return { ...state, round: state.round + 1, gold: state.gold + GOLD_PER_ROUND, seed: roll.seed, shop: roll.offers };
}

export function reRollShop(state: RunState): RunState {
  if (reRollBlocker(state) !== null) return state;
  const roll = rollShop(state.seed);
  return { ...state, shop: roll.offers, seed: roll.seed , gold: state.gold - REROLL_COST};
}

export function reRollBlocker(state: RunState): string | null {
  if (itemIdsOf(state.backpack).length === 0 && state.gold <= getHighestPrice()) return "you might end up without any items";
  if (state.gold < REROLL_COST) return "Not enough gold to re-roll";
  return null;
}

/** Records a battle (win → +1 win, loss → −1 life) and moves on to the next round unless the run is over. */
export function applyBattleResult(state: RunState, winner: Side): RunState {
  const scored = winner === "player" ? { ...state, wins: state.wins + 1 } : { ...state, lives: state.lives - 1 };
  return runOutcome(scored) ? scored : startNextRound(scored);
}
