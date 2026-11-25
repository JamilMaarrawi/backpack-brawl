import { describe, expect, it } from "vitest";
import { parseOpponent } from "./api";
import { fightBlocker, leaveBattle, newGame, SEARCH_FAILED_MESSAGE, searchFailed, skipReplay, startBattle, startSearch } from "./game";
import type { GameState, Opponent } from "./types";

/** A new game with one item in the backpack, so a search may start. */
function readyGame(): GameState {
  const game = newGame(1, "test-game");
  const backpack = game.run.backpack.map((_, i) => (i === 0 ? { uid: "a", itemId: "chipped-dagger" } : null));
  return { ...game, run: { ...game.run, backpack } };
}

const opponent = (round = 1): Opponent => ({ id: "dummy", name: "Dummy", icon: "🪵", hp: 1, round, items: [] });

describe("opponent search", () => {
  it("failure returns to a usable shop with an error", () => {
    const searching = startSearch(readyGame(), 1);
    expect(searching.phase).toBe("searching");
    const failed = searchFailed(searching, 1, SEARCH_FAILED_MESSAGE);
    expect(failed).toMatchObject({ phase: "shop", error: SEARCH_FAILED_MESSAGE, battle: null });
    expect(fightBlocker(failed)).toBeNull();
  });

  it("retry works after a failure", () => {
    const failed = searchFailed(startSearch(readyGame(), 1), 1, SEARCH_FAILED_MESSAGE);
    const retry = startSearch(failed, 2);
    expect(retry).toMatchObject({ phase: "searching", searchId: 2, error: null });
    expect(startBattle(retry, 2, opponent()).phase).toBe("battle");
  });

  it("no second search while searching", () => {
    const searching = startSearch(readyGame(), 1);
    expect(fightBlocker(searching)).toBe("Searching…");
    expect(startSearch(searching, 2)).toBe(searching);
  });

  it("a late success after a failure is ignored", () => {
    const failed = searchFailed(startSearch(readyGame(), 1), 1, SEARCH_FAILED_MESSAGE);
    expect(startBattle(failed, 1, opponent())).toBe(failed);
  });

  it("a duplicate response does not start a second battle", () => {
    const battle = startBattle(startSearch(readyGame(), 1), 1, opponent());
    expect(battle.phase).toBe("battle");
    expect(startBattle(battle, 1, opponent())).toBe(battle);
    expect(searchFailed(battle, 1, SEARCH_FAILED_MESSAGE)).toBe(battle);
  });

  it("a response for a wrong round or an old searchId is ignored", () => {
    const failed = searchFailed(startSearch(readyGame(), 1), 1, SEARCH_FAILED_MESSAGE);
    const searching = startSearch(failed, 2);
    expect(startBattle(searching, 2, opponent(2))).toBe(searching);
    expect(startBattle(searching, 1, opponent())).toBe(searching);
    expect(searchFailed(searching, 1, SEARCH_FAILED_MESSAGE)).toBe(searching);
  });

  it("the battle result is applied only once", () => {
    const battle = startBattle(startSearch(readyGame(), 1), 1, opponent());
    const done = skipReplay(battle);
    expect(done.run.wins).toBe(1);
    expect(skipReplay(done)).toBe(done);
    // A late response after the battle is left changes nothing either.
    const shop = leaveBattle(done);
    expect(shop.phase).toBe("shop");
    expect(startBattle(shop, 1, opponent())).toBe(shop);
    expect(shop.run.wins).toBe(1);
  });
});

describe("parseOpponent", () => {
  const valid = { id: "x", name: "X", icon: "?", hp: 10, round: 1, items: ["chipped-dagger", "torch"] };

  it("accepts a well-formed opponent", () => {
    expect(parseOpponent(valid)).toEqual(valid);
  });

  it.each([
    ["null", null],
    ["missing name", { ...valid, name: undefined }],
    ["empty name", { ...valid, name: "" }],
    ["zero hp", { ...valid, hp: 0 }],
    ["hp as text", { ...valid, hp: "10" }],
    ["round as text", { ...valid, round: "1" }],
    ["items not an array", { ...valid, items: "torch" }],
    ["unknown item id", { ...valid, items: ["torch", "laser-sword"] }],
  ])("rejects %s", (_, data) => {
    expect(() => parseOpponent(data)).toThrow();
  });
});
