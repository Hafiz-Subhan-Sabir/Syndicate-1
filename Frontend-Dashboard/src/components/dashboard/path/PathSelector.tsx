"use client";

import { motion } from "framer-motion";
import type { GoalId } from "./goalPathData";
import { GOAL_OPTIONS } from "./goalPathData";
import { cn } from "../dashboardPrimitives";

export function PathSelector({ selected, onSelect }: { selected: GoalId; onSelect: (g: GoalId) => void }) {
  return (
    <div className="relative">
      <div className="font-mono fluid-text-ui-xs font-black uppercase tracking-[0.26em] text-[color:var(--gold-neon)]/88 sm:tracking-[0.28em]">
        Your path
      </div>
      <p className="mt-2 max-w-2xl text-[clamp(0.68rem,0.45vw+0.55rem,0.88rem)] leading-relaxed text-white/65">
        Choose a focus. Your roadmap and course flow update automatically.
      </p>
      <div className="mt-[clamp(0.85rem,2vw+0.25rem,1.25rem)] grid grid-cols-1 fluid-path-grid-gap min-[480px]:grid-cols-2 lg:grid-cols-5">
        {GOAL_OPTIONS.map((g) => {
          const on = selected === g.id;
          return (
            <motion.button
              key={g.id}
              type="button"
              onClick={() => onSelect(g.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "compact-card-ui cut-frame-sm cyber-frame relative min-h-[clamp(2.75rem,6vw+1rem,3.5rem)] w-full min-w-0 border px-[clamp(0.65rem,1.8vw+0.2rem,1rem)] py-[clamp(0.45rem,1.2vw+0.15rem,0.85rem)] text-left transition-[box-shadow,border-color,background-color,color] duration-300",
                "font-mono fluid-text-ui-xs font-black uppercase leading-tight tracking-[0.12em] sm:tracking-[0.14em]",
                on
                  ? "z-[1] border-[rgba(250,204,21,0.55)] bg-[linear-gradient(165deg,rgba(255,215,0,0.14),rgba(20,18,8,0.92))] text-[color:var(--gold)] shadow-[0_0_0_1px_rgba(250,204,21,0.35),0_0_28px_rgba(250,204,21,0.18),0_0_56px_rgba(250,204,21,0.08),inset_0_1px_0_rgba(255,255,255,0.08)]"
                  : "border-[rgba(197,179,88,0.2)] bg-[linear-gradient(165deg,rgba(255,255,255,0.04),rgba(0,0,0,0.5))] text-white/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-[rgba(250,204,21,0.38)] hover:text-white/92 hover:shadow-[0_0_20px_rgba(250,204,21,0.08)]"
              )}
            >
              <span className="block truncate uppercase">{g.label}</span>
              <span
                className={cn(
                  "mt-1 block font-mono fluid-text-ui-xs font-bold uppercase tracking-[0.18em]",
                  on ? "text-[color:var(--gold)]/75" : "text-white/45"
                )}
              >
                {g.short}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
