# Diary

## david - 20.11.2026

I read through the requirements and the starter code to get an idea of how much work this is. At first I estimated much more than needed, because I had not looked at the code yet. After reading it, I saw that a lot is already there: the game logic is written as pure functions without React, the state only changes through `update(...)`, and there is already a pattern for blocked actions (`buyBlocker` / `fightBlocker`), where one function tells the UI why something is not possible and also protects the action itself.

While reading I noticed some bugs that are clearly meant to be found: buying with a full backpack loses the gold and the item, a failed opponent search leaves the game stuck in "searching", and a second search can be started while one is running.

Together with Jamil I discussed how to split the work so we don't edit the same files all the time. The idea was to group requirements by the files they touch (battle logic vs. shop/backpack/state).

---

## jamil - 21.11.2026

I forked the exam repository and invited my partner. We briefly discussed ideas for splitting up the work.

I also completed a part of requirement B1. B1 requires a sell feature and a reroll feature. I implemented the sell feature; rerolling is still to be implemented.

First, I checked for situations where items could be lost or duplicated (like stated in the B1 requirement). I noticed that items could still be bought when the backpack was full, so I blocked those purchases. I did not find a scenario that would lead to an item being duplicated.

I then implemented the selling logic, following the style of the buying logic to keep the project consistent. There is a `sellItem` function and a `sellBlocker` function. A sell is blocked when selling the item would result into the player not having any items left. This is the case when you only have one item and the cheapest item in the shop is still more expensive than the coins you would have after making the sell.  
  
Before I implemented it following the current logic, I tried creating a disallowSell function which is passed to a backpack. but the code ended up messy and I redid it this way.

Finally i created the "Diary" file and made this entry and i created the "Changes" file and explained the changes in my first commit.

---

## jamil - 21.11.2026

I completed the missing part of B1 wich is the reroll feature

Here i thought about hardcoding everything and just put 1 everywhere the reroll cost is needed. but for the sake of bestpractice i decided to do it the right way.

I also implemented a blocker. first I though about just checking if player has enough gold to reroll inside the button. But then it came to my mind that if a player is really unlucky he might get 4 offers of the most expensive item after the reroll. In that case he would have enough money to reroll, but if his bag is empty and he has less gold than the most expensive item then he could end up without any items. I thought about instead of creating all these blockers with all these conditions just so the player always has atleast one item, I could just add a restart button. But in the end I decided to go the extra mile and create a blocker that checks these conditions.

---

## david - 21.11.2026

I set up the project locally. Installing pnpm failed on my Mac with a permission error (`EACCES`), because the global npm folder belongs to root. In the end I just used npm, which the README also allows. Note for later: running `npm install` on my machine rewrote `package-lock.json` (it dropped a few optional peer dependencies). This ended up in my B3 commit by accident because I used `git add .`. It doesn't break anything, but next time I will check `git status` more carefully before committing.

---

## david - 22.11.2026

I implemented B3 (poison and heal).

Before writing any code I fixed the values, because the requirement says our team has to choose them and explain them: poison ticks every 2 ticks (1 s), deals 1 HP per stack, ignores block and never decays. Heal restores HP but never above max HP. All values are exported constants in `battle.ts`, and the rules texts in `rules.ts` are built from them, so they can never be out of date. A nice side effect: `EFFECT_HELP` is typed as `Record<keyof ItemEffects, string>`, so TypeScript forced me to write the help texts as soon as I added the new effects.

First I made `itemId` optional in `BattleEvent`, because a poison tick is not caused by an item. I changed that again and added a separate event kind `"poison-tick"` instead. With an optional `itemId` the difference between "an item adds stacks" and "stacks deal damage" was only implicit, and every place using `itemId` would have needed an `undefined` check.

While testing I noticed that new poison sometimes dealt damage in the same tick it was applied, but only for items with an even cooldown. That felt random, so I moved the poison tick before the items. Now new stacks always count from the next poison tick, no matter which item applied them.

I also did a quick balancing check. Without a limit, stacks keep growing, so the damage grows quadratically: a Toxic Vial (4 gold) would have done more damage after 15 s than the Iron Cleaver does in a whole battle, and ignores block on top. So I added a cap of 10 stacks. Extra stacks are wasted and the log shows it.

One edge case I decided to keep: if a poison tick brings a fighter to 0 HP and a heal item fires in the same tick, the fighter survives. This matches the starter's rule that everything in one tick happens at the same time and the knockout is checked at the end. I added a test for it so it is documented as a decision and not a bug.

The tests in `battle.test.ts` check stacking, the tick interval, that block is ignored, the cap, a knockout by poison, the heal cap and determinism. I was unsure if this is too many tests for one requirement, but each test covers exactly one rule from the requirement or one of our decisions.

---

## david - 22.11.2026

I implemented B4 (item sets and burn).

There are two sets. Fire has three new items (Torch, Ember Blade, Fire Bomb). Guard reuses existing items (Oak Buckler, Pot Lid, Spiked Shield, Troll Hide), which the requirement allows. A set is active with 2 or more different items. I count different item ids on purpose, because the idea of a set is to collect different items, not to buy the same one twice.

