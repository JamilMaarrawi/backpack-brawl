import { HERO_BASE_HP, MAX_TICKS, POISON_DAMAGE_PER_STACK, POISON_INTERVAL, POISON_MAX_STACKS, TICK_SECONDS } from "./battle";
import { GOLD_PER_ROUND, START_GOLD, START_LIVES, WINS_TO_VICTORY } from "./run";
import { BACKPACK_COLS, BACKPACK_ROWS, SHOP_SIZE } from "./shop";
import type { ItemEffects } from "./types";

/**
 * Player-facing explanations of the rules. Built from the game constants so
 * the texts stay correct when numbers are rebalanced.
 */

const BATTLE_SECONDS = MAX_TICKS * TICK_SECONDS;
const POISON_SECONDS = POISON_INTERVAL * TICK_SECONDS;
const POISON_TEXT = `every ${POISON_SECONDS} s the poisoned fighter loses ${POISON_DAMAGE_PER_STACK} HP per stack, before items fire. New stacks only count from the next poison tick. Poison ignores block and never wears off. A fighter carries at most ${POISON_MAX_STACKS} stacks; extra stacks are wasted.`;

/** Tooltip per item effect. */
export const EFFECT_HELP: Record<keyof ItemEffects, string> = {
  damage: "Damage: hits the enemy. Block absorbs it first, the rest is lost from HP.",
  block: "Block: absorbs incoming damage until used up. Unused block stays for the rest of the battle.",
  poison: `Poison: adds stacks to the enemy; ${POISON_TEXT}`,
  heal: "Heal: restores your own HP, but never above max HP.",
};

export const COOLDOWN_HELP = `Cooldown: the item fires every time this much battle time has passed (1 tick = ${TICK_SECONDS} s).`;

/** Tooltip per fighter status shown in battle. */
export const STATUS_HELP = {
  hp: "HP: reaching 0 is a knockout.",
  block: EFFECT_HELP.block,
  poison: `Poison stacks: ${POISON_TEXT}`,
  timer: `After ${BATTLE_SECONDS} s the fighter with the higher share of HP wins; a tie counts as your loss.`,
};

export interface RuleSection {
  title: string;
  rules: string[];
}

export const RULES: RuleSection[] = [
  {
    title: "🏆 The run",
    rules: [
      `Reach ${WINS_TO_VICTORY} wins before you lose all ${START_LIVES} lives.`,
      `Each battle is one round: a win gives +1 win, a loss costs 1 life.`,
      `Opponents get tougher every round.`,
    ],
  },
  {
    title: "🏪 Shop & backpack",
    rules: [
      `You start with ${START_GOLD} 🪙 and earn ${GOLD_PER_ROUND} 🪙 at the start of every new round. Unspent gold carries over.`,
      `The shop offers ${SHOP_SIZE} new items every round.`,
      `Bought items go to the first free slot of your ${BACKPACK_COLS}×${BACKPACK_ROWS} backpack and stay there for the whole run.`,
      `Only items in your backpack fight. Their position doesn't matter.`,
    ],
  },
  {
    title: "⚔️ Battle",
    rules: [
      `Battles run on their own. Your hero has ${HERO_BASE_HP} HP; every item fires whenever its cooldown is up.`,
      `Damage hits block first; only the rest is lost from HP. Unused block stays for the rest of the battle.`,
      `Poison adds stacks to the enemy: ${POISON_TEXT}`,
      `Heal restores your own HP, but never above max HP.`,
      `Knock the enemy out to win. ${STATUS_HELP.timer} If both fall at once, you lose.`,
    ],
  },
];
