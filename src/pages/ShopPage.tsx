import { fetchOpponent } from "../api";
import { Backpack } from "../components/Backpack";
import { FightBar } from "../components/FightBar";
import { RulesPanel } from "../components/RulesPanel";
import { RunHeader } from "../components/RunHeader";
import { Shop } from "../components/Shop";
import { fightBlocker, SEARCH_FAILED_MESSAGE, searchFailed, startBattle, startSearch, updateRun } from "../game";
import { buyItem, sellItem, reRollShop, moveItem } from "../run";
import { useActiveGame } from "../state/GameContext";

export function ShopPage() {
  const { game, update } = useActiveGame();
  const { run, phase } = game;

  function handleBuy(offerIndex: number) {
    update((current) => updateRun(current, (currentRun) => buyItem(currentRun, offerIndex)));
  }

  function handleSell(slotUid: string) {
    update((current) => updateRun(current, (currentRun) => sellItem(currentRun, slotUid)))
  }

  function handleReRoll() {
    update((current) => updateRun(current, (currentRun) => reRollShop(currentRun)));
  }

  function handleMove(slotUid: string, to: number) {
    update((current) => updateRun(current, (currentRun) => moveItem(currentRun, slotUid, to)));
  }

  // Once the opponent is found the phase becomes "battle" and RequireRoute redirects to the battle page.
  async function handleFindOpponent() {
    if (fightBlocker(game) !== null) return;
    // Responses are matched to this id, so a slow or duplicate response can't start a battle later.
    const searchId = game.searchId + 1;
    update((current) => startSearch(current, searchId));
    try {
      const opponent = await fetchOpponent(run.round);
      update((current) => startBattle(current, searchId, opponent));
    } catch (error) {
      console.error("Opponent search failed:", error);
      update((current) => searchFailed(current, searchId, SEARCH_FAILED_MESSAGE));
    }
  }

  return (
    <>
      <RunHeader run={run} />
      <FightBar phase={phase} blocker={fightBlocker(game)} error={game.error} onFight={handleFindOpponent} />

      {/* While searching, the whole shop/backpack area is disabled so the fighting build can't change. */}
      <fieldset disabled={phase !== "shop"} className="grid min-w-0 gap-4 disabled:opacity-60 lg:grid-cols-[1fr_16rem_18rem]">
        <Shop run={run} onBuy={handleBuy} onReRoll={handleReRoll}/>
        <Backpack run={run} onSell={handleSell} onMove={handleMove}/>
        <aside className="flex flex-col gap-4">
          <RulesPanel open={run.round === 1} />
        </aside>
      </fieldset>
    </>
  );
}
