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