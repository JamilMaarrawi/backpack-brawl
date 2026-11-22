# Diary

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
