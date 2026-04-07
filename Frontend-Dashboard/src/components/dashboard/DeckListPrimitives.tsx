"use client";

import type { ReactNode } from "react";
import { cn } from "./dashboardPrimitives";

export type DeckSortDir = "asc" | "desc";

/** Toolbar + list chrome aligned with Quick Access deck accents (high-contrast glow). */
export type DeckToolbarTone = "cyan" | "fuchsia" | "gold" | "rose" | "emerald";

/** Inset fields + WCAG-friendly body text; placeholders stay clearly secondary. */
const TOOLBAR_INPUT: Record<
  DeckToolbarTone,
  string
> = {
  cyan:
    "border-cyan-400/40 bg-[#05080a] text-[15px] font-medium leading-snug text-cyan-50 placeholder:text-cyan-200/25 shadow-[inset_0_2px_6px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(34,211,238,0.06)] focus:border-cyan-300/85 focus:shadow-[inset_0_2px_8px_rgba(0,0,0,0.55),0_0_0_1px_rgba(34,211,238,0.45),0_0_20px_rgba(34,211,238,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]",
  fuchsia:
    "border-fuchsia-400/42 bg-[#0a060c] text-[15px] font-medium leading-snug text-fuchsia-50 placeholder:text-fuchsia-200/25 shadow-[inset_0_2px_6px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(192,132,252,0.07)] focus:border-fuchsia-300/85 focus:shadow-[inset_0_2px_8px_rgba(0,0,0,0.55),0_0_0_1px_rgba(217,70,239,0.45),0_0_20px_rgba(192,132,252,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]",
  gold:
    "border-[rgba(255,215,0,0.48)] bg-[#0a0906] text-[15px] font-medium leading-snug text-[rgba(255,248,220,0.95)] placeholder:text-[rgba(255,230,150,0.22)] shadow-[inset_0_2px_6px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,215,0,0.06)] focus:border-[rgba(255,230,120,0.85)] focus:shadow-[inset_0_2px_8px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,215,0,0.4),0_0_22px_rgba(255,200,0,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(250,204,21,0.55)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]",
  rose:
    "border-rose-400/45 bg-[#0c0608] text-[15px] font-medium leading-snug text-rose-50 placeholder:text-rose-200/25 shadow-[inset_0_2px_6px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(251,113,133,0.07)] focus:border-rose-300/85 focus:shadow-[inset_0_2px_8px_rgba(0,0,0,0.55),0_0_0_1px_rgba(251,113,133,0.45),0_0_20px_rgba(251,113,133,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]",
  emerald:
    "border-emerald-400/45 bg-[#050a08] text-[15px] font-medium leading-snug text-emerald-50 placeholder:text-emerald-200/25 shadow-[inset_0_2px_6px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(52,211,153,0.07)] focus:border-emerald-300/85 focus:shadow-[inset_0_2px_8px_rgba(0,0,0,0.55),0_0_0_1px_rgba(52,211,153,0.45),0_0_20px_rgba(16,185,129,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]"
};

const TOOLBAR_BTN: Record<DeckToolbarTone, string> = {
  cyan:
    "border-cyan-400/40 bg-[#070d10] text-[11px] font-black uppercase tracking-[0.14em] text-cyan-100/92 shadow-[0_2px_0_rgba(0,0,0,0.35),inset_0_1px_0_rgba(34,211,238,0.12)] hover:border-cyan-300/75 hover:text-cyan-50 hover:shadow-[0_0_18px_rgba(34,211,238,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]",
  fuchsia:
    "border-fuchsia-400/42 bg-[#0c0810] text-[11px] font-black uppercase tracking-[0.14em] text-fuchsia-100/92 shadow-[0_2px_0_rgba(0,0,0,0.35),inset_0_1px_0_rgba(192,132,252,0.12)] hover:border-fuchsia-300/75 hover:text-fuchsia-50 hover:shadow-[0_0_18px_rgba(217,70,239,0.32)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]",
  gold:
    "border-[rgba(255,215,0,0.42)] bg-[#0a0906] text-[11px] font-black uppercase tracking-[0.14em] text-[color:var(--gold)]/90 shadow-[0_2px_0_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,215,0,0.1)] hover:border-[rgba(255,230,140,0.72)] hover:text-[color:var(--gold)] hover:shadow-[0_0_20px_rgba(255,200,0,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(250,204,21,0.55)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]",
  rose:
    "border-rose-400/42 bg-[#0c0608] text-[11px] font-black uppercase tracking-[0.14em] text-rose-100/92 shadow-[0_2px_0_rgba(0,0,0,0.35),inset_0_1px_0_rgba(251,113,133,0.1)] hover:border-rose-300/75 hover:text-rose-50 hover:shadow-[0_0_18px_rgba(251,113,133,0.32)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]",
  emerald:
    "border-emerald-400/42 bg-[#050a08] text-[11px] font-black uppercase tracking-[0.14em] text-emerald-100/92 shadow-[0_2px_0_rgba(0,0,0,0.35),inset_0_1px_0_rgba(52,211,153,0.1)] hover:border-emerald-300/75 hover:text-emerald-50 hover:shadow-[0_0_18px_rgba(52,211,153,0.32)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]"
};

