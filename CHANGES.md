# Changes

## Changes in the B1 (Sell Item feature) commit

### Backpack.tsx

I imported `sellBlocker` and changed the props to receive `run` instead of just `backpack`. The run contains the backpack and can also be passed to `sellBlocker`. I also added an `onSell` callback to the props.

Each item now has a sell button that calls `onSell` with the item's UID. The button is disabled if `sellBlocker` returns a reason, which is displayed in the button's tooltip.

### ShopPage.tsx

I added `handleSell` and passed it to `Backpack`. It calls `update`, which requires a function that takes a `GameState` and returns a `GameState`. So I pass `updateRun` with the current game and an action. `updateRun` takes a `GameState` and an action, and returns the updated `GameState`; it only applies the action while the game is in the shop phase.

The action itself takes a `RunState` and returns an updated `RunState`. It calls the imported `sellItem` function with the current run and the selected item's UID.

### run.ts

I added `sellItem`, which removes the selected item from the backpack and adds half its price, rounded down, to the gold. I also added `sellBlocker`, which checks the selling conditions and returns a reason or `null`. Finally, I modified `buyBlocker` to block purchases when the backpack is full.

---
## Changes in the B1 (ReRoll Shop feature) commit

### Shop.tsx

I added the reroll button which calls the `onReRoll` function. It is disabled when `reRollBlocker` returns a reason.

### ShopPage.tsx

I added `handleReRoll` which updates the GameState and passed it to `Shop`.

### Items.tsx

I added `getHighestPrice` which returns the price of the most expensive item in the catalog.

### run.tsx

I added `reRollShop` and `reRollBlocker`. I also modified `sellItem` to check for its blocker.

---
## Changes in the B3 (Poison & Heal feature) commit

### types.ts

I added `poison` and `heal` to `ItemEffects`, so items can carry the new effects. `FighterSnapshot` now has a `poison` field, so the battle view can show the stacks of each fighter in every frame. `BattleEventKind` got `"poison"` (an item adds stacks), `"poison-tick"` (damage from the stacks) and `"heal"`. A poison tick is not caused by an item, so it uses the `itemId` `POISON_TICK_SOURCE` instead. This keeps `itemId` required.

### battle.ts

I added four exported constants: `POISON_INTERVAL` (poison deals damage every 2 ticks), `POISON_DAMAGE_PER_STACK` (1 HP per stack), `POISON_MAX_STACKS` (at most 10 stacks per fighter) and `POISON_TICK_SOURCE` (the `itemId` of poison tick events). Keeping them as constants means the rules texts stay correct when the numbers change.

`FighterState` now tracks `poison`. In `resolveItem`, a poison item adds stacks to the enemy, up to `POISON_MAX_STACKS`. Extra stacks are wasted, and the log shows it, e.g. "+3, 10 stacks (max)". The cap stops poison from growing without limit in long battles. A heal item restores the fighter's own HP, capped at `maxHp`. Both emit a log event.

I added `applyPoison`. It runs every `POISON_INTERVAL` ticks, after the items are charged and before they resolve. So stacks added in a tick only count from the next poison tick. The knockout check still runs at the end of the tick. It removes `stacks × POISON_DAMAGE_PER_STACK` HP directly, so block is ignored. Stacks never decay. It emits a `"poison-tick"` event, which is credited to the side that applied the poison, so it appears in that fighter's column of the combat log.

### items.ts

I added six new items: Venom Dagger, Toxic Vial and Thorn Bow (poison), and Healing Herb, Health Potion and Troll Hide (heal). I also added labels for the new effects to `describeEffects`, so they show up on item cards and backpack tooltips.

### rules.ts

I added tooltip texts for poison and heal to `EFFECT_HELP`, a `poison` text to `STATUS_HELP`, and two rules to the battle section of the rules panel. All poison texts are built from the constants in `battle.ts`. They also explain that poison deals damage before items fire, and that new stacks only count from the next poison tick. They also mention the stack cap.

### BattleView.tsx

Each fighter panel now shows a poison counter with a tooltip. Poison and heal lines in the combat log get their own colours. A `"poison-tick"` line shows ☠️ as its icon, because it has no item to take the icon from.

### index.css

I added the `poison` and `heal` colour tokens for the new texts.

### opponents.js

