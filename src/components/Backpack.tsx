import { TICK_SECONDS } from "../battle";
import { describeEffects, getItem, setProgress, SETS } from "../items";
import { SET_HELP } from "../rules";
import { BACKPACK_COLS, itemIdsOf } from "../shop";
import { SetBadge } from "./ItemCard";
import type { RunState, ItemDef } from "../types";
import { sellBlocker } from "../run";

/** Hover text for a backpack slot: name, effects and cooldown. */
const tooltip = (item: ItemDef) =>
  [item.name, ...describeEffects(item.effects).map(({ label }) => label), `⏱️ every ${item.cooldown * TICK_SECONDS}s`].join("\n");

interface BackpackProps {
  run: RunState;
  onSell: (slotUid: string) => void;
}

export function Backpack({ run, onSell }: BackpackProps) {
  return (
    <section className="rounded-lg border border-panel-edge bg-panel p-4">
      <h2 className="font-display text-xl font-bold">🎒 Backpack</h2>
      <p className="mb-3 text-sm text-muted">Hover an item to see its stats.</p>
      <ul className="mb-3 flex flex-col gap-1 text-sm" aria-label="Sets">
        {setProgress(itemIdsOf(run.backpack)).map(({ set, count, size, active }) => (
          <li key={set} title={SET_HELP[set]} className={`cursor-help ${active ? "font-bold text-gold" : "text-muted"}`}>
            {SETS[set].icon} {SETS[set].name} {count}/{size}{active ? " – active" : ""}
          </li>
        ))}
      </ul>
      <ul className="grid gap-2" style={{ gridTemplateColumns: `repeat(${BACKPACK_COLS}, minmax(0, 1fr))` }}>
        {run.backpack.map((slot, index) => {
          const item = slot ? getItem(slot.itemId) : null;
          const blocker = item ? sellBlocker(run, Math.floor(item.price/2)) : null;
          return (
            <li
              key={slot?.uid ?? `empty-${index}`}
              title={item ? tooltip(item) : undefined}
              aria-label={item ? item.name : `Empty slot ${index + 1}`}
              className={[
                "flex aspect-square flex-col items-center justify-center gap-1 rounded-md border-2 p-1",
                item ? "cursor-help border-gold/40 bg-ink/40" : "border-dashed border-panel-edge",
              ].join(" ")}
            >
              {item && (
                <>
                  <span className="text-3xl leading-none sm:text-4xl" aria-hidden>
                    {item.icon}
                  </span>
                  <span className="text-center text-xs leading-tight">{item.name}</span>
                  {item.set && <SetBadge set={item.set} />}
                  <button
                  type="button"
                  disabled={blocker !== null}
                  onClick={() => onSell(slot!.uid)}
                  title={blocker ?? ""}
                  className="mt-auto rounded-md bg-gold px-3 py-1.5 text-xs font-bold text-ink hover:brightness-110 disabled:bg-panel-edge disabled:text-muted"
                >
                  {`Sell for ${Math.floor(item.price/2)} 🪙`}
                </button>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
