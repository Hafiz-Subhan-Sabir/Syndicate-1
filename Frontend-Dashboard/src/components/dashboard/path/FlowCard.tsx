"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "../dashboardPrimitives";

export type FlowCardVariant = "completed" | "current" | "next" | "locked";

export function FlowCard({
  variant,
  title,
  outcome,
  why,
  earningLine,
  icon,
  className
}: {
  variant: FlowCardVariant;
  title: string;
  outcome: string;
  why: string;
  earningLine?: string;
  icon?: string;
  className?: string;
}) {
  const isCurrent = variant === "current";
  const isCompleted = variant === "completed";
  const isNext = variant === "next";
  const isLocked = variant === "locked";

  return (
    <motion.div
      layout
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
      whileHover={!isLocked && !isCompleted ? { scale: 1.035 } : { scale: 1.02 }}
      className={cn(
        "relative flex min-h-[11rem] min-w-0 flex-1 flex-col overflow-hidden border bg-[#070707]/92 text-left",
        "cut-frame-sm cyber-frame transition-[transform,opacity,box-shadow] duration-300",
        isCurrent &&
          "z-[2] scale-[1.02] border-[rgba(255,215,0,0.55)] shadow-[0_0_0_1px_rgba(255,215,0,0.2),0_0_40px_rgba(197,179,88,0.18),inset_0_1px_0_rgba(255,215,0,0.08)] sm:min-h-[12rem] sm:scale-105",
        isCompleted && "opacity-75 border-[rgba(197,179,88,0.28)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
        isNext && "border-[rgba(197,179,88,0.22)] opacity-90 blur-[0.3px] sm:blur-none",
        isLocked && "pointer-events-none border-[rgba(255,255,255,0.08)] opacity-50 blur-[1px]",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 opacity-50 [background:radial-gradient(420px_200px_at_50%_0%,rgba(197,179,88,0.08),transparent_65%)]" />
      <div className="relative flex flex-1 flex-col p-3.5 sm:p-4 md:p-5">
        <div className="flex items-start justify-between gap-2">
          <span className="font-mono text-[20px] leading-none text-[color:var(--gold)]/70">{icon ?? "◆"}</span>
          {isCompleted ? (
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-emerald-400/40 bg-emerald-950/40 text-emerald-200">
              <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />
            </span>
          ) : isCurrent ? (
            <span className="rounded-md border border-[rgba(255,215,0,0.45)] bg-[rgba(255,215,0,0.08)] px-2 py-0.5 font-mono text-[8px] font-black uppercase tracking-[0.18em] text-[color:var(--gold)]/95">
              Focus
            </span>
          ) : isNext ? (
            <span className="font-mono text-[8px] font-black uppercase tracking-[0.2em] text-white/40">Next</span>
          ) : (
            <span className="font-mono text-[8px] font-black uppercase tracking-[0.2em] text-white/35">Locked</span>
          )}
        </div>
        <div className="mt-3 text-[14px] font-bold leading-snug text-white/92 sm:text-[15px] md:text-[16px]">{title}</div>
        <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--gold)]/75">{outcome}</p>
        <p className="mt-2 flex-1 text-[12px] leading-relaxed text-white/52 md:text-[13px]">{why}</p>
        {earningLine ? (
          <div className="mt-3 border-t border-[rgba(197,179,88,0.12)] pt-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-200/80">
            Earn → {earningLine}
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}