export function DeckListToolbar({
  search,
  onSearchChange,
  sortLabel,
  sortDir,
  onSortDirToggle,
  placeholder = "Filter…",
  tone = "gold"
}: {
  search: string;
  onSearchChange: (v: string) => void;
  sortLabel: string;
  sortDir: DeckSortDir;
  onSortDirToggle: () => void;
  placeholder?: string;
  tone?: DeckToolbarTone;
}) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-2">
      <input
        type="search"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "min-h-[44px] min-w-[min(100%,160px)] flex-1 rounded-lg px-3 outline-none motion-safe:transition-[box-shadow,border-color] motion-safe:duration-200",
          TOOLBAR_INPUT[tone]
        )}
      />
      <button
        type="button"
        onClick={onSortDirToggle}
        className={cn(
          "inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg px-3 motion-safe:transition-[box-shadow,border-color,color,transform] motion-safe:duration-200",
          TOOLBAR_BTN[tone]
        )}
        title="Toggle sort direction"
      >
        {sortLabel} {sortDir === "desc" ? "↓" : "↑"}
      </button>
    </div>
  );
}

const BADGE_BASE = "inline-flex items-center rounded px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.14em]";

export function MissionStatusBadge({ status }: { status: "active" | "missed" | "done" }) {
  if (status === "active")
    return (
      <span
        className={cn(
          BADGE_BASE,
          "border border-emerald-300/65 bg-emerald-950/80 text-emerald-100 shadow-[0_0_0_1px_rgba(52,211,153,0.35),0_0_16px_rgba(16,185,129,0.45),0_0_28px_rgba(52,211,153,0.2)]"
        )}
      >
        Active
      </span>
    );
  if (status === "missed")
    return (
      <span
        className={cn(
          BADGE_BASE,
          "border border-rose-400/60 bg-rose-950/75 text-rose-100 shadow-[0_0_0_1px_rgba(251,113,133,0.4),0_0_18px_rgba(251,113,133,0.42),0_0_32px_rgba(244,63,94,0.2)]"
        )}
      >
        Missed
      </span>
    );
  return (
    <span
      className={cn(
        BADGE_BASE,
        "border border-cyan-400/45 bg-cyan-950/70 text-cyan-100 shadow-[0_0_14px_rgba(34,211,238,0.28)]"
      )}
    >
      Complete
    </span>
  );
}

export function ReminderStatusBadge({ status }: { status: "active" | "completed" }) {
  if (status === "active")
    return (
      <span
        className={cn(
          BADGE_BASE,
          "border border-cyan-400/55 bg-cyan-950/75 text-cyan-100 shadow-[0_0_0_1px_rgba(34,211,238,0.35),0_0_16px_rgba(34,211,238,0.4),0_0_28px_rgba(6,182,212,0.15)]"
        )}
      >
        Incomplete
      </span>
    );
  return (
    <span
      className={cn(
        BADGE_BASE,
        "border border-fuchsia-400/50 bg-fuchsia-950/70 text-fuchsia-100 shadow-[0_0_0_1px_rgba(192,132,252,0.35),0_0_16px_rgba(168,85,247,0.38)]"
      )}
    >
      Complete
    </span>
  );
}

export function PriorityPoints({ points, tone = "ice" }: { points: number; tone?: "ice" | "gold" | "violet" }) {
  const cls =
    tone === "gold"
      ? "text-[color:var(--gold)]/90"
      : tone === "violet"
        ? "text-[#ead6ff]"
        : "text-[#bfefff]";
  return (
    <span className={cn("font-mono text-[11px] font-black tabular-nums", cls)}>
      {points}{" "}
      <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/55">pts</span>
    </span>
  );
}

export function DueDateLine({
  label,
  value,
  urgent
}: {
  label: string;
  value: string;
  urgent?: boolean;
}) {
  return (
    <div
      className={cn(
        "text-[11px] font-medium leading-snug text-neutral-200/92",
        urgent && "font-semibold text-amber-100 shadow-[0_0_12px_rgba(251,191,36,0.35)]"
      )}
    >
      <span className="font-semibold text-white/55">{label}</span>{" "}
      <span className="text-neutral-100/95">{value}</span>
    </div>
  );
}

