"use client";

import { motion } from "framer-motion";
import type { GoalId } from "./goalPathData";
import { GOAL_OPTIONS } from "./goalPathData";
import { cn } from "../dashboardPrimitives";

export function PathSelector({ selected, onSelect }: { selected: GoalId; onSelect: (g: GoalId) => void }) {
  return (
    <div className="relative">
      <div className="font-mono text-[10px] font-extrabold uppercase tracking-[0.22em] text-white/50">Your path</div>
      <p className="mt-1 max-w-xl text-[12px] leading-relaxed text-white/45 md:text-[13px]">
        Choose a focus. Your roadmap and course flow update automatically.
      </p>
      <div className="mt-4 flex flex-wrap gap-2 sm:gap-2.5">
        {GOAL_OPTIONS.map((g) => {
          const on = selected === g.id;
          return (
            <motion.button
              key={g.id}
              type="button"
              onClick={() => onSelect(g.id)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "cut-frame-sm cyber-frame relative min-h-[44px] border px-3 py-2.5 text-left transition",
                "font-mono text-[11px] font-black uppercase tracking-[0.12em] sm:px-4 sm:text-[12px] sm:tracking-[0.14em]",
                on
                  ? "border-[rgba(255,215,0,0.55)] bg-[rgba(255,215,0,0.08)] text-[color:var(--gold)]/95 shadow-[0_0_24px_rgba(197,179,88,0.15)]"
                  : "border-[rgba(197,179,88,0.22)] bg-black/40 text-white/70 hover:border-[rgba(197,179,88,0.4)] hover:text-white/88"
              )}
            >
              <span className="block truncate">{g.label}</span>
              <span className="mt-0.5 block font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-white/40">
                {g.short}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
