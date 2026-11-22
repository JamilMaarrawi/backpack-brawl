import { getItem, setProgress } from "./items";
import { itemIdsOf } from "./shop";
import type { Backpack, BattleEvent, BattleResult, Fighter, FighterItem, FighterSnapshot, Opponent, Side } from "./types";

/** Seconds per battle tick. */
export const TICK_SECONDS = 0.5;
/** Battles that last longer are decided by the timeout rule. */
export const MAX_TICKS = 60;
export const HERO_BASE_HP = 40;
/** Poison deals damage every this many ticks, after items resolve. */
export const POISON_INTERVAL = 2;
/** HP lost per poison stack on every poison tick. Poison ignores block and never decays. */
export const POISON_DAMAGE_PER_STACK = 1;
/** `itemId` of "poison-tick" events, which are not caused by an item. */
export const POISON_TICK_SOURCE = "poison";
/** Poison stacks on one fighter never exceed this; extra stacks are wasted. */
export const POISON_MAX_STACKS = 10;
/** Fire set bonus: burn stacks every hit of a Fire item adds to the enemy. */
export const BURN_STACKS_PER_HIT = 3;
/** Burn deals damage every tick, after the poison tick and before items resolve. Block absorbs it first. */
export const BURN_DAMAGE_PER_STACK = 1;
/** Burn stacks lost after every burn tick. */
export const BURN_DECAY = 1;
/** Burn stacks on one fighter never exceed this; extra stacks are wasted. */
export const BURN_MAX_STACKS = 10;
/** `itemId` of "burn-tick" events, which are not caused by an item. */
export const BURN_TICK_SOURCE = "burn";
/** Guard set bonus: extra block on every block effect. */
export const GUARD_EXTRA_BLOCK = 2;

/** Turns a list of item ids into a fighter with the catalog values of each item. */
export function buildFighter(itemIds: string[], baseHp: number, name = "Fighter"): Fighter {
  const items: FighterItem[] = itemIds.map((id) => {
    const def = getItem(id);
    return { itemId: def.id, name: def.name, icon: def.icon, cooldown: def.cooldown, effects: { ...def.effects }, set: def.set };
  });
  const sets = setProgress(itemIds).filter((p) => p.active).map((p) => p.set);
  return { name, maxHp: baseHp, items, sets };
}

/** The player's fighter: every backpack item and the hero's base HP. */
export function buildPlayerFighter(backpack: Backpack): Fighter {
  return buildFighter(itemIdsOf(backpack), HERO_BASE_HP, "Hero");
}

export function buildOpponentFighter(opponent: Opponent): Fighter {
  return buildFighter(opponent.items, opponent.hp, opponent.name);
}

interface FighterState {
  fighter: Fighter;
  hp: number;
  block: number;
  /** Poison stacks on this fighter. */
  poison: number;
  /** Burn stacks on this fighter. */
  burn: number;
  /** Ticks each item has charged towards its cooldown. */
  charge: number[];
}

const other = (side: Side): Side => (side === "player" ? "opponent" : "player");

const snapshot = (s: FighterState): FighterSnapshot => ({
  hp: Math.max(0, s.hp),
  maxHp: s.fighter.maxHp,
  block: s.block,
  poison: s.poison,
  burn: s.burn,
});

/** "1 stack" or "n stacks" for log messages. */
const stacks = (n: number) => `${n} ${n === 1 ? "stack" : "stacks"}`;

const isDown = (s: FighterState) => s.hp <= 0;

/**
 * Runs a full battle. Pure and deterministic: the same fighters always give
 * the same result.
 *
 * Each tick:
 * 1. Each fighter charges all items by one tick; items whose charge reaches their cooldown fire.
 * 2. Every `POISON_INTERVAL` ticks each poisoned fighter loses `POISON_DAMAGE_PER_STACK` HP per stack.
 *    This runs before items resolve, so stacks added in this tick only count from the next poison tick.
 * 3. Every tick each burning fighter takes `BURN_DAMAGE_PER_STACK` damage per stack (block absorbs it first),
 *    then loses `BURN_DECAY` stacks.
 * 4. Fired items resolve (player first, then opponent). Both sides fire "simultaneously":
 *    which items fire is decided before any effect is applied.
 * After step 4 the battle ends if someone is down; if both are down, the player loses.
 * After `MAX_TICKS` the higher HP percentage wins; a tie is a player loss.
 */
