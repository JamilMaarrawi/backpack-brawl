import { describe, expect, it } from "vitest";
import { leaveBattle, newGame, skipReplay, startBattle, startSearch, updateRun } from "../game";
import { buyItem } from "../run";
import type { GameState, Opponent } from "../types";
import { isGameValid } from "./GameProvider";

const opponent: Opponent = {
  id: "dummy", name: "Dummy", icon: "?", hp: 1, round: 1, items: [],
};

function searchingGame(): GameState {
  const game = newGame(1);
  game.run.shop[0] = "chipped-dagger";
  return startSearch(updateRun(game, run => buyItem(run, 0)), 1);
}

const saved = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

describe("isGameValid", () => {
  it("accepts saved shop, search, replay, and completed replay states", () => {
    const searching = searchingGame();
    const battle = startBattle(searching, searching.searchId, opponent);
    const completed = skipReplay(battle);
    for (const game of [newGame(1), searching, battle, completed, leaveBattle(completed)]) {
      expect(isGameValid(saved(game))).toBe(true);
    }
  });

  it("rejects malformed, impossible, and incompatible run data", () => {
    expect(isGameValid(null)).toBe(false);
    const game = searchingGame();
    expect(isGameValid({ ...game, run: { ...game.run, gold: -1 } })).toBe(false);
    expect(isGameValid({ ...game, run: { ...game.run, round: 2 } })).toBe(false);
    expect(isGameValid({ ...game, run: { ...game.run, shop: ["unknown"] } })).toBe(false);
    const item = game.run.backpack[0];
    expect(isGameValid({ ...game, run: { ...game.run, backpack: [item, item, null, null, null, null] } })).toBe(false);
  });

  it("accepts a final loss before and after the replay is left", () => {
    const game = searchingGame();
    game.run.lives = 1;
    game.run.round = 3;
    const battle = startBattle(game, game.searchId, { ...opponent, round: 3, hp: 1000, items: ["iron-cleaver"] });
    const completed = skipReplay(battle);
    expect(completed.run.lives).toBe(0);
    expect(isGameValid(saved(completed))).toBe(true);
    expect(isGameValid(saved(leaveBattle(completed)))).toBe(true);
  });

  it("rejects corrupt replay data and inconsistent battle state", () => {
    const searching = searchingGame();
    const battle = startBattle(searching, searching.searchId, opponent);
    if (!battle.battle) throw new Error("Expected battle");
    expect(isGameValid({ ...battle, battle: null })).toBe(false);
    expect(isGameValid({ ...battle, battle: { ...battle.battle, frame: 999 } })).toBe(false);
    expect(isGameValid({
      ...battle,
      battle: { ...battle.battle, result: { ...battle.battle.result, winner: "opponent" } },
    })).toBe(false);
  });
});