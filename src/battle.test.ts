import { describe, expect, it } from "vitest";
import { buildFighter, POISON_DAMAGE_PER_STACK, POISON_INTERVAL, POISON_MAX_STACKS, POISON_TICK_SOURCE, simulateBattle } from "./battle";
import type { Fighter, ItemEffects } from "./types";

/** Fighter whose items all fire every tick. */
const fighter = (maxHp: number, ...effects: ItemEffects[]): Fighter => ({
  name: "F",
  maxHp,
  items: effects.map((e, i) => ({ itemId: `item-${i}`, name: `Item ${i}`, icon: "?", cooldown: 1, effects: e })),
});

describe("poison", () => {
  const result = simulateBattle(fighter(100, { poison: 2 }), fighter(100, { block: 50 }));
  const [, tick1, tick2] = result.frames;

  it("stacks up and never decays", () => {
    expect(tick1.opponent.poison).toBe(2);
    expect(tick2.opponent.poison).toBe(4);
    result.frames.slice(1).forEach((f, i) => expect(f.opponent.poison).toBe(Math.min(2 * (i + 1), POISON_MAX_STACKS)));
  });

  it("deals damage only every POISON_INTERVAL ticks and ignores block", () => {
    expect(POISON_INTERVAL).toBe(2);
    expect(tick1.opponent.hp).toBe(100);
    // Tick 2 counts only the 2 stacks from tick 1; the stacks added in tick 2 wait for tick 4.
    expect(tick2.opponent.hp).toBe(100 - 2 * POISON_DAMAGE_PER_STACK);
    expect(result.frames[4].opponent.hp).toBe(100 - (2 + 6) * POISON_DAMAGE_PER_STACK);
    expect(tick2.opponent.block).toBe(100);
  });

  it("logs poison ticks as their own kind, credited to the poisoner", () => {
    const ticks = result.events.filter((e) => e.kind === "poison-tick");
    expect(ticks[0]).toMatchObject({ tick: 2, source: "player", target: "opponent", amount: 2, itemId: POISON_TICK_SOURCE });
    // The poison tick resolves before the items of the same tick.
    expect(tick2.events[0].kind).toBe("poison-tick");
    // "poison" is only used for applying stacks via an item.
    expect(result.events.filter((e) => e.kind === "poison").every((e) => e.itemId === "item-0")).toBe(true);
  });

  it("can knock out a fighter on a poison tick", () => {
    // Tick 1: 2 stacks, no damage yet. Tick 2: those 2 stacks deal 2 to a 2 HP fighter.
    const ko = simulateBattle(fighter(100, { poison: 2 }), fighter(2));
    expect(ko).toMatchObject({ winner: "player", reason: "knockout" });
    expect(ko.frames).toHaveLength(3);
    expect(ko.frames[2].opponent.hp).toBe(0);
    expect(ko.frames[2].events[0]).toMatchObject({ kind: "poison-tick", itemId: POISON_TICK_SOURCE, target: "opponent", amount: 2 });
  });

  it("never exceeds POISON_MAX_STACKS; extra stacks are wasted and logged", () => {
    expect(POISON_MAX_STACKS).toBe(10);
    // 3 stacks per tick: 3, 6, 9, then tick 4 only adds 1 of 3.
    const frames = simulateBattle(fighter(100, { poison: 3 }), fighter(100)).frames;
    expect(frames.slice(1).every((f) => f.opponent.poison <= POISON_MAX_STACKS)).toBe(true);
    expect(frames[3].opponent.poison).toBe(9);
    expect(frames[4].opponent.poison).toBe(POISON_MAX_STACKS);
    const capped = frames[4].events.find((e) => e.kind === "poison");
    expect(capped).toMatchObject({ amount: 1 });
    expect(capped?.message).toContain("+3, 10 stacks (max)");
    // Once full, an item adds nothing, and the poison tick deals the capped amount.
    expect(frames[5].events.find((e) => e.kind === "poison")).toMatchObject({ amount: 0 });
    expect(frames[6].events[0]).toMatchObject({ kind: "poison-tick", amount: POISON_MAX_STACKS * POISON_DAMAGE_PER_STACK });
  });

  it("stacks applied in a poison tick only deal damage from the next POISON_INTERVAL", () => {
    // The item first fires on tick POISON_INTERVAL, which is itself a poison tick.
    const poisoner = fighter(100, { poison: 3 });
    poisoner.items[0].cooldown = POISON_INTERVAL;
    const frames = simulateBattle(poisoner, fighter(100)).frames;
    const first = frames[POISON_INTERVAL];
    const next = frames[2 * POISON_INTERVAL];

    expect(first.opponent.poison).toBe(3);
    expect(first.opponent.hp).toBe(100);
    expect(first.events.some((e) => e.kind === "poison-tick")).toBe(false);
    expect(next.events[0]).toMatchObject({ kind: "poison-tick", amount: 3 * POISON_DAMAGE_PER_STACK });
    expect(next.opponent.hp).toBe(100 - 3 * POISON_DAMAGE_PER_STACK);
  });
});

describe("determinism", () => {
  it("gives an identical BattleResult for the same input", () => {
    const build = () => [
      buildFighter(["venom-dagger", "healing-herb", "oak-buckler"], 40, "Hero"),
      buildFighter(["thorn-bow", "troll-hide", "health-potion"], 40, "Enemy"),
    ] as const;
    expect(simulateBattle(...build())).toEqual(simulateBattle(...build()));
  });
});

describe("heal", () => {
  it("restores HP but never above max HP", () => {
    const result = simulateBattle(fighter(50, { heal: 10 }), fighter(50, { damage: 4 }));
    const [, tick1, tick2] = result.frames;
    expect(tick1.player.hp).toBe(46); // heal at full HP restores 0, then the hit lands
    expect(tick2.player.hp).toBe(46); // heals 4 back to 50, then the hit lands
    expect(result.events.filter((e) => e.kind === "heal").map((e) => e.amount).slice(0, 2)).toEqual([0, 4]);
  });

  it("saves a fighter brought to 0 HP by a poison tick if a heal fires in the same tick", () => {
    // Tick 1: 2 stacks. Tick 2: the poison tick takes the 2 HP fighter to 0, then the heal restores 2.
    const result = simulateBattle(fighter(100, { poison: 2 }), fighter(2, { heal: 5 }));
    const tick2 = result.frames[2];
    expect(tick2.events.map((e) => e.kind)).toEqual(["poison-tick", "poison", "heal"]);
    expect(tick2.events[0].amount).toBe(2);
    expect(tick2.opponent.hp).toBe(2);
    // The knockout check at the end of tick 2 finds no one down, so the battle goes on.
    expect(result.frames.length).toBeGreaterThan(3);
  });
});