export function simulateBattle(player: Fighter, opponent: Fighter): BattleResult {
  const state: Record<Side, FighterState> = {
    player: initState(player),
    opponent: initState(opponent),
  };
  const frames: BattleResult["frames"] = [
    { tick: 0, player: snapshot(state.player), opponent: snapshot(state.opponent), events: [] },
  ];
  const events: BattleEvent[] = [];

  const knockoutWinner = (): Side | null => {
    if (isDown(state.player)) return "opponent";
    if (isDown(state.opponent)) return "player";
    return null;
  };

  let winner: Side | null = null;
  let tick = 0;
  while (winner === null && tick < MAX_TICKS) {
    tick += 1;
    const tickEvents: BattleEvent[] = [];
    const emit = (event: Omit<BattleEvent, "tick">) => tickEvents.push({ tick, ...event });

    const fired: Record<Side, FighterItem[]> = {
      player: chargeItems(state.player),
      opponent: chargeItems(state.opponent),
    };
    if (tick % POISON_INTERVAL === 0) {
      for (const side of ["player", "opponent"] as const) applyPoison(state[side], side, emit);
    }
    for (const side of ["player", "opponent"] as const) applyBurn(state[side], side, emit);
    for (const side of ["player", "opponent"] as const) {
      for (const item of fired[side]) resolveItem(item, state[side], state[other(side)], side, emit);
    }
    winner = knockoutWinner();

    frames.push({ tick, player: snapshot(state.player), opponent: snapshot(state.opponent), events: tickEvents });
    events.push(...tickEvents);
  }

  if (winner !== null) return { winner, reason: "knockout", frames, events };
  return { winner: timeoutWinner(state.player, state.opponent), reason: "timeout", frames, events };
}

function initState(fighter: Fighter): FighterState {
  return { fighter, hp: fighter.maxHp, block: 0, poison: 0, burn: 0, charge: fighter.items.map(() => 0) };
}

/** Advances one tick of cooldowns and returns the items that fire this tick. */
function chargeItems(s: FighterState): FighterItem[] {
  const fired: FighterItem[] = [];
  s.fighter.items.forEach((item, i) => {
    s.charge[i] += 1;
    if (s.charge[i] >= item.cooldown) {
      s.charge[i] = 0;
      fired.push(item);
    }
  });
  return fired;
}

function resolveItem(
  item: FighterItem,
  self: FighterState,
  enemy: FighterState,
  side: Side,
  emit: (event: Omit<BattleEvent, "tick">) => void,
) {
  const { damage, block, poison, heal } = item.effects;
  const base = { source: side, itemId: item.itemId };
  const enemySide = other(side);

  if (damage) {
    const absorbed = Math.min(enemy.block, damage);
    enemy.block -= absorbed;
    enemy.hp -= damage - absorbed;
    let note = absorbed > 0 ? ` (${absorbed} blocked)` : "";
    if (item.set === "fire" && self.fighter.sets.includes("fire")) {
      const added = Math.min(BURN_STACKS_PER_HIT, BURN_MAX_STACKS - enemy.burn);
      enemy.burn += added;
      const cap = added < BURN_STACKS_PER_HIT ? " (max)" : "";
      note += ` (+${BURN_STACKS_PER_HIT} burn, ${stacks(enemy.burn)}${cap})`;
    }
    emit({ ...base, target: enemySide, kind: "damage", amount: damage, message: `${item.name} hits ${enemy.fighter.name} for ${damage}${note}` });
  }
  if (block) {
    const guard = self.fighter.sets.includes("guard") ? GUARD_EXTRA_BLOCK : 0;
    self.block += block + guard;
    const note = guard > 0 ? ` (+${guard} Guard)` : "";
    emit({ ...base, target: side, kind: "block", amount: block + guard, message: `${item.name} grants ${self.fighter.name} ${block + guard} block${note}` });
  }
  if (poison) {
    const added = Math.min(poison, POISON_MAX_STACKS - enemy.poison);
    enemy.poison += added;
    const cap = added < poison ? " (max)" : "";
    emit({ ...base, target: enemySide, kind: "poison", amount: added, message: `${item.name} poisons ${enemy.fighter.name} (+${poison}, ${stacks(enemy.poison)}${cap})` });
  }
  if (heal) {
    const healed = Math.min(heal, self.fighter.maxHp - self.hp);
    self.hp += healed;
    emit({ ...base, target: side, kind: "heal", amount: healed, message: `${item.name} heals ${self.fighter.name} for ${healed}` });
  }
}

/** Poison tick on one fighter: ignores block. The event is credited to the side that applied the poison. */
function applyPoison(s: FighterState, side: Side, emit: (event: Omit<BattleEvent, "tick">) => void) {
  if (s.poison === 0) return;
  const amount = s.poison * POISON_DAMAGE_PER_STACK;
  s.hp -= amount;
  emit({ source: other(side), target: side, kind: "poison-tick", itemId: POISON_TICK_SOURCE, amount, message: `Poison deals ${amount} to ${s.fighter.name}` });
}

/** Burn tick on one fighter: block absorbs it first, then the stacks decay. Credited to the side that applied the burn. */
function applyBurn(s: FighterState, side: Side, emit: (event: Omit<BattleEvent, "tick">) => void) {
  if (s.burn === 0) return;
  const amount = s.burn * BURN_DAMAGE_PER_STACK;
  const absorbed = Math.min(s.block, amount);
  s.block -= absorbed;
  s.hp -= amount - absorbed;
  s.burn = Math.max(0, s.burn - BURN_DECAY);
  const note = absorbed > 0 ? ` (${absorbed} blocked)` : "";
  emit({ source: other(side), target: side, kind: "burn-tick", itemId: BURN_TICK_SOURCE, amount, message: `Burn deals ${amount} to ${s.fighter.name}${note}` });
}

function timeoutWinner(player: FighterState, opponent: FighterState): Side {
  const ratio = (s: FighterState) => s.hp / s.fighter.maxHp;
  return ratio(player) > ratio(opponent) ? "player" : "opponent";
}
