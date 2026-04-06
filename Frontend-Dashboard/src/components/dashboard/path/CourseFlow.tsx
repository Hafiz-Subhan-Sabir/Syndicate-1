"use client";

import { motion } from "framer-motion";
import type { DashboardNavKey } from "../types";
import type { CourseRec } from "./goalPathData";
import { ArrowConnectorHorizontal, ArrowConnectorVertical } from "./ArrowConnector";
import { cn } from "../dashboardPrimitives";

function CourseFlowCard({
  course,
  variant,
  onContinue
}: {
  course: CourseRec;
  variant: "support" | "focus" | "future";
  onContinue: () => void;
}) {
  const focus = variant === "focus";
  return (
    <motion.div
      layout
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      whileHover={{ scale: focus ? 1.045 : 1.03 }}
      className={cn(
        "relative flex min-h-[12.5rem] min-w-0 flex-1 flex-col overflow-hidden border bg-[#070707]/92",
        "cut-frame-sm cyber-frame",
        focus
          ? "z-[2] scale-[1.02] border-[rgba(255,215,0,0.5)] shadow-[0_0_0_1px_rgba(255,215,0,0.18),0_0_36px_rgba(197,179,88,0.2)] sm:scale-105"
          : "border-[rgba(197,179,88,0.22)] opacity-88 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
      )}
    >
      <div className="pointer-events-none absolute inset-0 opacity-45 [background:radial-gradient(400px_180px_at_40%_0%,rgba(168,85,247,0.06),transparent_62%)]" />
      <div className="relative flex flex-1 flex-col p-3.5 sm:p-4 md:p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[8px] font-black uppercase tracking-[0.2em] text-white/40">
            {variant === "focus" ? "Recommended now" : variant === "support" ? "Supporting" : "Up next"}
          </span>
          {focus ? (
            <span className="rounded border border-[rgba(255,215,0,0.4)] bg-[rgba(255,215,0,0.07)] px-1.5 py-0.5 font-mono text-[7px] font-black uppercase tracking-[0.16em] text-[color:var(--gold)]/90">
              Flow
            </span>
          ) : null}
        </div>
        <h3 className="mt-2.5 text-[13px] font-bold leading-snug text-white/90 sm:text-[14px] md:text-[15px]">{course.title}</h3>
        <p className="mt-1.5 text-[12px] leading-relaxed text-white/55 md:text-[13px]">{course.outcome}</p>
        <p className="mt-2 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-200/75">{course.earningHint}</p>
        <div className="mt-auto pt-4">
          <motion.button
            type="button"
            onClick={onContinue}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "w-full cut-frame-sm border px-3 py-2.5 font-mono text-[10px] font-black uppercase tracking-[0.16em] transition",
              focus
                ? "border-[rgba(255,215,0,0.5)] bg-[rgba(255,215,0,0.1)] text-[color:var(--gold)]/95 hover:bg-[rgba(255,215,0,0.14)]"
                : "border-[rgba(197,179,88,0.25)] bg-black/40 text-white/75 hover:border-[rgba(197,179,88,0.4)] hover:text-white/88"
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
  courses,
  onNavigate
}: {
  courses: [CourseRec, CourseRec, CourseRec];
  onNavigate: (nav: DashboardNavKey) => void;
}) {
  const go = () => onNavigate("programs");
  const [a, b, c] = courses;

  return (
    <div className="relative mt-10 border-t border-[rgba(197,179,88,0.15)] pt-6">
      <div className="font-mono text-[10px] font-extrabold uppercase tracking-[0.22em] text-white/50">Next opportunities</div>
      <p className="mt-1 text-[12px] text-white/45 md:text-[13px]">
        Natural progression — earn more and sharpen skills without noise.
      </p>

      <div className="mt-5 flex w-full flex-col gap-3 lg:flex-row lg:items-stretch lg:gap-2">
        <div className="min-w-0 flex-1">
          <CourseFlowCard course={a} variant="support" onContinue={go} />
        </div>
        <div className="flex justify-center lg:hidden">
          <ArrowConnectorVertical />
        </div>
        <div className="hidden min-w-[2rem] max-w-[3.5rem] flex-1 items-center justify-center lg:flex">
          <ArrowConnectorHorizontal />
        </div>
        <div className="min-w-0 flex-[1.15] lg:flex-[1.2]">
          <CourseFlowCard course={b} variant="focus" onContinue={go} />
        </div>
        <div className="flex justify-center lg:hidden">
          <ArrowConnectorVertical />
        </div>
        <div className="hidden min-w-[2rem] max-w-[3.5rem] flex-1 items-center justify-center lg:flex">
          <ArrowConnectorHorizontal />
        </div>
        <div className="min-w-0 flex-1">
          <CourseFlowCard course={c} variant="future" onContinue={go} />
        </div>
      </div>
    </div>
  );
}
