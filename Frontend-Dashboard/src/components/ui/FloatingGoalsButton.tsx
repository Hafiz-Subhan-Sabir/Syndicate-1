"use client";

import { Target } from "lucide-react";
import { useGoalsPanel } from "@/contexts/GoalsPanelContext";
import { cn } from "@/components/dashboard/dashboardPrimitives";

/** Sections where the FAB is shown (maps to SPA nav keys on `/`). */
const FAB_SECTION_KEYS = new Set(["dashboard", "programs", "affiliate", "resources", "monk"]);

/** Match sidebar nav buttons: cut-frame-sm + premium-gold-border + hud hover language */
const FAB_SHELL =
  "cut-frame-sm hud-hover-glow glass-dark premium-gold-border gold-glow-hover transition";

function prefetchOpsDeckChunks() {
  void import("@/features/productivity/control-center/QuickAccessGrid");
}

export function FloatingGoalsButton() {
  const { openGoalsPanel, isGoalsPanelOpen, shellSectionKey } = useGoalsPanel();
  const allowed = shellSectionKey != null && FAB_SECTION_KEYS.has(shellSectionKey);

  if (!allowed || isGoalsPanelOpen) return null;

  return (
    <button
      type="button"
      onClick={openGoalsPanel}
      onPointerEnter={prefetchOpsDeckChunks}
      onFocus={prefetchOpsDeckChunks}
      className={cn(
        "group",
        FAB_SHELL,
        "fixed bottom-6 right-6 z-[195] flex max-w-[calc(100vw-1.5rem)] items-center gap-2.5 border border-[rgba(197,179,88,0.22)] bg-black/45 px-3 py-2.5 text-left text-[color:var(--gold)]",
        "hover:bg-black/45",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(197,179,88,0.45)]",
        "motion-reduce:transition-none"
      )}
      aria-label="Open Goals and Milestones"
      aria-haspopup="dialog"
      aria-expanded={false}
    >
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-[rgba(197,179,88,0.14)] bg-black/25 text-[color:var(--gold)]/85">
        <Target className="h-[18px] w-[18px]" strokeWidth={2.2} aria-hidden />
      </span>
      <span className="hidden min-[380px]:block text-[12px] font-extrabold uppercase leading-tight tracking-[0.12em] text-[color:var(--gold)]/90 sm:text-[13px] sm:tracking-[0.14em]">
        Goals &amp; Milestones
      </span>
      <span className="min-[380px]:hidden text-[11px] font-extrabold uppercase tracking-[0.12em] text-[color:var(--gold)]/90">
        Goals
      </span>
      <span className="ml-auto hidden h-px w-[28px] bg-[linear-gradient(90deg,rgba(197,179,88,0.0),rgba(197,179,88,0.35))] opacity-0 transition group-hover:opacity-100 min-[380px]:block" />
    </button>
  );
}
