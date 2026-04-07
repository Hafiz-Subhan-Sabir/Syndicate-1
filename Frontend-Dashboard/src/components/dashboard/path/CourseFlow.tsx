"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { DashboardNavKey } from "../types";
import type { CourseRec, GoalId } from "./goalPathData";
import { ROADMAPS, coursesForGoalStep, personalizeCourses } from "./goalPathData";
import type { DashboardCourseLike } from "../useDashboardSnapshots";
import { ArrowConnectorHorizontal, ArrowConnectorVertical } from "./ArrowConnector";
import { cn } from "../dashboardPrimitives";

const CAROUSEL_MS = 4200;

function CourseFlowCard({
  course,
  variant,
  isAnchor,
  onContinue
}: {
  course: CourseRec;
  variant: "support" | "focus" | "future";
  isAnchor: boolean;
  onContinue: () => void;
}) {
  return (
    <motion.div
      layout={false}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
      whileHover={isAnchor ? { scale: 1.012 } : { scale: 1.022 }}
      className={cn(
        "compact-card-ui group relative flex min-h-[clamp(10.5rem,22vh,14rem)] min-w-0 flex-1 flex-col overflow-hidden border",
        "cut-frame-sm cyber-frame backdrop-blur-[2px]",
        /* Ledger gold deck–aligned shell (MissionCommandDeckCard DECK_NOTES family) */
        "border-[rgba(255,215,0,0.46)] bg-gradient-to-b from-[rgba(255,215,0,0.11)] via-[#060606]/96 to-[#050505]",
        "shadow-[0_14px_48px_rgba(0,0,0,0.48),0_0_0_1px_rgba(255,215,0,0.14),0_0_44px_rgba(255,215,0,0.12),0_0_72px_rgba(255,200,0,0.06),inset_0_1px_0_rgba(255,255,255,0.06)]",
        "transition-[box-shadow,border-color,filter] duration-300",
        isAnchor
          ? "z-[3] gold-stroke-strong hud-selected-glow hover:!brightness-[1.12] hover:shadow-[0_14px_52px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,235,160,0.45),0_0_56px_rgba(255,215,0,0.28),0_0_96px_rgba(255,200,0,0.14),0_0_120px_rgba(255,180,0,0.08),inset_0_1px_0_rgba(255,248,220,0.12)]"
          : "z-[1] gold-stroke hud-hover-glow hover:border-[rgba(255,235,160,0.72)] hover:shadow-[0_14px_52px_rgba(0,0,0,0.48),0_0_0_1px_rgba(255,215,0,0.28),0_0_56px_rgba(255,215,0,0.2),0_0_88px_rgba(255,200,0,0.1),inset_0_1px_0_rgba(255,248,220,0.08)]"
      )}
    >
      {/* Sun + ledger wash — globals.css */}
      <div className="opportunity-card-ledger-glow" aria-hidden />
      <div className={cn("opportunity-card-sun", isAnchor && "opportunity-card-sun-strong")} aria-hidden />
      <div className="opportunity-card-sun-ray" aria-hidden />
      {/* Horizon glint */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[42%] opacity-80 [background:linear-gradient(180deg,rgba(255,252,235,0.08),transparent_72%)]"
        aria-hidden
      />
      {isAnchor ? (
        <div
          className="pointer-events-none absolute inset-0 [background:radial-gradient(ellipse_100%_70%_at_50%_0%,rgba(255,248,220,0.1),transparent_55%)]"
          aria-hidden
        />
      ) : null}

      <div className="relative z-[1] flex flex-1 flex-col p-[var(--fluid-card-p)]">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "font-mono fluid-text-ui-xs font-black uppercase tracking-[0.2em]",
              isAnchor ? "heading-glow text-[color:var(--gold)]" : "text-[color:var(--gold)] drop-shadow-[0_0_12px_rgba(250,204,21,0.35)]"
            )}
          >
            {variant === "focus" ? "Recommended now" : variant === "support" ? "Supporting" : "Up next"}
          </span>
          {isAnchor ? (
            <span className="rounded-md border border-[rgba(255,235,160,0.55)] bg-[rgba(255,215,0,0.18)] px-[clamp(0.35rem,1vw+0.1rem,0.5rem)] py-[clamp(0.1rem,0.4vw+0.05rem,0.35rem)] font-mono fluid-text-ui-xs font-black uppercase tracking-[0.18em] text-[color:var(--gold)] shadow-[0_0_18px_rgba(250,204,21,0.45),inset_0_1px_0_rgba(255,248,220,0.12)]">
              Flow
            </span>
          ) : null}
        </div>
        <h3
          className={cn(
            "mt-[clamp(0.65rem,1.5vw+0.2rem,1rem)] text-[clamp(0.78rem,0.6vw+0.55rem,1rem)] font-bold leading-snug text-white",
            isAnchor && "drop-shadow-[0_0_20px_rgba(255,248,220,0.15)]"
          )}
        >
          {course.title}
        </h3>
        <p className="mt-2 text-[clamp(0.68rem,0.45vw+0.5rem,0.9rem)] leading-relaxed text-white/90">{course.outcome}</p>
        <p className="mt-2 font-mono fluid-text-ui-xs font-bold uppercase tracking-[0.14em] text-emerald-200 [text-shadow:0_0_14px_rgba(52,211,153,0.35)]">
          {course.earningHint}
        </p>
        <div className="mt-auto pt-[clamp(0.85rem,2vw+0.2rem,1.15rem)]">
          <motion.button
            type="button"
            onClick={onContinue}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "w-full rounded-lg border px-[clamp(0.5rem,1.2vw+0.2rem,0.85rem)] py-[clamp(0.45rem,1vw+0.2rem,0.85rem)] font-mono fluid-text-ui-xs font-black uppercase tracking-[0.18em] transition",
              isAnchor
                ? "border-[rgba(255,215,0,0.58)] bg-[rgba(255,215,0,0.14)] text-[color:var(--gold)] shadow-[0_4px_0_rgba(0,0,0,0.42),0_0_0_1px_rgba(255,215,0,0.26),0_8px_32px_rgba(255,200,0,0.22),inset_0_1px_0_rgba(255,248,220,0.1)] hover:border-[rgba(255,235,160,0.82)] hover:bg-[rgba(255,215,0,0.2)] hover:shadow-[0_0_28px_rgba(255,215,0,0.35)]"
                : "border-[rgba(255,215,0,0.44)] bg-black/50 text-white/95 shadow-[0_0_0_1px_rgba(255,215,0,0.12),inset_0_1px_0_rgba(255,215,0,0.08)] hover:border-[rgba(255,235,160,0.65)] hover:shadow-[0_0_24px_rgba(255,200,0,0.18)]"
            )}
          >
            Continue path
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

