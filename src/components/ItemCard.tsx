import type { ReactNode } from "react";
import { TICK_SECONDS } from "../battle";
import { describeEffects, SETS } from "../items";
import { COOLDOWN_HELP, EFFECT_HELP, SET_HELP } from "../rules";
import type { ItemDef, SetId } from "../types";

interface ItemCardProps {
  item: ItemDef;
  /** Extra content below the stats, e.g. a buy button. */
  children?: ReactNode;
}

export function ItemCard({ item, children }: ItemCardProps) {
  return (
    <article className="flex flex-col gap-2 rounded-lg border-2 border-gold/40 bg-ink/40 p-3">
      <div className="flex items-start gap-3">
        <span className="text-3xl leading-none" aria-hidden>
          {item.icon}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display font-bold">{item.name}</h3>
          {item.set && <SetBadge set={item.set} />}
        </div>
      </div>
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
        {describeEffects(item.effects).map(({ effect, label }) => (
          <li key={effect} title={EFFECT_HELP[effect]} className={HELP}>
            {label}
          </li>
        ))}
        <li title={COOLDOWN_HELP} className={`text-muted ${HELP}`}>
          ⏱️ every {item.cooldown * TICK_SECONDS}s
        </li>
      </ul>
      {children}
    </article>
  );
}

/** Small set label with the set bonus as tooltip. */
export function SetBadge({ set }: { set: SetId }) {
  return (
    <span title={SET_HELP[set]} className="cursor-help rounded bg-ink/60 px-1.5 py-0.5 text-sm font-bold text-parchment">
      {SETS[set].icon} {SETS[set].name}
    </span>
  );
}

/** Hover hint styling for texts that have an explanatory tooltip. */
const HELP = "cursor-help underline decoration-dotted decoration-muted/60 underline-offset-2";
