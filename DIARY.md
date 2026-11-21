# Diary

## jamil - 21.11.2026

I forked the exam repository and invited my partner. We briefly discussed ideas for splitting up the work.

I also completed a part of requirement B1. B1 requires a sell feature and a reroll feature. I implemented the sell feature; rerolling is still to be implemented.

First, I checked for situations where items could be lost or duplicated (like stated in the B1 requirement). I noticed that items could still be bought when the backpack was full, so I blocked those purchases. I did not find a scenario that would lead to an item being duplicated.

I then implemented the selling logic, following the style of the buying logic to keep the project consistent. There is a `sellItem` function and a `sellBlocker` function. A sell is blocked when selling the item would result into the player not having any items left. This is the case when you only have one item and the cheapest item in the shop is still more expensive than the coins you would have after making the sell.  
  
Before I implemented it following the current logic, I tried creating a disallowSell function which is passed to a backpack. but the code ended up messy and I redid it this way.

Finally i created the "Diary" file and made this entry and i created the "Changes" file and explained the changes in my first commit.

---

