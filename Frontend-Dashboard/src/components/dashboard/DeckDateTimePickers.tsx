"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { cn } from "./dashboardPrimitives";
import { MONTH_NAMES, WEEK, buildMonthGrid, parseYyyyMmDd, toYyyyMmDd } from "./deck-date-utils";

type Tone = "cyan" | "fuchsia" | "gold";

const TONE: Record<
  Tone,
  { ring: string; sel: string; selRing: string; muted: string; btn: string; icon: string; border: string }
> = {
  cyan: {
    ring: "ring-cyan-400/30",
    sel: "bg-cyan-500/85 text-white shadow-[0_0_0_2px_rgba(0,0,0,0.9),0_0_18px_rgba(34,211,238,0.45)]",
    selRing: "ring-2 ring-black",
    muted: "text-white/28",
    btn: "text-cyan-200/90 hover:bg-white/8",
    icon: "text-cyan-200/80",
    border: "border-cyan-400/35"
  },
  fuchsia: {
    ring: "ring-fuchsia-400/30",
    sel: "bg-fuchsia-500/80 text-white shadow-[0_0_0_2px_rgba(0,0,0,0.9),0_0_18px_rgba(192,132,252,0.45)]",
    selRing: "ring-2 ring-black",
    muted: "text-white/28",
    btn: "text-fuchsia-200/90 hover:bg-white/8",
    icon: "text-fuchsia-200/80",
    border: "border-fuchsia-400/35"
  },
  gold: {
    ring: "ring-[rgba(250,204,21,0.35)]",
    sel: "bg-[rgba(250,204,21,0.88)] text-black shadow-[0_0_0_2px_rgba(0,0,0,0.85),0_0_20px_rgba(250,204,21,0.4)]",
    selRing: "ring-2 ring-black",
    muted: "text-white/28",
    btn: "text-[color:var(--gold)]/90 hover:bg-white/8",
    icon: "text-[color:var(--gold)]/80",
    border: "border-[rgba(250,204,21,0.4)]"
  }
};

function deckTriggerFocusRing(tone: Tone): string {
  if (tone === "cyan") return "focus-visible:ring-cyan-400/55";
  if (tone === "fuchsia") return "focus-visible:ring-fuchsia-400/55";
  return "focus-visible:ring-[rgba(250,204,21,0.55)]";
}