From round 3 on, some opponents use the new items, so the player meets poison and heal in battle: the Ogre has a Venom Dagger, the Knight a Healing Herb, the Golem a Thorn Bow and the King a Health Potion.

### battle.test.ts

I added Vitest tests that check poison stacking, that stacks never decay, the tick interval, that the poison tick resolves before items so new stacks wait for the next interval, that block is ignored, that poison ticks are logged as `"poison-tick"`, the poison stack cap, and the heal cap. I also added a test for a knockout caused by a poison tick, and a determinism test that checks the same fighters always give an identical `BattleResult`. Another test checks that a fighter brought to 0 HP by a poison tick is saved if a heal fires in the same tick, because the knockout check runs at the end of the tick.

---
## Changes in the B4 (Item sets & Burn feature) commit

### types.ts

I added the type `SetId` (`"fire"` or `"guard"`) and an optional `set` field to `ItemDef` and `FighterItem`, so every item can belong to a set. `Fighter` now has `sets`, the sets whose bonus is active for that fighter. `FighterSnapshot` got a `burn` field for the burn counter, and `BattleEventKind` got `"burn-tick"`, like `"poison-tick"`.

### items.ts

I added `SETS`, which defines every set with its name and icon in one place, and `SET_THRESHOLD` (a bonus is active with 2 or more items of a set). I added three Fire items: Torch, Ember Blade and Fire Bomb. Oak Buckler, Pot Lid, Spiked Shield and Troll Hide now belong to the Guard set.

I added `setProgress`, which returns for every set how many of its items are in a list of item ids, the set size and whether the bonus is active. It counts different items only, so two Torches don't activate the Fire set. The shop and the battle both use it.

### battle.ts

I added the constants `BURN_STACKS_PER_HIT` (3), `BURN_DAMAGE_PER_STACK` (1), `BURN_DECAY` (1), `BURN_MAX_STACKS` (10), `BURN_TICK_SOURCE` and `GUARD_EXTRA_BLOCK` (2).

`buildFighter` now computes the active sets from the fighter's items. Because both the player and the opponents are built with it, set bonuses work for both sides.

In `resolveItem`, every hit of a Fire item adds burn stacks to the enemy while the Fire set is active, up to `BURN_MAX_STACKS`. Wasted stacks are shown in the log, e.g. "+3 burn, 10 stacks (max)". The cap is needed because with 2 or more Fire items, more stacks are added per tick than decay removes. While the Guard set is active, every block effect gives `GUARD_EXTRA_BLOCK` extra block.

I added a small `stacks` helper, so the poison and burn log messages say "1 stack" for one stack and "stacks" otherwise.

I added `applyBurn`. It runs every tick, after the poison tick and before the items resolve. Unlike poison, block absorbs burn damage first. After each burn tick, the stacks drop by `BURN_DECAY` until they reach 0. Burn deals more damage than poison because it ticks every tick instead of every 2. It emits a `"burn-tick"` event, credited to the side that applied the burn.

### rules.ts

I added a burn text, a tooltip per set in `SET_HELP`, a `burn` text in `STATUS_HELP`, a burn rule in the battle section and a new "Sets" section in the rules panel. All texts are built from the constants.

### ItemCard.tsx

I added a small `SetBadge` component, which shows the set icon and name with the set bonus as tooltip. Shop items show it. The badge uses a slightly bigger, bold and bright text, so it is easy to see.

### Backpack.tsx

Every backpack item shows its set badge. Above the slots, every set is listed with its progress, e.g. "🔥 Fire 2/3 – active", so the player sees in the shop which bonuses are active.

### BattleView.tsx

Each fighter panel now shows a burn counter and the active set bonuses. Items show their set icon in the corner, on a small dark background so it stands out. Burn lines in the combat log get their own colour and the 🔥 icon.

### index.css

I added the `burn` colour token.

### opponents.js

The Ash Golem now has two Fire items (Ember Blade and Torch) and still two Guard items, so the player meets both set bonuses.

### battle.test.ts

I added `sets: []` to the test fighters and a `burner` helper for a fighter with an active Fire set. I added tests for the set bonus only at 2 or more different items, the Guard bonus, set bonuses for opponents, burn absorbed by block, burn decaying to 0, burn ticking every tick after poison, the burn stack cap, and determinism with sets and burn.
