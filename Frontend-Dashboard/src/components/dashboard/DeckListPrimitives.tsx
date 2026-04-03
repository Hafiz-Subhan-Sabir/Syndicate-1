"use client";

import type { ReactNode } from "react";
import { cn } from "./dashboardPrimitives";

export type DeckSortDir = "asc" | "desc";

export function DeckListToolbar({
  search,
  onSearchChange,
  sortLabel,
  sortDir,
  onSortDirToggle,
  placeholder = "Filter…"
}: {
  search: string;
  onSearchChange: (v: string) => void;
  sortLabel: string;
  sortDir: DeckSortDir;
  onSortDirToggle: () => void;
  placeholder?: string;
}) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-2">
      <input
        type="search"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={placeholder}
        className="min-w-[160px] flex-1 rounded-md border border-[rgba(197,179,88,0.22)] bg-[#060606]/75 px-2.5 py-1.5 font-mono text-[12px] text-white/88 outline-none placeholder:text-white/35 focus:border-[rgba(197,179,88,0.55)] focus:shadow-[0_0_0_1px_rgba(197,179,88,0.15)]"
      />
      <button
        type="button"
        onClick={onSortDirToggle}
        className="shrink-0 rounded-md border border-[rgba(197,179,88,0.22)] bg-[#060606]/70 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white/60 hover:border-[rgba(197,179,88,0.5)] hover:text-[color:var(--gold)]/95"
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
          "border border-[#39ff14]/55 bg-[#0a140a]/90 text-[#b8ff9e] shadow-[0_0_12px_rgba(57,255,20,0.25)]"
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
          "border border-[#ff2e2e]/55 bg-[#140808]/90 text-[#ffb0b0] shadow-[0_0_12px_rgba(255,46,46,0.28)]"
        )}
      >
        Missed
      </span>
    );
  return <span className={cn(BADGE_BASE, "border border-white/20 text-white/55")}>Done</span>;
}

export function ReminderStatusBadge({ status }: { status: "active" | "completed" }) {
  if (status === "active")
    return (
      <span className={cn(BADGE_BASE, "border border-[rgba(255,215,0,0.4)] text-[color:var(--gold)]/90")}>Scheduled</span>
    );
  return <span className={cn(BADGE_BASE, "border border-white/15 text-white/45")}>Done</span>;
}

export function PriorityPoints({ points, tone = "ice" }: { points: number; tone?: "ice" | "gold" | "violet" }) {
  const cls =
    tone === "gold"
      ? "text-[color:var(--gold)]/90"
      : tone === "violet"
        ? "text-[#ead6ff]"
        : "text-[#bfefff]";
  return (
    <span className={cn("font-mono text-[10px] font-black tabular-nums", cls)}>
      {points} <span className="text-[8px] font-bold uppercase tracking-[0.1em] text-white/35">pts</span>
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
        "text-[10px] text-white/50",
        urgent && "font-semibold text-amber-200/90"
      )}
    >
      <span className="text-white/35">{label}</span> {value}
    </div>
  );
}

type DeckListItemProps = {
  title: string;
  subtitle?: ReactNode;
  badge?: ReactNode;
  footer?: ReactNode;
  dimmed?: boolean;
};

export function DeckListItem({ title, subtitle, badge, footer, dimmed }: DeckListItemProps) {
  return (
    <div
      className={cn(
        "rounded-md border border-[rgba(197,179,88,0.16)] bg-[#060606]/55 px-2.5 py-2 md:px-3 md:py-2.5",
        dimmed && "border-[rgba(197,179,88,0.1)] bg-black/40 opacity-85"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-1">
        <div className="min-w-0 flex-1 text-[13px] font-bold leading-snug text-[#f2ebe3]/95">{title}</div>
        {badge ? <div className="shrink-0">{badge}</div> : null}
      </div>
      {subtitle ? <div className="mt-0.5">{subtitle}</div> : null}
      {footer ? <div className="mt-1">{footer}</div> : null}
    </div>
  );
}

export function filterBySearch<T>(rows: T[], getText: (row: T) => string, q: string): T[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter((r) => getText(r).toLowerCase().includes(needle));
}
