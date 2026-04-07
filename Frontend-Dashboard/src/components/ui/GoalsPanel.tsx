"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { MissionCommandDeckCard } from "@/components/dashboard/MissionCommandDeckCard";
import { cn, themeAccent, type ThemeMode } from "@/components/dashboard/dashboardPrimitives";
import { useGoalsPanel } from "@/contexts/GoalsPanelContext";

/** Snappy motion — transform + opacity only, short durations */
const BACKDROP_MS = 0.12;
const SHEET_MS = 0.18;
const SHEET_EASE: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

const MAIN_SCROLL_SELECTOR = "[data-main-shell-scroll]";
const MOBILE_MQ = "(max-width: 767px)";

type OverlayMode = "embedded" | "viewport";

function GoalsPanelOverlay({
  mode,
  onClose,
  themeMode
}: {
  mode: OverlayMode;
  onClose: () => void;
  themeMode: ThemeMode;
}) {
  const t = themeAccent(themeMode);
  const isViewport = mode === "viewport";

  return (
    <div
      className={cn(
        "pointer-events-none min-h-0 overflow-hidden",
        isViewport
          ? "fixed inset-0 z-[200] w-[100vw] max-w-[100vw] overscroll-none"
          : "absolute inset-0 z-[130]"
      )}
    >
      <motion.button
        type="button"
        aria-label="Close Goals and Milestones overlay"
        className="pointer-events-auto absolute inset-0 bg-black/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: BACKDROP_MS * 0.85, ease: "easeIn" } }}
        transition={{ duration: BACKDROP_MS, ease: "easeOut" }}
        onClick={onClose}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="goals-panel-title"
        className={cn(
          "pointer-events-auto absolute flex min-h-0 flex-col overflow-hidden",
          isViewport
            ? "inset-0 h-[100dvh] max-h-[100dvh] w-full max-w-full rounded-none"
            : "inset-0 md:h-full md:max-h-full",
          "cut-frame cyber-frame gold-stroke border border-[rgba(197,179,88,0.35)] bg-[#060606]/98 shadow-[inset_0_1px_0_rgba(255,215,0,0.08)]",
          isViewport &&
            "box-border pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]"
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
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-black/50 px-3 py-2.5 sm:px-4 sm:py-3 md:px-5">
          <h2
            id="goals-panel-title"
            className="min-w-0 flex-1 text-[11px] font-black uppercase leading-snug tracking-[0.14em] text-[color:var(--gold)]/95 sm:text-[12px] sm:tracking-[0.18em] md:tracking-[0.2em]"
          >
            {isViewport ? "Goals & Milestones" : "Goals & Milestones — Ops deck"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 place-items-center rounded-lg border border-white/18 bg-black/45 text-neutral-200/95 transition hover:border-white/32 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(250,204,21,0.5)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#060606]"
            aria-label="Close panel"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>
        <div
          className={cn(
            "min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain p-3 sm:p-4 md:p-5",
            "[scrollbar-color:rgba(197,179,88,0.45)_rgba(0,0,0,0.35)] [touch-action:pan-y]"
          )}
        >
          <MissionCommandDeckCard themeMode={themeMode} layoutVariant={isViewport ? "fullscreen" : "embedded"} />
        </div>
      </motion.div>
    </div>
  );
}

/**
 * Docked overlay in the main column on md+; on small screens portaled to `document.body`
 * so it is not clipped by the split sidebar layout or GSAP transforms on the section.
 */
export function GoalsPanel() {
  const { isGoalsPanelOpen, closeGoalsPanel, themeMode } = useGoalsPanel();
  const [viewportMode, setViewportMode] = useState(false);

  useLayoutEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const apply = () => setViewportMode(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

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

  useEffect(() => {
    if (!isGoalsPanelOpen || !viewportMode) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isGoalsPanelOpen, viewportMode]);

  const mode: OverlayMode = viewportMode ? "viewport" : "embedded";

  const tree = (
    <AnimatePresence mode="sync">
      {isGoalsPanelOpen ? (
        <GoalsPanelOverlay key="goals-overlay" mode={mode} onClose={closeGoalsPanel} themeMode={themeMode} />
      ) : null}
    </AnimatePresence>
  );

  if (viewportMode && typeof document !== "undefined") {
    return createPortal(tree, document.body);
  }

  return tree;
}