export function DeckCalendarPanel({
  value,
  onSelect,
  onClear,
  tone,
  showFooter = true
}: {
  value: string;
  onSelect: (yyyyMmDd: string) => void;
  onClear?: () => void;
  tone: Tone;
  showFooter?: boolean;
}) {
  const t = TONE[tone];

  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [monthOpen, setMonthOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);

  useEffect(() => {
    const p = value ? parseYyyyMmDd(value) : null;
    if (p) {
      setViewYear(p.getFullYear());
      setViewMonth(p.getMonth());
    }
  }, [value]);

  const cells = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const today = useMemo(() => toYyyyMmDd(new Date()), []);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else setViewMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else setViewMonth((m) => m + 1);
  };

  const years = useMemo(() => {
    const y = new Date().getFullYear();
    return Array.from({ length: 21 }, (_, i) => y - 10 + i);
  }, []);

  return (
    <div
      className={cn(
        "w-[min(100vw-1.5rem,300px)] rounded-xl border bg-[#0c0c0c] p-3 shadow-[0_24px_80px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.04)] sm:w-[300px]",
        t.border
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
        <div className="relative flex min-w-0 flex-1 items-center gap-1">
          <button
            type="button"
            className={cn("flex min-w-0 items-center gap-0.5 rounded-md px-1.5 py-1 text-left text-[13px] font-semibold text-white/92", t.btn)}
            onClick={() => {
              setMonthOpen((v) => !v);
              setYearOpen(false);
            }}
            aria-expanded={monthOpen}
          >
            <span className="truncate">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
          </button>
          {monthOpen ? (
            <div className="absolute left-0 top-full z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-white/12 bg-[#141414] py-1 shadow-xl">
              {MONTH_NAMES.map((name, mi) => (
                <button
                  key={name}
                  type="button"
                  className={cn(
                    "w-full px-3 py-1.5 text-left text-[12px] text-white/85 hover:bg-white/10",
                    mi === viewMonth && "bg-white/12 text-white"
                  )}
                  onClick={() => {
                    setViewMonth(mi);
                    setMonthOpen(false);
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            className={cn("rounded-md p-1.5", t.btn)}
            aria-label="Previous month"
            onClick={prevMonth}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={cn("rounded-md p-1.5", t.btn)}
            aria-label="Next month"
            onClick={nextMonth}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {yearOpen ? (
        <div className="mt-2 max-h-32 overflow-y-auto rounded-lg border border-white/10 bg-black/50 p-2">
          <div className="grid grid-cols-4 gap-1">
            {years.map((y) => (
              <button
                key={y}
                type="button"
                className={cn(
                  "rounded px-2 py-1 text-[11px] text-white/75 hover:bg-white/10",
                  y === viewYear && "bg-white/15 text-white"
                )}
                onClick={() => {
                  setViewYear(y);
                  setYearOpen(false);
                }}
              >
                {y}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <button
        type="button"
        className={cn("mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45 hover:text-white/70")}
        onClick={() => setYearOpen((v) => !v)}
      >
        {yearOpen ? "Hide years" : "Jump to year"}
      </button>

      <div className="mt-2 grid grid-cols-7 gap-y-1 text-center">
        {WEEK.map((w) => (
          <div key={w} className="py-1 text-[10px] font-bold uppercase tracking-wide text-white/40">
            {w}
          </div>
        ))}
        {cells.map((c, i) => {
          const v = toYyyyMmDd(new Date(c.y, c.m, c.d));
          const selected = value === v;
          const isToday = v === today;
          return (
            <button
              key={`${i}-${v}`}
              type="button"
              onClick={() => onSelect(v)}
              className={cn(
                "mx-auto flex h-8 w-8 items-center justify-center rounded-md text-[12px] font-medium transition-colors",
                !c.inCurrentMonth && t.muted,
                c.inCurrentMonth && "text-white/88",
                selected && cn(t.sel, t.selRing),
                !selected && c.inCurrentMonth && "hover:bg-white/10",
                !selected && !c.inCurrentMonth && "hover:bg-white/5",
                isToday && !selected && "ring-1 ring-white/25"
              )}
            >
              {c.d}
            </button>
          );
        })}
      </div>

      {showFooter ? (
        <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2">
          {onClear ? (
            <button type="button" className={cn("text-[12px] font-semibold", t.btn)} onClick={onClear}>
              Clear
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            className={cn("text-[12px] font-semibold", t.btn)}
            onClick={() => onSelect(today)}
          >
            Today
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function DeckDateField({
  id,
  label,
  labelClassName,
  value,
  onValueChange,
  disabled,
  tone
}: {
  id: string;
  label: string;
  labelClassName: string;
  value: string;
  onValueChange: (v: string) => void;
  disabled?: boolean;
  tone: Tone;
}) {
  const t = TONE[tone];
  const triggerRing = deckTriggerFocusRing(tone);
  const wrap =
    tone === "cyan"
      ? "border-cyan-400/38 bg-[#050a0c] shadow-[inset_0_2px_8px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(34,211,238,0.07)] focus-within:border-cyan-300/80 focus-within:shadow-[inset_0_2px_8px_rgba(0,0,0,0.45),0_0_0_1px_rgba(34,211,238,0.3),0_0_22px_rgba(34,211,238,0.22)]"
      : tone === "fuchsia"
        ? "border-fuchsia-400/40 bg-[#0a060c] shadow-[inset_0_2px_8px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(192,132,252,0.08)] focus-within:border-fuchsia-300/78 focus-within:shadow-[inset_0_2px_8px_rgba(0,0,0,0.45),0_0_0_1px_rgba(192,132,252,0.28),0_0_22px_rgba(168,85,247,0.22)]"
        : "border-[rgba(255,215,0,0.42)] bg-[#0a0906] shadow-[inset_0_2px_8px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,215,0,0.07)] focus-within:border-[rgba(255,230,120,0.78)] focus-within:shadow-[inset_0_2px_8px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,215,0,0.25),0_0_24px_rgba(255,200,0,0.2)]";

  const textTone =
    tone === "cyan" ? "text-cyan-50/95" : tone === "fuchsia" ? "text-fuchsia-50/95" : "text-[rgba(255,248,220,0.92)]";

  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const fn = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open]);

  const display = useMemo(() => {
    if (!value) return "";
    const p = parseYyyyMmDd(value);
    if (!p) return value;
    return p.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }, [value]);

  return (
    <div ref={rootRef} className="relative">
      <label htmlFor={id} className={labelClassName}>
        {label}
      </label>
      <div
        className={cn(
          "mt-1.5 flex min-h-[44px] w-full min-w-0 items-stretch overflow-visible rounded-lg border",
          wrap
        )}
      >
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen((o) => !o)}
          className={cn(
            "grid min-h-[44px] min-w-[44px] shrink-0 place-items-center border-r border-white/12 bg-black/35",
            disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer hover:bg-white/8",
            "focus-visible:z-[1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-offset-0",
            triggerRing
          )}
          aria-label="Open calendar"
        >
          <Calendar className={cn("h-[18px] w-[18px]", t.icon)} strokeWidth={2} aria-hidden />
        </button>
        <button
          type="button"
          id={id}
          disabled={disabled}
          onClick={() => !disabled && setOpen((o) => !o)}
          className={cn(
            "min-h-[44px] min-w-0 flex-1 px-3 py-2.5 text-left text-[15px] font-medium leading-snug outline-none md:text-[15px]",
            textTone,
            disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-offset-0",
            triggerRing
          )}
        >
          {display || <span className="text-white/38">Select date…</span>}
        </button>
      </div>
      {open && !disabled ? (
        <div className="absolute left-0 top-full z-[80] mt-1.5">
          <DeckCalendarPanel
            value={value}
            tone={tone}
            onSelect={(v) => {
              onValueChange(v);
              setOpen(false);
            }}
            onClear={() => {
              onValueChange("");
              setOpen(false);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function parseTime(v: string): { h: number; m: number } {
  if (!v || v.length < 4) return { h: 9, m: 0 };
  const parts = v.split(":");
  const h = Math.min(23, Math.max(0, Number(parts[0]) || 0));
  const m = Math.min(59, Math.max(0, Number(parts[1]) || 0));
  return { h, m };
}

function fmtTime(h: number, m: number) {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function DeckTimeField({
  id,
  label,
  labelClassName,
  value,
  onValueChange,
  disabled,
  tone
}: {
  id: string;
  label: string;
  labelClassName: string;
  value: string;
  onValueChange: (v: string) => void;
  disabled?: boolean;
  tone: Tone;
}) {
  const t = TONE[tone];
  const triggerRing = deckTriggerFocusRing(tone);
  const wrap =
    tone === "cyan"
      ? "border-cyan-400/38 bg-[#050a0c] shadow-[inset_0_2px_8px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(34,211,238,0.07)] focus-within:border-cyan-300/80 focus-within:shadow-[inset_0_2px_8px_rgba(0,0,0,0.45),0_0_0_1px_rgba(34,211,238,0.3),0_0_22px_rgba(34,211,238,0.22)]"
      : tone === "fuchsia"
        ? "border-fuchsia-400/40 bg-[#0a060c] shadow-[inset_0_2px_8px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(192,132,252,0.08)] focus-within:border-fuchsia-300/78 focus-within:shadow-[inset_0_2px_8px_rgba(0,0,0,0.45),0_0_0_1px_rgba(192,132,252,0.28),0_0_22px_rgba(168,85,247,0.22)]"
        : "border-[rgba(255,215,0,0.42)] bg-[#0a0906] shadow-[inset_0_2px_8px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,215,0,0.07)] focus-within:border-[rgba(255,230,120,0.78)] focus-within:shadow-[inset_0_2px_8px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,215,0,0.25),0_0_24px_rgba(255,200,0,0.2)]";

  const textTone =
    tone === "cyan" ? "text-cyan-50/95" : tone === "fuchsia" ? "text-fuchsia-50/95" : "text-[rgba(255,248,220,0.92)]";

  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { h, m } = parseTime(value);

  useEffect(() => {
    if (!open) return;
    const fn = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open]);

  const apply = useCallback(
    (nh: number, nm: number) => {
      onValueChange(fmtTime(nh, nm));
    },
    [onValueChange]
  );

  return (
    <div ref={rootRef} className="relative">
      <label htmlFor={id} className={labelClassName}>
        {label}
      </label>
      <div
        className={cn(
          "mt-1.5 flex min-h-[44px] w-full min-w-0 items-stretch overflow-visible rounded-lg border",
          wrap
        )}
      >
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen((o) => !o)}
          className={cn(
            "grid min-h-[44px] min-w-[44px] shrink-0 place-items-center border-r border-white/12 bg-black/35",
            disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer hover:bg-white/8",
            "focus-visible:z-[1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-offset-0",
            triggerRing
          )}
          aria-label="Open time picker"
        >
          <Clock className={cn("h-[18px] w-[18px]", t.icon)} strokeWidth={2} aria-hidden />
        </button>
        <button
          type="button"
          id={id}
          disabled={disabled}
          onClick={() => !disabled && setOpen((o) => !o)}
          className={cn(
            "min-h-[44px] min-w-0 flex-1 px-3 py-2.5 text-left text-[15px] font-medium leading-snug outline-none md:text-[15px]",
            textTone,
            disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-offset-0",
            triggerRing
          )}
        >
          {value ? value : <span className="text-white/38">Select time…</span>}
        </button>
      </div>
      {open && !disabled ? (
        <div
          className={cn(
            "absolute left-0 top-full z-[80] mt-1.5 w-[min(100vw-1.5rem,280px)] rounded-xl border bg-[#0c0c0c] p-3 shadow-[0_24px_80px_rgba(0,0,0,0.65)] sm:w-[280px]",
            t.border
          )}
        >
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-400/90">Hour & minute</div>
          <div className="mt-2 flex gap-2">
            <select
              className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/55 px-2 py-2 text-[13px] text-white/90 outline-none"
              value={h}
              onChange={(e) => apply(Number(e.target.value), m)}
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {String(i).padStart(2, "0")}
                </option>
              ))}
            </select>
            <select
              className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/55 px-2 py-2 text-[13px] text-white/90 outline-none"
              value={m}
              onChange={(e) => apply(h, Number(e.target.value))}
            >
              {Array.from({ length: 60 }, (_, i) => (
                <option key={i} value={i}>
                  {String(i).padStart(2, "0")}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-3 flex justify-between border-t border-white/10 pt-2">
            <button type="button" className={cn("text-[12px] font-semibold", t.btn)} onClick={() => onValueChange("")}>
              Clear
            </button>
            <button
              type="button"
              className={cn("text-[12px] font-semibold", t.btn)}
              onClick={() => {
                const n = new Date();
                apply(n.getHours(), n.getMinutes());
                setOpen(false);
              }}
            >
              Now
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function DeckBrowseDateBar({
  browseDate,
  onBrowseDateChange,
  tone = "gold"
}: {
  browseDate: string | null;
  onBrowseDateChange: (v: string | null) => void;
  tone?: Tone;
}) {
  const t = TONE[tone];
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const fn = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open]);

  const label = useMemo(() => {
    if (!browseDate) return "All days";
    const p = parseYyyyMmDd(browseDate);
    if (!p) return browseDate;
    return p.toLocaleDateString(undefined, { weekday: "short", month: "long", day: "numeric", year: "numeric" });
  }, [browseDate]);

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative flex flex-col gap-2 rounded-xl border bg-black/48 px-3 py-3 shadow-[0_10px_36px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.05)] sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4 sm:py-3.5",
        t.border
      )}
    >
      <div className="min-w-0">
        <div className="font-mono text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--gold)]/88">
          Browse by day
        </div>
        <p className="mt-1 text-[12px] font-normal leading-relaxed text-neutral-300/88 sm:text-[13px] sm:leading-snug">
          Pick any past or future date to filter missions, reminders, and notes that belong to that calendar day.
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-white/18 bg-black/55 px-3.5 py-2 text-[13px] font-semibold text-neutral-100/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:bg-black/68 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(250,204,21,0.45)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]",
            t.ring
          )}
          aria-expanded={open}
        >
          <Calendar className={cn("h-4 w-4 shrink-0", t.icon)} aria-hidden />
          {label}
          <ChevronDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
        </button>
        {browseDate ? (
          <button
            type="button"
            onClick={() => onBrowseDateChange(null)}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-white/16 bg-black/45 px-3.5 text-[11px] font-black uppercase tracking-[0.14em] text-neutral-200/90 hover:border-white/28 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(250,204,21,0.45)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]"
          >
            Show all
          </button>
        ) : null}
      </div>
      {open ? (
        <div className="absolute right-0 top-full z-[85] mt-2 sm:left-auto sm:right-0">
          <DeckCalendarPanel
            tone={tone}
            value={browseDate ?? ""}
            showFooter
            onSelect={(v) => {
              onBrowseDateChange(v);
              setOpen(false);
            }}
            onClear={() => {
              onBrowseDateChange(null);
              setOpen(false);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
