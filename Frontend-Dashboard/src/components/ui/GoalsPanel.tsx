"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { MissionCommandDeckCard } from "@/components/dashboard/MissionCommandDeckCard";
import { cn, themeAccent } from "@/components/dashboard/dashboardPrimitives";
import { useGoalsPanel } from "@/contexts/GoalsPanelContext";

/** Snappy motion — transform + opacity only, short durations */
const BACKDROP_MS = 0.12;
const SHEET_MS = 0.18;
const SHEET_EASE: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

const MAIN_SCROLL_SELECTOR = "[data-main-shell-scroll]";

/**
 * Docked overlay inside main `<section>` (below navbar, main column width).
 * Ops deck is statically imported; Quick Access is lazy-loaded inside the card.
 * Deck mounts with the panel (no deferred frame) so the shell fills immediately; portal data can hydrate from session cache.
 */
export function GoalsPanel() {
  const { isGoalsPanelOpen, closeGoalsPanel, themeMode } = useGoalsPanel();
  const t = themeAccent(themeMode);

  useEffect(() => {
    if (!isGoalsPanelOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeGoalsPanel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isGoalsPanelOpen, closeGoalsPanel]);

  useEffect(() => {
    const el = document.querySelector<HTMLElement>(MAIN_SCROLL_SELECTOR);
    if (!el) return;
    if (!isGoalsPanelOpen) return;
    const prev = el.style.overflow;
    el.style.overflow = "hidden";
    return () => {
      el.style.overflow = prev;
    };
  }, [isGoalsPanelOpen]);

  return (
    <AnimatePresence mode="sync">
      {isGoalsPanelOpen ? (
        <div className="pointer-events-none absolute inset-0 z-[130] min-h-0 overflow-hidden">
          <motion.button
            type="button"
            aria-label="Close Goals and Milestones overlay"
            className="pointer-events-auto absolute inset-0 bg-black/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: BACKDROP_MS * 0.85, ease: "easeIn" } }}
            transition={{ duration: BACKDROP_MS, ease: "easeOut" }}
            onClick={closeGoalsPanel}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="goals-panel-title"
            className={cn(
              "pointer-events-auto absolute inset-0 flex h-full min-h-0 max-h-full flex-col overflow-hidden",
              "cut-frame cyber-frame gold-stroke border border-[rgba(197,179,88,0.35)] bg-[#060606]/98 shadow-[inset_0_1px_0_rgba(255,215,0,0.08)]"
            )}
            style={{
              borderColor: t.border,
              boxShadow: `inset 0 1px 0 ${t.glow}, 0 0 0 1px ${t.glow}, 0 24px 80px rgba(0,0,0,0.55)`
            }}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: SHEET_MS, ease: SHEET_EASE }}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-black/50 px-4 py-3 sm:px-5">
              <h2
                id="goals-panel-title"
                className="text-[11px] font-black uppercase tracking-[0.2em] text-[color:var(--gold)]/95 sm:text-[12px]"
              >
                Goals &amp; Milestones — Ops deck
              </h2>
              <button
                type="button"
                onClick={closeGoalsPanel}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-white/15 bg-black/40 text-white/80 transition hover:border-white/35 hover:text-white"
                aria-label="Close panel"
              >
                <X className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>
            <div
              className={cn(
                "min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain p-3 sm:p-4 md:p-5",
                "[scrollbar-color:rgba(197,179,88,0.45)_rgba(0,0,0,0.35)] [touch-action:pan-y]"
              )}
            >
              <MissionCommandDeckCard themeMode={themeMode} />
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