export function CourseFlow({
  goal,
  courses,
  userStepIndex,
  onNavigate
}: {
  goal: GoalId;
  courses: DashboardCourseLike[];
  userStepIndex: number;
  onNavigate: (nav: DashboardNavKey) => void;
}) {
  const go = () => onNavigate("programs");
  const roadmapLen = ROADMAPS[goal].length;
  const maxSlides = Math.min(5, roadmapLen);

  const [slideIndex, setSlideIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const stepIdx = Math.min(Math.max(0, userStepIndex), Math.max(0, roadmapLen - 1));

  useEffect(() => {
    setSlideIndex(0);
  }, [goal]);

  useEffect(() => {
    if (paused || maxSlides <= 1) return;
    const id = window.setInterval(() => {
      setSlideIndex((i) => (i + 1) % maxSlides);
    }, CAROUSEL_MS);
    return () => window.clearInterval(id);
  }, [goal, maxSlides, paused]);

  const anchorCourse = useMemo(() => {
    const row = coursesForGoalStep(goal, stepIdx);
    const t: [CourseRec, CourseRec, CourseRec] = [row[0]!, row[1]!, row[2]!];
    const p = personalizeCourses(goal, stepIdx, t, courses);
    return p[0]!;
  }, [goal, stepIdx, courses]);

  const { movingB, movingC } = useMemo(() => {
    const row = coursesForGoalStep(goal, slideIndex);
    const t: [CourseRec, CourseRec, CourseRec] = [row[0]!, row[1]!, row[2]!];
    const p = personalizeCourses(goal, slideIndex, t, courses);
    return { movingB: p[1]!, movingC: p[2]! };
  }, [goal, slideIndex, courses]);

  return (
    <div
      className="relative mt-[clamp(1.5rem,4vw+0.5rem,2.75rem)] border-t border-[rgba(197,179,88,0.22)] pt-[clamp(1rem,2.5vw+0.35rem,2rem)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="flex flex-wrap items-end justify-between gap-[clamp(0.65rem,1.8vw+0.2rem,1rem)]">
        <div>
          <div className="font-mono fluid-text-ui-xs font-black uppercase tracking-[0.28em] text-[color:var(--gold-neon)] sm:tracking-[0.3em]">
            Next opportunities
          </div>
          <p className="mt-2 text-[clamp(0.68rem,0.5vw+0.55rem,0.9rem)] leading-relaxed text-white/88">
            Natural progression — earn more and sharpen skills without noise.
          </p>
          {maxSlides > 1 ? (
            <p className="mt-1 font-mono text-[clamp(0.5rem,0.35vw+0.38rem,0.58rem)] uppercase tracking-[0.18em] text-white/55">
              Selected path (left) stays fixed · center and right cycle{paused ? " · paused on hover" : ""}
            </p>
          ) : null}
        </div>
        {maxSlides > 1 ? (
          <div className="flex items-center gap-1.5" role="tablist" aria-label="Opportunity slide (center and right cards)">
            {Array.from({ length: maxSlides }).map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === slideIndex}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === slideIndex ? "w-7 bg-[color:var(--gold)] shadow-[0_0_12px_rgba(250,204,21,0.45)]" : "w-1.5 bg-white/25 hover:bg-white/40"
                )}
                onClick={() => setSlideIndex(i)}
              />
            ))}
          </div>
        ) : null}
      </div>

      <div className="relative mt-[clamp(1rem,2.5vw+0.35rem,1.35rem)] flex min-h-[clamp(10.5rem,22vh,14rem)] min-w-0 flex-col gap-[clamp(0.65rem,1.8vw+0.2rem,1.1rem)] lg:flex-row lg:items-stretch">
        {/* Slot 0: fixed selected course — does not participate in slide animation */}
        <div className="min-w-0 flex-1">
          <CourseFlowCard course={anchorCourse} variant="support" isAnchor onContinue={go} />
        </div>

        <div className="flex justify-center lg:hidden">
          <ArrowConnectorVertical />
        </div>
        <div className="hidden min-h-0 min-w-[2rem] max-w-[3.5rem] flex-1 items-center justify-center lg:flex">
          <ArrowConnectorHorizontal />
        </div>

        {/* Slots 1–2: carousel — only these animate */}
        <div className="relative min-h-[clamp(10.5rem,22vh,14rem)] min-w-0 flex-[1.85] overflow-hidden lg:flex-[2]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${goal}-${slideIndex}`}
              initial={{ opacity: 0, x: 32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -26 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="flex h-full min-h-[clamp(10.5rem,22vh,14rem)] w-full min-w-0 flex-col gap-[clamp(0.65rem,1.8vw+0.2rem,1.1rem)] lg:flex-row lg:items-stretch"
            >
              <div className="min-w-0 flex-1 lg:min-h-0 lg:flex-[1.12]">
                <CourseFlowCard course={movingB} variant="focus" isAnchor={false} onContinue={go} />
              </div>
              <div className="flex justify-center lg:hidden">
                <ArrowConnectorVertical />
              </div>
              <div className="hidden min-w-[2rem] max-w-[3.5rem] flex-1 items-center justify-center lg:flex">
                <ArrowConnectorHorizontal />
              </div>
              <div className="min-w-0 flex-1">
                <CourseFlowCard course={movingC} variant="future" isAnchor={false} onContinue={go} />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
