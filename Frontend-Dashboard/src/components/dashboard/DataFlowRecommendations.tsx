"use client";

import { Fragment } from "react";
import { motion } from "framer-motion";
import type { DashboardNavKey, DashboardSnapshots } from "./types";
import { cn, type ThemeMode } from "./dashboardPrimitives";

type FlowTone = "cyan" | "gold" | "violet";

const toneStyle: Record<
  FlowTone,
  { border: string; label: string; glow: string; shimmer: string; arrow: string }
> = {
  cyan: {
    border: "rgba(0,255,255,0.42)",
    label: "text-fuchsia-200/85",
    glow: "rgba(0,255,255,0.12)",
    shimmer: "rgba(34,211,238,0.9)",
    arrow: "text-cyan-300/90"
  },
  gold: {
    border: "rgba(255,215,0,0.48)",
    label: "text-[color:var(--gold)]/90",
    glow: "rgba(255,215,0,0.1)",
    shimmer: "rgba(253,224,71,0.92)",
    arrow: "text-[color:var(--gold)]/85"
  },
  violet: {
    border: "rgba(196,126,255,0.38)",
    label: "text-fuchsia-200/80",
    glow: "rgba(168,85,247,0.08)",
    shimmer: "rgba(216,180,254,0.8)",
    arrow: "text-violet-300/80"
  }
};

function FlowArrowHorizontal({ tone }: { tone: FlowTone }) {
  const t = toneStyle[tone];
  return (
    <div className="flex w-full min-w-[2rem] max-w-[5rem] flex-1 items-center gap-0.5">
      <div className="relative h-[3px] min-w-0 flex-1 overflow-hidden rounded-full bg-black/55 ring-1 ring-white/10">
        <motion.div
          className="absolute left-0 top-0 bottom-0 w-[45%] rounded-full opacity-95"
          style={{
            background: `linear-gradient(90deg, transparent, ${t.shimmer}, transparent)`,
            boxShadow: `0 0 14px ${t.shimmer}`
          }}
          animate={{ x: ["-35%", "240%"] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
        />
      </div>
      <svg
        className={cn("h-6 w-6 shrink-0 drop-shadow-[0_0_10px_rgba(255,255,255,0.08)]", t.arrow)}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
      >
        <path
          d="M9 6l6 6-6 6"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function FlowArrowVertical({ tone }: { tone: FlowTone }) {
  const t = toneStyle[tone];
  return (
    <div className="flex h-14 w-full flex-col items-center justify-center gap-0.5">
      <div className="relative h-10 w-[3px] overflow-hidden rounded-full bg-black/55 ring-1 ring-white/10">
        <motion.div
          className="absolute left-0 right-0 top-0 h-[42%] w-full rounded-full opacity-95"
          style={{
            background: `linear-gradient(180deg, transparent, ${t.shimmer}, transparent)`,
            boxShadow: `0 0 12px ${t.shimmer}`
          }}
          animate={{ y: ["-40%", "200%"] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
        />
      </div>
      <svg className={cn("h-5 w-5 shrink-0", t.arrow)} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M6 9l6 6 6-6"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function FlowStepCard({
  lane,
  tone,
  title,
  reason,
  onOpen
}: {
  lane: string;
  tone: FlowTone;
  title: string;
  reason: string;
  onOpen: () => void;
}) {
  const t = toneStyle[tone];
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      className={cn(
        "flex min-h-[8.75rem] min-w-0 flex-1 flex-col rounded-xl border bg-[#070707]/92 p-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition md:min-h-[9.75rem] md:p-5 lg:min-h-[10.5rem]",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(197,179,88,0.45)]"
      )}
      style={{
        borderColor: t.border,
        boxShadow: `0 0 0 1px ${t.glow}, inset 0 1px 0 rgba(255,255,255,0.04)`
      }}
    >
      <div className={cn("text-[10px] font-black uppercase tracking-[0.2em] md:text-[11px]", t.label)}>{lane}</div>
      <div className="mt-2.5 text-[15px] font-bold leading-snug text-white/92 md:text-[16px]">{title}</div>
      <p className="mt-2 text-[12px] leading-relaxed text-white/55 md:text-[13px]">{reason}</p>
    </motion.button>
  );
}

export function DataFlowRecommendations({
  snapshots,
  onNavigate
}: {
  themeMode: ThemeMode;
  snapshots: DashboardSnapshots;
  onNavigate: (nav: DashboardNavKey) => void;
}) {
  const rec = snapshots.recommendations;
  const steps: Array<{
    id: string;
    lane: string;
    tone: FlowTone;
    nav: DashboardNavKey;
    title: string;
    reason: string;
  }> = [];

  if (rec.systemTip) {
    steps.push({
      id: "system",
      lane: "SYSTEM FLOW",
      tone: "cyan",
      nav: rec.systemTip.nav,
      title: rec.systemTip.title,
      reason: rec.systemTip.reason
    });
  }
  if (rec.reminder) {
    steps.push({
      id: "focus",
      lane: "FOCUS FLOW",
      tone: "gold",
      nav: rec.reminder.nav,
      title: rec.reminder.title,
      reason: rec.reminder.reason
    });
  }
  if (rec.nextProgram) {
    steps.push({
      id: "program",
      lane: "PROGRAM FLOW",
      tone: "violet",
      nav: rec.nextProgram.nav,
      title: rec.nextProgram.title,
      reason: rec.nextProgram.reason
    });
  }

  if (steps.length === 0) return null;

  const arrowBetween: FlowTone[] = ["cyan", "gold"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="cut-frame cyber-frame gold-stroke relative w-full max-w-none overflow-hidden border border-[rgba(197,179,88,0.24)] bg-[#060606]/78 p-4 backdrop-blur-[10px] sm:p-5 md:p-6"
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.85] [background:radial-gradient(880px_320px_at_20%_0%,rgba(197,179,88,0.08),rgba(0,0,0,0)_60%)]" />
      <div className="relative">
        <div className="font-mono text-[11px] font-extrabold uppercase tracking-[0.24em] text-white/55 md:text-[12px]">
          DATA FLOW RECOMMENDATIONS
        </div>
        <motion.div
          className="mt-4 flex w-full flex-col lg:mt-5 lg:flex-row lg:items-stretch"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.08, delayChildren: 0.06 } }
          }}
        >
          {steps.map((step, i) => (
            <Fragment key={step.id}>
              {i > 0 ? (
                <>
                  <div className="flex justify-center lg:hidden">
                    <FlowArrowVertical tone={arrowBetween[i - 1] ?? "cyan"} />
                  </div>
                  <motion.div
                    className="hidden min-w-[2.5rem] max-w-[5rem] flex-1 items-center justify-center px-1 lg:flex"
                    variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}
                  >
                    <FlowArrowHorizontal tone={arrowBetween[i - 1] ?? "cyan"} />
                  </motion.div>
                </>
              ) : null}
              <motion.div
                className="min-w-0 flex-1"
                variants={{
                  hidden: { opacity: 0, x: -12 },
                  show: { opacity: 1, x: 0, transition: { duration: 0.32, ease: "easeOut" } }
                }}
              >
                <FlowStepCard
                  lane={step.lane}
                  tone={step.tone}
                  title={step.title}
                  reason={step.reason}
                  onOpen={() => onNavigate(step.nav)}
                />
              </motion.div>
            </Fragment>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