export type DeckListItemTone = DeckToolbarTone;

const ITEM_SURFACE: Record<DeckListItemTone, string> = {
  cyan:
    "border-cyan-500/34 bg-black/55 shadow-[0_6px_20px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(34,211,238,0.1)] motion-safe:transition-[box-shadow,border-color,transform] motion-safe:duration-200 motion-reduce:transition-none hover:border-cyan-400/58 motion-safe:hover:-translate-y-px hover:shadow-[0_0_0_1px_rgba(34,211,238,0.28),0_8px_28px_rgba(0,0,0,0.4),0_0_24px_rgba(34,211,238,0.2)] focus-within:border-cyan-400/65 focus-within:shadow-[0_0_0_1px_rgba(34,211,238,0.35),0_0_28px_rgba(34,211,238,0.22)]",
  fuchsia:
    "border-fuchsia-500/34 bg-black/55 shadow-[0_6px_20px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(192,132,252,0.1)] motion-safe:transition-[box-shadow,border-color,transform] motion-safe:duration-200 motion-reduce:transition-none hover:border-fuchsia-400/58 motion-safe:hover:-translate-y-px hover:shadow-[0_0_0_1px_rgba(192,132,252,0.3),0_8px_28px_rgba(0,0,0,0.4),0_0_24px_rgba(168,85,247,0.22)] focus-within:border-fuchsia-400/65 focus-within:shadow-[0_0_0_1px_rgba(192,132,252,0.38),0_0_28px_rgba(168,85,247,0.24)]",
  gold:
    "border-[rgba(255,215,0,0.32)] bg-black/55 shadow-[0_6px_20px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,215,0,0.08)] motion-safe:transition-[box-shadow,border-color,transform] motion-safe:duration-200 motion-reduce:transition-none hover:border-[rgba(255,230,140,0.52)] motion-safe:hover:-translate-y-px hover:shadow-[0_0_0_1px_rgba(255,215,0,0.24),0_8px_28px_rgba(0,0,0,0.4),0_0_22px_rgba(255,200,0,0.16)] focus-within:border-[rgba(255,230,140,0.58)] focus-within:shadow-[0_0_0_1px_rgba(255,215,0,0.28),0_0_26px_rgba(255,200,0,0.18)]",
  rose:
    "border-rose-500/36 bg-black/55 shadow-[0_6px_20px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(251,113,133,0.1)] motion-safe:transition-[box-shadow,border-color,transform] motion-safe:duration-200 motion-reduce:transition-none hover:border-rose-400/58 motion-safe:hover:-translate-y-px hover:shadow-[0_0_0_1px_rgba(251,113,133,0.3),0_8px_28px_rgba(0,0,0,0.4),0_0_24px_rgba(251,113,133,0.2)] focus-within:border-rose-400/65 focus-within:shadow-[0_0_0_1px_rgba(251,113,133,0.38),0_0_28px_rgba(251,113,133,0.22)]",
  emerald:
    "border-emerald-500/36 bg-black/55 shadow-[0_6px_20px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(52,211,153,0.1)] motion-safe:transition-[box-shadow,border-color,transform] motion-safe:duration-200 motion-reduce:transition-none hover:border-emerald-400/58 motion-safe:hover:-translate-y-px hover:shadow-[0_0_0_1px_rgba(52,211,153,0.3),0_8px_28px_rgba(0,0,0,0.4),0_0_24px_rgba(16,185,129,0.22)] focus-within:border-emerald-400/65 focus-within:shadow-[0_0_0_1px_rgba(52,211,153,0.38),0_0_28px_rgba(16,185,129,0.24)]"
};

type DeckListItemProps = {
  title: string;
  subtitle?: ReactNode;
  badge?: ReactNode;
  footer?: ReactNode;
  dimmed?: boolean;
  tone?: DeckListItemTone;
};

export function DeckListItem({ title, subtitle, badge, footer, dimmed, tone = "gold" }: DeckListItemProps) {
  return (
    <div
      className={cn(
        "rounded-lg px-3 py-2.5 motion-reduce:transform-none md:px-3.5 md:py-3",
        ITEM_SURFACE[tone],
        dimmed && "opacity-88 saturate-[0.94]"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-1">
        <div className="min-w-0 flex-1 text-[14px] font-bold leading-snug tracking-tight text-neutral-50">{title}</div>
        {badge ? <div className="shrink-0">{badge}</div> : null}
      </div>
      {subtitle ? <div className="mt-1">{subtitle}</div> : null}
      {footer ? <div className="mt-2.5">{footer}</div> : null}
    </div>
  );
}

export function filterBySearch<T>(rows: T[], getText: (row: T) => string, q: string): T[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter((r) => getText(r).toLowerCase().includes(needle));
}
