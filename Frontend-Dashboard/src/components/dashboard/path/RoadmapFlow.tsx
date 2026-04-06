"use client";

import { Fragment } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { GoalId, RoadmapStep } from "./goalPathData";
import { GOAL_OPTIONS, ROADMAPS } from "./goalPathData";
import { ArrowConnectorHorizontal, ArrowConnectorVertical } from "./ArrowConnector";
import { FlowCard } from "./FlowCard";
import { cn } from "../dashboardPrimitives";

function ProgressStrip({ steps, currentIndex }: { steps: RoadmapStep[]; currentIndex: number }) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-x-1 gap-y-2 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-white/40 sm:text-[10px] sm:tracking-[0.14em]">
      {steps.map((s, i) => {
        const done = i < currentIndex;
        const cur = i === currentIndex;
        const short = s.title.split("/")[0]!.trim();
        return (
          <Fragment key={s.id}>
            {i > 0 ? <span className="text-[rgba(197,179,88,0.35)]">—</span> : null}
            <span
              className={cn(
                "rounded-md border px-2 py-1",
                done && "border-emerald-400/35 text-emerald-200/85",
                cur && "border-[rgba(255,215,0,0.45)] text-[color:var(--gold)]/90 shadow-[0_0_12px_rgba(197,179,88,0.12)]",
                !done && !cur && "border-white/10 text-white/30"
              )}
            >
              {done ? `${short} ✓` : cur ? short : short}
            </span>
          </Fragment>
        );
      })}
    </div>
  );
}

export function RoadmapFlow({
  goal,
  currentIndex,
  onCompleteStep
}: {
  goal: GoalId;
  currentIndex: number;
  onCompleteStep: () => void;
}) {
  const steps = ROADMAPS[goal];
  const goalLabel = GOAL_OPTIONS.find((g) => g.id === goal)?.label ?? "Your goal";
  const done = currentIndex >= steps.length;

  const leftStep: RoadmapStep | null = currentIndex > 0 ? steps[currentIndex - 1]! : null;
  const centerStep = !done ? steps[currentIndex]! : null;
  const rightStep = !done && currentIndex + 1 < steps.length ? steps[currentIndex + 1]! : null;

  return (
    <div className="relative mt-8 border-t border-[rgba(197,179,88,0.15)] pt-6">
      <div className="font-mono text-[10px] font-extrabold uppercase tracking-[0.22em] text-white/50">Roadmap</div>
      <p className="mt-1 text-[12px] text-white/45 md:text-[13px]">Three steps visible — complete the center focus to advance.</p>

      {!done ? <ProgressStrip steps={steps} currentIndex={currentIndex} /> : null}

      <AnimatePresence mode="wait">
        {done ? (
          <motion.div
            key="complete"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-lg border border-emerald-400/30 bg-emerald-950/25 px-4 py-5 text-center"
          >
            <div className="font-mono text-[11px] font-black uppercase tracking-[0.2em] text-emerald-200/90">Path complete</div>
            <p className="mt-2 text-[13px] text-white/65">
              You finished the <span className="text-[color:var(--gold)]/90">{goalLabel}</span> track. Refine with courses below or switch
              goals.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key={`${goal}-${currentIndex}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="flex w-full flex-col gap-3 lg:flex-row lg:items-stretch lg:gap-2"
          >
            {/* Left — completed or origin */}
            <div className="min-w-0 flex-1">
              {leftStep ? (
                <FlowCard
                  variant="completed"
                  title={leftStep.title}
                  outcome={leftStep.outcome}
                  why={leftStep.why}
                  earningLine={leftStep.earningAfter}
                  icon={leftStep.icon}
                />
              ) : (
                <FlowCard
                  variant="completed"
                  title="Goal set"
                  outcome={goalLabel}
                  why="Foundation locked in — execute the center card, then unlock the next milestone."
                  icon="✓"
                />
              )}
            </div>

            <div className="flex justify-center lg:hidden">
              <ArrowConnectorVertical />
            </div>
            <div className="hidden min-w-[2rem] max-w-[3.5rem] flex-1 items-center justify-center lg:flex">
              <ArrowConnectorHorizontal />
            </div>

            {/* Center — current */}
            <div className="min-w-0 flex-[1.15] lg:flex-[1.2]">
              {centerStep ? (
                <FlowCard
                  variant="current"
                  title={centerStep.title}
                  outcome={centerStep.outcome}
                  why={centerStep.why}
                  earningLine={centerStep.earningAfter}
                  icon={centerStep.icon}
                />
              ) : null}
            </div>

            <div className="flex justify-center lg:hidden">
              <ArrowConnectorVertical />
            </div>
            <div className="hidden min-w-[2rem] max-w-[3.5rem] flex-1 items-center justify-center lg:flex">
              <ArrowConnectorHorizontal />
            </div>

            {/* Right — next preview */}
            <div className="min-w-0 flex-1">
              {rightStep ? (
                <FlowCard variant="next" title={rightStep.title} outcome={rightStep.outcome} why={rightStep.why} icon={rightStep.icon} />
              ) : (
                <div className="flex h-full min-h-[11rem] flex-col items-center justify-center rounded-lg border border-dashed border-[rgba(197,179,88,0.2)] bg-black/30 px-4 text-center">
                  <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Final stretch</p>
                  <p className="mt-2 text-[12px] text-white/50">Complete this step to close out your path.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!done && centerStep ? (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-white/45 md:max-w-[55%]">
            <span className="font-semibold text-[color:var(--gold)]/80">Unlock after completing current step</span> — future stages stay
            blurred until you ship this milestone.
          </p>
          <motion.button
            type="button"
            onClick={onCompleteStep}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            className="cut-frame-sm cyber-frame gold-stroke hud-hover-glow shrink-0 border border-[rgba(197,179,88,0.35)] bg-black/50 px-4 py-2.5 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--gold)]/92"
          >
            Mark step complete
          </motion.button>
        </div>
      ) : null}

      {!done ? (
        <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.14em] text-white/35">
          Step {currentIndex + 1} of {steps.length} · saved on this device
        </p>
      ) : null}
    </div>
  );
}