Burn only exists through the Fire set bonus: while Fire is active, every Fire hit adds 3 burn stacks. That way "the Fire set adds a new status" is fulfilled directly. To make burn clearly different from poison, it ticks every tick (twice as often as poison), block absorbs it first, and it decays by 1 stack after every tick.

At first I planned burn without a cap, because I thought the decay would limit it. When I did the math, it doesn't: two Fire items add about 1.35 stacks per tick, but decay only removes 1. So burn would keep growing for the whole battle, the same problem poison had. Burn now also has a cap of 10. It still deals more damage than poison, because it ticks twice as often.

The active sets are computed in `buildFighter`. The player and the opponents are built with the same function, so set bonuses automatically work for both sides. I gave the Ash Golem two Fire items so players actually meet the Fire set.

I like that the sets play against each other: burn is absorbed by block, and the Guard set gives extra block, so Guard is a counter to Fire. Poison can only be countered with heal.

After playing I made the set badges bigger and fixed the log text to say "1 stack" instead of "1 stacks". I checked the burn numbers by hand against the combat log, and the stacks, decay and block absorption matched exactly.

---

## david - 22.11.2026

I implemented B5 (resilient matchmaking).

Most of the work was fixing the bugs I found on the first day. `searchFailed` now sets the phase back to "shop", so the player can keep shopping and retry. `fightBlocker` now also blocks while a search is running, so a second search can't start.

For slow, duplicate and late responses I added a `searchId` to the game state. Every search gets a new id, and `startBattle` and `searchFailed` only change something if the phase is still "searching", the id matches, and (for the battle) the opponent is for the current round. All other responses are ignored. In the first version the id was calculated in two places (`ShopPage` and `startSearch`). I changed it so `ShopPage` creates it once and passes it along, because two calculations of the same value could drift apart.

I also added a check of the opponent JSON in `api.ts` (`parseOpponent`). A broken response is also a "failed API", and without the check an unknown item id would crash the game when the battle starts. I put the check in the API layer on purpose and not inside the state update, so the state functions stay pure and the existing `catch` handles it like any other error.

The first error message said "Check that the game server is running". I changed it to "The arena couldn't find you an opponent right now", because the message is also shown when the server is running and just refuses the request.

I tested it by hand with `API_LATENCY=5000` (search visible, button locked, multiple clicks start only one battle), `API_FAIL=true` (back in a usable shop, retry works) and with the server stopped. The unit tests in `game.test.ts` cover late, duplicate and wrong-round responses and that the result is only applied once.

---

## jamil - 22.11.2026

I implemented B2 (backpack arrangement).

I decided to use drag and drop for moving items. While an item is dragged it is highlighted, and the other slots pulse to show where it can be dropped. Dropping it on another slot moves it, and ending or cancelling the drag clears the selection.

The logic is a new pure function `moveItem` in `run.ts`, following the same style as buying and selling. It finds the item by its UID and swaps it with the target slot. If the target is empty, that works the same way, because the item is just swapped with `null`. Invalid moves and moves onto the same slot return the state unchanged. In `ShopPage` the move goes through `updateRun`, so items can only be moved while shopping and not during a search or battle.

---

## jamil - 24.11.2026

I implemented B6 (save and resume).

The game is saved to `localStorage` before the displayed state is updated. I used a ref so the latest game is always available between renders.

When the page loads, the saved game is checked with `isGameValid` before it is restored. It checks the run, shop, backpack, phase and the battle replay. If anything is malformed or describes an impossible run, the player goes back to the start screen instead of the game breaking.

For the refresh policy I decided: a search that was interrupted by a refresh starts again for the same round and the same search ID, and a battle replay continues from its saved frame. This way a refresh can't be used to get a free reroll, a second result or to avoid a loss. A different opponent is also not possible, because the opponent only depends on the round. The shop offers come from the saved seed, so they don't change after a refresh either.

One problem was that a refresh during a search makes the request fail, and that failure was saved as a normal search error. Now `ShopPage` checks if the page is being left and doesn't save that error, so the saved game stays in the searching phase and the search can restart after loading.

I added tests in `GameProvider.test.tsx` for valid saves, invalid run data, finished battles and broken replay data, and documented the refresh policy in the README.

---

## jamil - 25.11.2026

I implemented B7 (hall of fame / leaderboard).

At the end of a run the player can enter a name and submit the run. If the submission fails, the name stays in the field so it can be retried without typing it again. Every run gets a unique `gameId`, which is saved with the game, so the same run can't be submitted twice, also not after a refresh.

On the server I added `POST /api/leaderboard` and `GET /api/leaderboard`. The server validates every submission: the IDs and the name must be valid strings with a maximum length, wins must be between 0 and 5, losses between 0 and 3, and the run has to be finished (5 wins or 3 losses). A run with a `gameId` that was already submitted is rejected with 409. Invalid JSON returns a clear 400 error.

The requirement says storing the entries in memory is enough, but I saved them to a JSON file, so the leaderboard survives a server restart. The file is written to a temporary file first and then renamed, so it can't end up half written.

The list is sorted by wins first, then fewer losses, then the earlier submission. The leaderboard page has loading, empty and error states with a retry button, highlights runs from the current browser, and is reachable from the start page. Like the opponent API, both endpoints support `?fail=true` and `API_FAIL=true` for testing. The new endpoints are documented in `docs/API.md`.

---