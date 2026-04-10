"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { portalFetch } from "@/lib/portal-api";
import {
  DeckListItem,
  DeckListToolbar,
  DueDateLine,
  type DeckSortDir,
  filterBySearch,
  MissionStatusBadge,
  PriorityPoints,
  ReminderStatusBadge
} from "./DeckListPrimitives";
import { DeckBrowseDateBar, DeckDateField, DeckTimeField } from "./DeckDateTimePickers";
import { missionLocalDay, noteLocalDay, toYyyyMmDd } from "./deck-date-utils";
import {
  clearDeckAlarmCustom,
  getDeckAlarmCustomDataUrl,
  isDeckAlarmMuted,
  playDeckAlarmSound,
  readAudioFileAsDataUrl,
  setDeckAlarmCustomDataUrl,
  setDeckAlarmMuted,
  unlockDeckAlarmAudio
} from "@/lib/deck-alarm-sound";
import toast from "react-hot-toast";
import { Card, cn, type ThemeMode } from "./dashboardPrimitives";

function localDateAndTimeToIso(dateStr: string, timeStr: string): string | null {
  if (!dateStr?.trim() || !timeStr?.trim()) return null;
  const t = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  const d = new Date(`${dateStr}T${t}`);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

function QuickAccessGridFallback() {
  return (
    <div
      className="flex min-h-[min(48vh,560px)] w-full flex-col justify-center gap-4 rounded-xl border border-white/10 bg-black/25 px-4 py-8"
      aria-hidden
    >
      <div className="mx-auto h-1.5 w-48 max-w-[80%] animate-pulse rounded-full bg-[rgba(197,179,88,0.2)]" />
      <div className="mx-auto h-1.5 w-32 max-w-[60%] animate-pulse rounded-full bg-white/10" />
    </div>
  );
}

const QuickAccessGrid = dynamic(
  () =>
    import("@/features/productivity/control-center/QuickAccessGrid").then((mod) => mod.QuickAccessGrid),
  { ssr: false, loading: () => <QuickAccessGridFallback /> }
);

const LS_MISSIONS = "dashboarded:deck-missions";
const LS_REMINDERS = "dashboarded:deck-reminders";
const LS_NOTES = "dashboarded:deck-notes";

type MissionRow = {
  id: string;
  title: string;
  targetIso: string;
  points: number;
  status: "active" | "missed" | "done";
};

type ReminderRow = {
  id: string;
  title: string;
  date: string;
  time: string;
  status: "active" | "completed";
};

type NoteRow = {
  id: string;
  title: string;
  body: string;
  createdAt: number;
};

/** Session-scoped cache so reopening the ops deck paints lists before the portal round-trip (not cookies — larger quota, no extra HTTP). */
const SS_PORTAL_DECK_CACHE = "dashboarded:portal-deck-cache-v1";

type PortalDeckCachePayload = {
  missions: MissionRow[];
  reminders: ReminderRow[];
  notes: NoteRow[];
};

function readPortalDeckCache(): PortalDeckCachePayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SS_PORTAL_DECK_CACHE);
    if (!raw) return null;
    const o = JSON.parse(raw) as Partial<PortalDeckCachePayload>;
    if (!Array.isArray(o.missions) || !Array.isArray(o.reminders) || !Array.isArray(o.notes)) return null;
    return { missions: o.missions, reminders: o.reminders, notes: o.notes };
  } catch {
    return null;
  }
}

function writePortalDeckCache(m: MissionRow[], r: ReminderRow[], n: NoteRow[]) {
  try {
    const payload: PortalDeckCachePayload = { missions: m, reminders: r, notes: n };
    sessionStorage.setItem(SS_PORTAL_DECK_CACHE, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

type ApiMission = { id: number; title: string; target_at: string; points: number; status: string };
type ApiReminder = { id: number; title: string; date: string; time: string; points: number; status: string };
type ApiNote = { id: number; title: string; body: string; created_at: string };
function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function mapMission(m: ApiMission): MissionRow {
  return {
    id: String(m.id),
    title: m.title,
    targetIso: m.target_at,
    points: m.points,
    status: m.status as MissionRow["status"]
  };
}

function mapReminder(r: ApiReminder): ReminderRow {
  const t = r.time?.length >= 5 ? r.time.slice(0, 5) : r.time;
  return {
    id: String(r.id),
    title: r.title,
    date: r.date,
    time: t,
    status: r.status as ReminderRow["status"]
  };
}

function mapNote(n: ApiNote): NoteRow {
  return {
    id: String(n.id),
    title: n.title,
    body: n.body ?? "",
    createdAt: new Date(n.created_at).getTime()
  };
}

function timeForApi(t: string) {
  if (t.length === 5) return `${t}:00`;
  return t;
}

/** Local scheduled instant for a reminder row (date + time). */
function reminderDueMs(r: ReminderRow): number {
  const tp = r.time.length === 5 ? `${r.time}:00` : r.time;
  const ms = new Date(`${r.date}T${tp}`).getTime();
  return Number.isFinite(ms) ? ms : NaN;
}

/** Advance reminder schedule by N minutes (keeps local YYYY-MM-DD + wall time). */
function addMinutesToReminderDateTime(dateStr: string, timeStr: string, minutes: number): { date: string; time: string } {
  const tp = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  const d = new Date(`${dateStr}T${tp}`);
  if (!Number.isFinite(d.getTime())) return { date: dateStr, time: timeStr.length === 5 ? `${timeStr}:00` : timeStr };
  d.setMinutes(d.getMinutes() + minutes);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return { date: `${y}-${m}-${day}`, time: `${hh}:${mm}:${ss}` };
}

function formatReminderTimeDisplay(time: string) {
  return time.length >= 5 ? time.slice(0, 5) : time;
}

function isoToLocalDateTime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return { date: "", time: "" };
  const date = toYyyyMmDd(d);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return { date, time: `${hh}:${mm}` };
}

function addMinutesToIso(iso: string, minutes: number): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso;
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}

type DeckTimeEditTarget =
  | { kind: "reminder"; id: string; title: string; date: string; time: string }
  | { kind: "mission"; id: string; title: string; targetIso: string };

/** Quick Access–aligned deck shells: colored border, gradient fill, outer glow + material lift */
const DECK_MISSIONS =
  "relative w-full min-w-0 shrink-0 overflow-hidden rounded-xl border border-cyan-400/44 bg-gradient-to-b from-cyan-950/44 via-[#060606]/96 to-[#050505] p-[var(--fluid-deck-p)] shadow-[0_14px_48px_rgba(0,0,0,0.48),0_0_0_1px_rgba(34,211,238,0.16),0_0_40px_rgba(34,211,238,0.16),0_0_72px_rgba(34,211,238,0.07),inset_0_1px_0_rgba(255,255,255,0.07)]";

const DECK_REMINDERS =
  "relative w-full min-w-0 shrink-0 overflow-hidden rounded-xl border border-fuchsia-500/42 bg-gradient-to-b from-purple-950/46 via-[#07060c]/96 to-[#050505] p-[var(--fluid-deck-p)] shadow-[0_14px_48px_rgba(0,0,0,0.48),0_0_0_1px_rgba(192,132,252,0.18),0_0_40px_rgba(168,85,247,0.16),0_0_72px_rgba(147,51,234,0.08),inset_0_1px_0_rgba(255,255,255,0.06)]";

const DECK_NOTES =
  "relative w-full min-w-0 shrink-0 overflow-hidden rounded-xl border-[rgba(255,215,0,0.46)] bg-gradient-to-b from-[rgba(255,215,0,0.1)] via-[#060606]/96 to-[#050505] p-[var(--fluid-deck-p)] shadow-[0_14px_48px_rgba(0,0,0,0.48),0_0_0_1px_rgba(255,215,0,0.16),0_0_44px_rgba(255,215,0,0.12),0_0_72px_rgba(255,200,0,0.06),inset_0_1px_0_rgba(255,255,255,0.06)]";

const DECK_QUICK_WRAP =
  "relative overflow-hidden rounded-xl border border-[rgba(197,179,88,0.26)] bg-[#060606]/78 p-[var(--fluid-deck-p)] shadow-[0_0_0_1px_rgba(197,179,88,0.08),0_0_52px_rgba(197,179,88,0.08),inset_0_1px_0_rgba(197,179,88,0.08)]";

function DeckGlowMissions() {
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.92] [background:radial-gradient(780px_300px_at_22%_0%,rgba(34,211,238,0.28),rgba(0,0,0,0)_58%)]"
      aria-hidden
    />
  );
}

function DeckGlowReminders() {
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.9] [background:radial-gradient(780px_300px_at_22%_0%,rgba(192,132,252,0.3),rgba(0,0,0,0)_58%)]"
      aria-hidden
    />
  );
}

function DeckGlowNotes() {
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.88] [background:radial-gradient(780px_300px_at_20%_0%,rgba(255,215,0,0.18),rgba(0,0,0,0)_58%)]"
      aria-hidden
    />
  );
}

function DeckQuarterGlow() {
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-90 [background:radial-gradient(720px_320px_at_20%_0%,rgba(197,179,88,0.11),rgba(0,0,0,0)_60%)]"
      aria-hidden
    />
  );
}

const SCROLL_CYAN =
  "[scrollbar-color:rgba(34,211,238,0.55)_rgba(0,0,0,0.35)]";
const SCROLL_FUCHSIA =
  "[scrollbar-color:rgba(192,132,252,0.55)_rgba(0,0,0,0.35)]";
const SCROLL_GOLD =
  "[scrollbar-color:rgba(255,215,0,0.5)_rgba(0,0,0,0.35)]";
const SCROLL_EMERALD =
  "[scrollbar-color:rgba(52,211,153,0.55)_rgba(0,0,0,0.35)]";
const SCROLL_ROSE = "[scrollbar-color:rgba(251,113,133,0.55)_rgba(0,0,0,0.35)]";

/** Sub-panels inside missions/reminders (active/missed lists) */
const DECK_LIST_INNER_BASE =
  "mt-2 min-h-[clamp(12rem,34vh,17.5rem)] max-h-[min(68vh,720px)] space-y-[clamp(0.4rem,1vw+0.15rem,0.65rem)] overflow-y-auto overflow-x-hidden py-1 pr-[clamp(0.25rem,0.8vw+0.1rem,0.45rem)]";

const FORM_MISSIONS =
  "mt-[clamp(0.65rem,1.5vw+0.2rem,1.35rem)] space-y-[clamp(0.4rem,1vw+0.15rem,0.75rem)] rounded-xl border border-cyan-400/36 bg-black/50 p-[var(--fluid-deck-form-p)] shadow-[0_10px_36px_rgba(0,0,0,0.42),0_0_0_1px_rgba(34,211,238,0.14),inset_0_1px_0_rgba(34,211,238,0.12)]";

const FORM_REMINDERS =
  "mt-[clamp(0.65rem,1.5vw+0.2rem,1.35rem)] space-y-[clamp(0.4rem,1vw+0.15rem,0.75rem)] rounded-xl border border-fuchsia-400/38 bg-black/50 p-[var(--fluid-deck-form-p)] shadow-[0_10px_36px_rgba(0,0,0,0.42),0_0_0_1px_rgba(192,132,252,0.14),inset_0_1px_0_rgba(192,132,252,0.11)]";

const FORM_NOTES =
  "mt-[clamp(0.65rem,1.5vw+0.2rem,1.35rem)] space-y-[clamp(0.4rem,1vw+0.15rem,0.75rem)] rounded-xl border-[rgba(255,215,0,0.4)] bg-black/50 p-[var(--fluid-deck-form-p)] shadow-[0_10px_36px_rgba(0,0,0,0.42),0_0_0_1px_rgba(255,215,0,0.12),inset_0_1px_0_rgba(255,215,0,0.09)]";

/** Primary row actions: 40px+ hit area, neon focus ring (keyboard). */
const DECK_ROW_BTN_PRIMARY =
  "inline-flex min-h-10 items-center justify-center rounded-lg border px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] transition motion-safe:duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]";

const DECK_ROW_BTN_SECONDARY =
  "inline-flex min-h-10 items-center justify-center rounded-lg border px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] transition motion-safe:duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]";

/** Compact actions for top-bar due toasts (navbar strip). */
const DECK_TOAST_BTN =
  "inline-flex min-h-9 shrink-0 items-center justify-center rounded-md border px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] transition motion-safe:duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]";

const DECK_DUE_TOAST_WRAP =
  "w-full max-w-full rounded-md border border-red-500/60 bg-[#0a0505]/96 px-2 py-2 sm:px-3 sm:py-2.5 min-h-[2.7rem] sm:min-h-[3.1rem] md:min-h-[3.35rem] shadow-[0_0_0_1px_rgba(250,204,21,0.42),inset_0_0_0_1px_rgba(239,68,68,0.35),0_10px_40px_rgba(0,0,0,0.55),0_0_36px_rgba(239,68,68,0.14)] sm:flex sm:items-center sm:gap-2";

/** Single navbar slot for reminders: fixed height, one at a time (new replaces previous). */
const REMINDER_NAV_SLOT_ID = "deck-reminder-due-slot";
/** Navbar strip auto-dismiss + same as Snooze 10m if user does not act. */
const REMINDER_NAV_AUTO_SNOOZE_MS = 60 * 1000;
const TOAST_DURATION_LONG_MS = 7 * 24 * 60 * 60 * 1000;

function bucketMissions(missions: MissionRow[]) {
  const now = Date.now();
  const active: MissionRow[] = [];
  const missed: MissionRow[] = [];
  for (const m of missions) {
    if (m.status === "done") continue;
    if (m.status === "missed") {
      missed.push(m);
      continue;
    }
    if (m.status === "active") {
      const due = new Date(m.targetIso).getTime();
      if (Number.isFinite(due) && due < now) missed.push(m);
      else active.push(m);
    }
  }
  return { active, missed };
}

function DeckEmptyCta({
  message,
  actionLabel,
  onAction,
  accentClass
}: {
  message: string;
  actionLabel: string;
  onAction: () => void;
  accentClass: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-dashed px-4 py-6 text-center",
        accentClass
      )}
    >
      <p className="text-[14px] font-medium leading-relaxed text-neutral-200/92">{message}</p>
      <button
        type="button"
        onClick={onAction}
        className="mt-4 inline-flex min-h-[44px] w-full max-w-[16rem] items-center justify-center rounded-lg border border-white/18 bg-black/50 px-4 text-[11px] font-black uppercase tracking-[0.18em] text-white/90 shadow-[0_3px_0_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)] transition motion-safe:duration-200 hover:border-white/28 hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]"
      >
        {actionLabel}
      </button>
    </div>
  );
}

export function MissionCommandDeckCard({
  themeMode,
  layoutVariant = "embedded"
}: {
  themeMode: ThemeMode;
  /** `fullscreen`: opened from mobile viewport overlay — tighter chrome, no hover lift. */
  layoutVariant?: "embedded" | "fullscreen";
}) {
  const { user, loading: authLoading, can } = useAuth();

  const useApiDeck =
    !authLoading && !!user && (can("deck.view") || can("deck.manage") || can("*"));
  const canDeckWrite = can("deck.manage") || can("*");
  const deckInit = useMemo((): PortalDeckCachePayload => {
    return readPortalDeckCache() ?? { missions: [], reminders: [], notes: [] };
  }, []);
  const [missions, setMissions] = useState<MissionRow[]>(() => deckInit.missions);
  const [reminders, setReminders] = useState<ReminderRow[]>(() => deckInit.reminders);
  const [notes, setNotes] = useState<NoteRow[]>(() => deckInit.notes);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [portalBusy, setPortalBusy] = useState(false);

  const [mSearchA, setMSearchA] = useState("");
  const [mSearchM, setMSearchM] = useState("");
  const [mSortA, setMSortA] = useState<DeckSortDir>("asc");
  const [mSortM, setMSortM] = useState<DeckSortDir>("desc");

  const [rSearchAct, setRSearchAct] = useState("");
  const [rSearchDone, setRSearchDone] = useState("");
  const [rSortAct, setRSortAct] = useState<DeckSortDir>("desc");
  const [rSortDone, setRSortDone] = useState<DeckSortDir>("desc");

  const [nSearch, setNSearch] = useState("");
  const [nSort, setNSort] = useState<DeckSortDir>("desc");

  const [mTitle, setMTitle] = useState("");
  const [mDate, setMDate] = useState("");
  const [mTime, setMTime] = useState("");
  const [mPoints, setMPoints] = useState(10);

  const [rTitle, setRTitle] = useState("");
  const [rDate, setRDate] = useState("");
  const [rTime, setRTime] = useState("");

  const [nTitle, setNTitle] = useState("");
  const [nBody, setNBody] = useState("");

  const missionTitleInputRef = useRef<HTMLInputElement>(null);
  const reminderTitleInputRef = useRef<HTMLInputElement>(null);
  const noteTitleInputRef = useRef<HTMLInputElement>(null);

  /** Filter all deck lists to this calendar day (local). Null = show everything. */
  const [browseDate, setBrowseDate] = useState<string | null>(null);

  const remindersRef = useRef<ReminderRow[]>(reminders);
  remindersRef.current = reminders;
  const missionsRef = useRef<MissionRow[]>(missions);
  missionsRef.current = missions;
  /** One toast per reminder *schedule* until snooze/complete clears it. */
  const reminderToastKeysRef = useRef<Set<string>>(new Set());
  /** One toast per mission *target* until snooze/complete clears it. */
  const missionToastKeysRef = useRef<Set<string>>(new Set());

  /** Reminder navbar slot: one visible due at a time; same id replaces content. */
  const lastReminderNavSlotKeyRef = useRef<string | null>(null);
  const reminderNavSlotTargetIdRef = useRef<string | null>(null);
  /** True after user snoozes, edits time, or completes — stops auto-snooze. */
  const reminderUserAcknowledgedRef = useRef(false);
  const reminderNavAutoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [timeEdit, setTimeEdit] = useState<DeckTimeEditTarget | null>(null);
  const [timeEditDate, setTimeEditDate] = useState("");
  const [timeEditTime, setTimeEditTime] = useState("");

  const [deckAlarmMutedUi, setDeckAlarmMutedUi] = useState(false);
  const [deckAlarmHasCustomUi, setDeckAlarmHasCustomUi] = useState(false);
  const deckAlarmFileInputRef = useRef<HTMLInputElement>(null);

  /** Banked XP: sum of `points` on missions marked done (no completion timestamp in model). */
  const earnedMissionXp = useMemo(
    () => missions.filter((m) => m.status === "done").reduce((sum, m) => sum + (Number(m.points) || 0), 0),
    [missions]
  );

  const scrollComposerIntoView = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const smooth =
      typeof window !== "undefined" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "nearest" });
  }, []);

  const focusMissionComposer = useCallback(() => {
    scrollComposerIntoView("deck-mission-compose");
    window.setTimeout(() => missionTitleInputRef.current?.focus(), 200);
  }, [scrollComposerIntoView]);

  const focusReminderComposer = useCallback(() => {
    scrollComposerIntoView("deck-reminder-compose");
    window.setTimeout(() => reminderTitleInputRef.current?.focus(), 200);
  }, [scrollComposerIntoView]);

  const focusNoteComposer = useCallback(() => {
    scrollComposerIntoView("deck-note-compose");
    window.setTimeout(() => noteTitleInputRef.current?.focus(), 200);
  }, [scrollComposerIntoView]);

  const refreshPortal = useCallback(async () => {
    if (!user || !useApiDeck) return;
    setPortalBusy(true);
    setPortalError(null);
    try {
      const [mRes, rRes, nRes] = await Promise.all([
        portalFetch<unknown>(`/api/portal/missions/`),
        portalFetch<unknown>(`/api/portal/reminders/`),
        portalFetch<unknown>(`/api/portal/notes/`)
      ]);

      let mList = (mRes.ok && Array.isArray(mRes.data) ? mRes.data : []) as ApiMission[];
      if (canDeckWrite && mList.length) {
        const now = Date.now();
        const overdue = mList.filter(
          (x) => x.status === "active" && new Date(x.target_at).getTime() < now
        );
        if (overdue.length) {
          await Promise.all(
            overdue.map((x) =>
              portalFetch(`/api/portal/missions/${x.id}/`, {
                method: "PATCH",
                body: JSON.stringify({ status: "missed" })
              })
            )
          );
          const again = await portalFetch<unknown>(`/api/portal/missions/`);
          if (again.ok && Array.isArray(again.data)) mList = again.data as ApiMission[];
        }
      }
      const mappedM = mList.map(mapMission);
      const rList = (rRes.ok && Array.isArray(rRes.data) ? rRes.data : []) as ApiReminder[];
      const mappedR = rList.map(mapReminder);
      const nList = (nRes.ok && Array.isArray(nRes.data) ? nRes.data : []) as ApiNote[];
      const mappedN = nList.map(mapNote).sort((a, b) => b.createdAt - a.createdAt);
      setMissions(mappedM);
      setReminders(mappedR);
      setNotes(mappedN);
      writePortalDeckCache(mappedM, mappedR, mappedN);
    } catch (e) {
      setPortalError(e instanceof Error ? e.message : "Portal sync failed");
    } finally {
      setPortalBusy(false);
    }
  }, [user, useApiDeck, canDeckWrite]);

  const hydrateLocal = useCallback(() => {
    let m = safeParse<MissionRow[]>(window.localStorage.getItem(LS_MISSIONS), []);
    const now = Date.now();
    m = m.map((row) => {
      if (row.status !== "active") return row;
      const due = new Date(row.targetIso).getTime();
      if (Number.isFinite(due) && due < now) return { ...row, status: "missed" as const };
      return row;
    });
    setMissions(m);
    window.localStorage.setItem(LS_MISSIONS, JSON.stringify(m));

    setReminders(safeParse<ReminderRow[]>(window.localStorage.getItem(LS_REMINDERS), []));
    const n = safeParse<NoteRow[]>(window.localStorage.getItem(LS_NOTES), []);
    n.sort((a, b) => b.createdAt - a.createdAt);
    setNotes(n);
  }, []);

  useEffect(() => {
    if (useApiDeck) {
      void refreshPortal();
    } else if (!authLoading) {
      hydrateLocal();
    }
  }, [useApiDeck, authLoading, refreshPortal, hydrateLocal]);

  useEffect(() => {
    if (useApiDeck) return;
    writePortalDeckCache(missions, reminders, notes);
  }, [useApiDeck, missions, reminders, notes]);

  const persistMissions = useCallback((next: MissionRow[]) => {
    setMissions(next);
    window.localStorage.setItem(LS_MISSIONS, JSON.stringify(next));
  }, []);

  const persistReminders = useCallback((next: ReminderRow[]) => {
    setReminders(next);
    window.localStorage.setItem(LS_REMINDERS, JSON.stringify(next));
  }, []);

  const persistNotes = useCallback((next: NoteRow[]) => {
    const sorted = [...next].sort((a, b) => b.createdAt - a.createdAt);
    setNotes(sorted);
    window.localStorage.setItem(LS_NOTES, JSON.stringify(sorted));
  }, []);

  const clearReminderNavAutoTimeout = useCallback(() => {
    if (reminderNavAutoTimeoutRef.current != null) {
      window.clearTimeout(reminderNavAutoTimeoutRef.current);
      reminderNavAutoTimeoutRef.current = null;
    }
  }, []);

  const clearReminderToastKeysForId = useCallback(
    (id: string) => {
      const s = reminderToastKeysRef.current;
      for (const k of [...s]) {
        if (k.startsWith(`${id}|`)) s.delete(k);
      }
      if (reminderNavSlotTargetIdRef.current === id) {
        reminderUserAcknowledgedRef.current = true;
        clearReminderNavAutoTimeout();
        reminderNavSlotTargetIdRef.current = null;
        lastReminderNavSlotKeyRef.current = null;
        toast.dismiss(REMINDER_NAV_SLOT_ID);
      }
    },
    [clearReminderNavAutoTimeout]
  );

  const clearMissionToastKeysForId = useCallback((id: string) => {
    const s = missionToastKeysRef.current;
    for (const k of [...s]) {
      if (k.startsWith(`${id}|`)) s.delete(k);
    }
    toast.dismiss(`mission-due-${id}`);
  }, []);

  useEffect(() => {
    setDeckAlarmMutedUi(isDeckAlarmMuted());
    setDeckAlarmHasCustomUi(!!getDeckAlarmCustomDataUrl());
  }, []);

  useEffect(() => {
    if (!timeEdit) return;
    if (timeEdit.kind === "reminder") {
      setTimeEditDate(timeEdit.date);
      setTimeEditTime(timeEdit.time.length >= 5 ? timeEdit.time.slice(0, 5) : timeEdit.time);
    } else {
      const { date, time } = isoToLocalDateTime(timeEdit.targetIso);
      setTimeEditDate(date);
      setTimeEditTime(time);
    }
  }, [timeEdit]);

  const patchReminder = useCallback(
    async (id: string, patch: Partial<Pick<ReminderRow, "status" | "date" | "time">>) => {
      if (useApiDeck && canDeckWrite) {
        const body: Record<string, unknown> = {};
        if (patch.status !== undefined) body.status = patch.status;
        if (patch.date !== undefined) body.date = patch.date;
        if (patch.time !== undefined) body.time = typeof patch.time === "string" && patch.time.length === 5 ? `${patch.time}:00` : patch.time;
        const res = await portalFetch(`/api/portal/reminders/${id}/`, {
          method: "PATCH",
          body: JSON.stringify(body)
        });
        if (!res.ok) setPortalError("Could not update reminder");
        await refreshPortal();
      } else if (!useApiDeck) {
        persistReminders(
          remindersRef.current.map((x) => {
            if (x.id !== id) return x;
            const next = { ...x, ...patch };
            if (typeof next.time === "string" && next.time.length >= 8) next.time = next.time.slice(0, 5);
            return next;
          })
        );
      }
    },
    [useApiDeck, canDeckWrite, persistReminders, refreshPortal]
  );

  const patchMission = useCallback(
    async (id: string, patch: Partial<Pick<MissionRow, "status" | "targetIso">>) => {
      if (useApiDeck && canDeckWrite) {
        const body: Record<string, unknown> = {};
        if (patch.status !== undefined) body.status = patch.status;
        if (patch.targetIso !== undefined) body.target_at = patch.targetIso;
        const res = await portalFetch(`/api/portal/missions/${id}/`, {
          method: "PATCH",
          body: JSON.stringify(body)
        });
        if (!res.ok) setPortalError("Could not update mission");
        await refreshPortal();
      } else if (!useApiDeck) {
        persistMissions(missionsRef.current.map((x) => (x.id === id ? { ...x, ...patch } : x)));
      }
    },
    [useApiDeck, canDeckWrite, persistMissions, refreshPortal]
  );

  const canEditReminders = !useApiDeck || canDeckWrite;

  /** After 1 min in navbar: remove strip and apply +10 min (same as Snooze) if user has not acted. */
  const scheduleReminderNavAutoSnooze = useCallback(() => {
    clearReminderNavAutoTimeout();
    reminderNavAutoTimeoutRef.current = window.setTimeout(() => {
      reminderNavAutoTimeoutRef.current = null;
      if (reminderUserAcknowledgedRef.current) return;
      const id = reminderNavSlotTargetIdRef.current;
      if (!id) return;

      for (const k of [...reminderToastKeysRef.current]) {
        if (k.startsWith(`${id}|`)) reminderToastKeysRef.current.delete(k);
      }
      lastReminderNavSlotKeyRef.current = null;
      reminderNavSlotTargetIdRef.current = null;
      toast.dismiss(REMINDER_NAV_SLOT_ID);

      if (!canEditReminders) return;
      const latest = remindersRef.current.find((x) => x.id === id);
      if (!latest || latest.status !== "active") return;
      const due = reminderDueMs(latest);
      if (!Number.isFinite(due) || due > Date.now()) return;
      const next = addMinutesToReminderDateTime(latest.date, latest.time, 10);
      void patchReminder(latest.id, { date: next.date, time: next.time });
    }, REMINDER_NAV_AUTO_SNOOZE_MS);
  }, [canEditReminders, clearReminderNavAutoTimeout, patchReminder]);

  const snoozeReminder10Min = useCallback(
    async (r: ReminderRow) => {
      if (!canEditReminders) return;
      reminderUserAcknowledgedRef.current = true;
      clearReminderNavAutoTimeout();
      for (const k of [...reminderToastKeysRef.current]) {
        if (k.startsWith(`${r.id}|`)) reminderToastKeysRef.current.delete(k);
      }
      lastReminderNavSlotKeyRef.current = null;
      if (reminderNavSlotTargetIdRef.current === r.id) {
        reminderNavSlotTargetIdRef.current = null;
        toast.dismiss(REMINDER_NAV_SLOT_ID);
      }
      const next = addMinutesToReminderDateTime(r.date, r.time, 10);
      await patchReminder(r.id, { date: next.date, time: next.time });
    },
    [canEditReminders, clearReminderNavAutoTimeout, patchReminder]
  );

  const snoozeMission10Min = useCallback(
    async (m: MissionRow) => {
      if (!canEditReminders) return;
      clearMissionToastKeysForId(m.id);
      const nextIso = addMinutesToIso(m.targetIso, 10);
      await patchMission(m.id, { targetIso: nextIso });
    },
    [canEditReminders, clearMissionToastKeysForId, patchMission]
  );

  const onDeckAlarmFileChange = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      const data = await readAudioFileAsDataUrl(f);
      setDeckAlarmCustomDataUrl(data);
      setDeckAlarmHasCustomUi(true);
      await unlockDeckAlarmAudio();
      playDeckAlarmSound();
    } catch (err) {
      setPortalError(err instanceof Error ? err.message : "Could not load audio");
    }
  }, []);

  const saveTimeEdit = useCallback(async () => {
    if (!timeEdit) return;
    const iso = localDateAndTimeToIso(timeEditDate, timeEditTime);
    if (!iso) return;
    if (timeEdit.kind === "reminder") {
      clearReminderToastKeysForId(timeEdit.id);
      const d = new Date(iso);
      const date = toYyyyMmDd(d);
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      const ss = String(d.getSeconds()).padStart(2, "0");
      await patchReminder(timeEdit.id, { date, time: `${hh}:${mm}:${ss}` });
    } else {
      clearMissionToastKeysForId(timeEdit.id);
      await patchMission(timeEdit.id, { targetIso: iso });
    }
    setTimeEdit(null);
  }, [timeEdit, timeEditDate, timeEditTime, patchReminder, patchMission, clearReminderToastKeysForId, clearMissionToastKeysForId]);

  /** When a scheduled time is reached: one reminder slot in navbar; after 1 min auto-dismiss + snooze +10m if ignored. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const tick = () => {
      const now = Date.now();
      const rList = remindersRef.current.filter((x) => x.status === "active");
      const dueRows = rList
        .map((r) => {
          const due = reminderDueMs(r);
          return { r, due };
        })
        .filter(({ due }) => Number.isFinite(due) && due <= now)
        .sort((a, b) => a.due - b.due);

      const primary = dueRows[0]?.r ?? null;

      if (!primary) {
        clearReminderNavAutoTimeout();
        reminderNavSlotTargetIdRef.current = null;
        lastReminderNavSlotKeyRef.current = null;
        toast.dismiss(REMINDER_NAV_SLOT_ID);
      } else {
        missionToastKeysRef.current.clear();
        for (const m of missionsRef.current) {
          toast.dismiss(`mission-due-${m.id}`);
        }
        const slotKey = `${primary.id}|${primary.date}|${primary.time}`;
        if (lastReminderNavSlotKeyRef.current !== slotKey) {
          lastReminderNavSlotKeyRef.current = slotKey;
          reminderNavSlotTargetIdRef.current = primary.id;
          reminderUserAcknowledgedRef.current = false;
          clearReminderNavAutoTimeout();
          const r = primary;
          const whenLabel = `${r.date} · ${formatReminderTimeDisplay(r.time)}`;
          playDeckAlarmSound();
          toast.custom(
            (t) => (
              <div role="alert" className="pointer-events-auto deck-reminder-nav-strip">
                <div className="deck-reminder-left">
                  <span className="deck-alarm-bell deck-reminder-bell" aria-hidden>
                    🔔
                  </span>
                  <div className="deck-reminder-copy">
                    <div className="deck-reminder-label">Reminder due</div>
                    <div className="deck-reminder-title">{r.title}</div>
                    <div className="deck-reminder-when">{whenLabel}</div>
                  </div>
                </div>
                {canEditReminders ? (
                  <div className="deck-reminder-actions">
                    <button
                      type="button"
                      className="deck-reminder-btn deck-reminder-btn--snooze"
                      onClick={() => {
                        toast.dismiss(t.id);
                        const latest = remindersRef.current.find((x) => x.id === r.id);
                        if (latest) void snoozeReminder10Min(latest);
                      }}
                    >
                      10m
                    </button>
                    <button
                      type="button"
                      className="deck-reminder-btn deck-reminder-btn--ghost"
                      onClick={() => {
                        toast.dismiss(t.id);
                        reminderUserAcknowledgedRef.current = true;
                        clearReminderNavAutoTimeout();
                        const latest = remindersRef.current.find((x) => x.id === r.id);
                        if (latest)
                          setTimeEdit({
                            kind: "reminder",
                            id: latest.id,
                            title: latest.title,
                            date: latest.date,
                            time: latest.time
                          });
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="deck-reminder-btn deck-reminder-btn--done"
                      onClick={() => {
                        toast.dismiss(t.id);
                        clearReminderToastKeysForId(r.id);
                        void patchReminder(r.id, { status: "completed" });
                      }}
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <p className="deck-reminder-viewonly">View only</p>
                )}
              </div>
            ),
            { id: REMINDER_NAV_SLOT_ID, duration: TOAST_DURATION_LONG_MS }
          );
          scheduleReminderNavAutoSnooze();
        }
      }

      if (!primary) {
      const mList = missionsRef.current.filter((x) => x.status === "active");
      for (const m of mList) {
        const dueTs = new Date(m.targetIso).getTime();
        if (!Number.isFinite(dueTs) || dueTs > now) continue;
        const key = `${m.id}|${m.targetIso}`;
        if (missionToastKeysRef.current.has(key)) continue;
        missionToastKeysRef.current.add(key);
        playDeckAlarmSound();
        const whenLabel = new Date(m.targetIso).toLocaleString(undefined, {
          dateStyle: "short",
          timeStyle: "short"
        });
        toast.custom(
          (t) => (
            <div role="alert" className={cn("pointer-events-auto", DECK_DUE_TOAST_WRAP)}>
              <div className="flex min-w-0 flex-1 items-start gap-2 sm:items-center">
                <span className="deck-alarm-bell text-[1.25rem] leading-none" aria-hidden>
                  🔔
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[9px] font-black uppercase tracking-[0.2em] text-red-300/95">Mission due</div>
                  <div className="truncate text-[14px] font-semibold leading-tight text-white/96">{m.title}</div>
                  <div className="text-[11px] font-medium text-red-200/85">{whenLabel}</div>
                </div>
              </div>
              {canEditReminders ? (
                <div className="mt-2 flex flex-wrap items-center justify-end gap-1.5 sm:mt-0 sm:ml-auto sm:max-w-[min(100%,28rem)] sm:justify-end">
                  <button
                    type="button"
                    className={cn(
                      DECK_TOAST_BTN,
                      "border-red-600/55 bg-red-950/55 text-red-50 hover:border-red-400/75 focus-visible:ring-red-400/55"
                    )}
                    onClick={() => {
                      toast.dismiss(t.id);
                      const latest = missionsRef.current.find((x) => x.id === m.id);
                      if (latest) void snoozeMission10Min(latest);
                    }}
                  >
                    Snooze 10m
                  </button>
                  <button
                    type="button"
                    className={cn(
                      DECK_TOAST_BTN,
                      "border-white/22 bg-black/55 text-white/92 hover:border-white/40 focus-visible:ring-white/35"
                    )}
                    onClick={() => {
                      toast.dismiss(t.id);
                      const latest = missionsRef.current.find((x) => x.id === m.id);
                      if (latest)
                        setTimeEdit({
                          kind: "mission",
                          id: latest.id,
                          title: latest.title,
                          targetIso: latest.targetIso
                        });
                    }}
                  >
                    Edit time
                  </button>
                  <button
                    type="button"
                    className={cn(
                      DECK_TOAST_BTN,
                      "border-cyan-500/45 bg-black/50 text-cyan-100 hover:border-cyan-300/65 focus-visible:ring-cyan-400/55"
                    )}
                    onClick={() => {
                      toast.dismiss(t.id);
                      clearMissionToastKeysForId(m.id);
                      void patchMission(m.id, { status: "done" });
                    }}
                  >
                    Complete
                  </button>
                </div>
              ) : (
                <p className="mt-1.5 text-[10px] text-red-200/70 sm:mt-0 sm:self-center">View only — cannot act on missions.</p>
              )}
            </div>
          ),
          { id: `mission-due-${m.id}`, duration: 60000 }
        );
      }
      }
    };
    tick();
    const timerId = window.setInterval(tick, 4000);
    return () => {
      window.clearInterval(timerId);
      clearReminderNavAutoTimeout();
    };
  }, [
    canEditReminders,
    clearReminderNavAutoTimeout,
    clearReminderToastKeysForId,
    clearMissionToastKeysForId,
    patchReminder,
    patchMission,
    snoozeReminder10Min,
    snoozeMission10Min,
    scheduleReminderNavAutoSnooze
  ]);

  const missionBuckets = useMemo(() => bucketMissions(missions), [missions]);
  const activeMissions = missionBuckets.active;
  const missedMissions = missionBuckets.missed;

  const sortByTarget = (a: MissionRow, b: MissionRow, dir: DeckSortDir) => {
    const da = new Date(a.targetIso).getTime();
    const db = new Date(b.targetIso).getTime();
    return dir === "desc" ? db - da : da - db;
  };

  const filteredActiveMissions = useMemo(() => {
    let rows = filterBySearch(activeMissions, (r) => `${r.title} ${r.targetIso}`, mSearchA);
    if (browseDate) rows = rows.filter((r) => missionLocalDay(r.targetIso) === browseDate);
    return [...rows].sort((a, b) => sortByTarget(a, b, mSortA));
  }, [activeMissions, mSearchA, mSortA, browseDate]);

  const filteredMissedMissions = useMemo(() => {
    let rows = filterBySearch(missedMissions, (r) => `${r.title} ${r.targetIso}`, mSearchM);
    if (browseDate) rows = rows.filter((r) => missionLocalDay(r.targetIso) === browseDate);
    return [...rows].sort((a, b) => sortByTarget(a, b, mSortM));
  }, [missedMissions, mSearchM, mSortM, browseDate]);

  const activeReminders = useMemo(() => reminders.filter((r) => r.status === "active"), [reminders]);
  const doneReminders = useMemo(() => reminders.filter((r) => r.status === "completed"), [reminders]);

  const reminderSortKey = (r: ReminderRow) => `${r.date}T${r.time.length === 5 ? r.time + ":00" : r.time}`;

  const filteredActiveReminders = useMemo(() => {
    let rows = filterBySearch(activeReminders, (r) => `${r.title} ${r.date} ${r.time}`, rSearchAct);
    if (browseDate) rows = rows.filter((r) => r.date === browseDate);
    return [...rows].sort((a, b) => {
      const cmp = reminderSortKey(a).localeCompare(reminderSortKey(b));
      return rSortAct === "desc" ? -cmp : cmp;
    });
  }, [activeReminders, rSearchAct, rSortAct, browseDate]);

  const filteredDoneReminders = useMemo(() => {
    let rows = filterBySearch(doneReminders, (r) => `${r.title} ${r.date} ${r.time}`, rSearchDone);
    if (browseDate) rows = rows.filter((r) => r.date === browseDate);
    return [...rows].sort((a, b) => {
      const cmp = reminderSortKey(a).localeCompare(reminderSortKey(b));
      return rSortDone === "desc" ? -cmp : cmp;
    });
  }, [doneReminders, rSearchDone, rSortDone, browseDate]);

  const filteredNotes = useMemo(() => {
    let rows = filterBySearch(notes, (n) => `${n.title} ${n.body}`, nSearch);
    if (browseDate) rows = rows.filter((n) => noteLocalDay(n.createdAt) === browseDate);
    return [...rows].sort((a, b) => {
      const cmp = a.createdAt - b.createdAt;
      return nSort === "desc" ? -cmp : cmp;
    });
  }, [notes, nSearch, nSort, browseDate]);

  const optionNotes = notesExpanded ? filteredNotes : filteredNotes.slice(0, 5);
  const notesRemaining = Math.max(0, filteredNotes.length - 5);

  const selectedNote =
    filteredNotes.find((n) => n.id === selectedNoteId) ?? optionNotes[0] ?? null;

  useEffect(() => {
    if (!selectedNoteId) return;
    if (!filteredNotes.some((n) => n.id === selectedNoteId)) setSelectedNoteId(null);
  }, [filteredNotes, selectedNoteId]);

  const addMission = async () => {
    const title = mTitle.trim();
    const targetIso = localDateAndTimeToIso(mDate, mTime);
    if (!title || !targetIso) return;
    if (useApiDeck && canDeckWrite) {
      const res = await portalFetch(`/api/portal/missions/`, {
        method: "POST",
        body: JSON.stringify({
          title,
          target_at: targetIso,
          points: Math.max(0, Math.min(9999, Math.floor(mPoints))),
          status: "active"
        })
      });
      if (!res.ok) {
        setPortalError("Could not create mission");
        return;
      }
      await refreshPortal();
    } else {
      const row: MissionRow = {
        id: uid(),
        title,
        targetIso,
        points: Math.max(0, Math.min(9999, Math.floor(mPoints))),
        status: "active"
      };
      persistMissions([row, ...missions]);
    }
    setMTitle("");
    setMDate("");
    setMTime("");
    setMPoints(10);
  };

  const addReminder = async () => {
    const title = rTitle.trim();
    if (!title || !rDate || !rTime) return;
    if (useApiDeck && canDeckWrite) {
      const res = await portalFetch(`/api/portal/reminders/`, {
        method: "POST",
        body: JSON.stringify({
          title,
          date: rDate,
          time: timeForApi(rTime),
          points: 0,
          status: "active"
        })
      });
      if (!res.ok) setPortalError("Could not create reminder");
      await refreshPortal();
    } else {
      const row: ReminderRow = {
        id: uid(),
        title,
        date: rDate,
        time: rTime,
        status: "active"
      };
      persistReminders([row, ...reminders]);
    }
    setRTitle("");
    setRDate("");
    setRTime("");
  };

  const addNote = async () => {
    const title = nTitle.trim();
    if (!title) return;
    if (useApiDeck && canDeckWrite) {
      const res = await portalFetch(`/api/portal/notes/`, {
        method: "POST",
        body: JSON.stringify({ title, body: nBody.trim() })
      });
      if (!res.ok) setPortalError("Could not save note");
      await refreshPortal();
      if (res.ok && res.data && typeof res.data === "object" && "id" in res.data) {
        setSelectedNoteId(String((res.data as { id: number }).id));
      }
    } else {
      const row: NoteRow = { id: uid(), title, body: nBody.trim(), createdAt: Date.now() };
      persistNotes([row, ...notes]);
      setSelectedNoteId(row.id);
    }
    setNTitle("");
    setNBody("");
  };

  const missionsLabel =
    "text-[11px] font-extrabold uppercase tracking-[0.16em] text-cyan-200 md:text-[12px]";
  const missionsInput =
    "mt-1.5 w-full rounded-lg border border-cyan-400/42 bg-[#050a0c] px-3 py-2.5 text-[15px] font-medium leading-relaxed text-cyan-50/96 outline-none placeholder:text-cyan-200/22 shadow-[inset_0_2px_8px_rgba(0,0,0,0.62),inset_0_1px_0_rgba(34,211,238,0.07)] focus:border-cyan-300/82 focus:shadow-[inset_0_2px_8px_rgba(0,0,0,0.5),0_0_0_1px_rgba(34,211,238,0.32),0_0_22px_rgba(34,211,238,0.22)] focus-visible:ring-2 focus-visible:ring-cyan-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505] md:py-3";

  const remindersLabel =
    "text-[11px] font-extrabold uppercase tracking-[0.16em] text-fuchsia-200 md:text-[12px]";
  const remindersInput =
    "mt-1.5 w-full rounded-lg border border-fuchsia-400/44 bg-[#0a060c] px-3 py-2.5 text-[15px] font-medium leading-relaxed text-fuchsia-50/96 outline-none placeholder:text-fuchsia-200/22 shadow-[inset_0_2px_8px_rgba(0,0,0,0.62),inset_0_1px_0_rgba(192,132,252,0.08)] focus:border-fuchsia-300/78 focus:shadow-[inset_0_2px_8px_rgba(0,0,0,0.5),0_0_0_1px_rgba(192,132,252,0.3),0_0_22px_rgba(168,85,247,0.22)] focus-visible:ring-2 focus-visible:ring-fuchsia-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505] md:py-3";

  const notesLabel =
    "text-[11px] font-extrabold uppercase tracking-[0.16em] text-[color:var(--gold)] md:text-[12px]";
  const notesInput =
    "mt-1.5 w-full rounded-lg border-[rgba(255,215,0,0.46)] bg-[#0a0906] px-3 py-2.5 text-[15px] font-medium leading-relaxed text-[rgba(255,248,220,0.96)] outline-none placeholder:text-[rgba(255,230,150,0.22)] shadow-[inset_0_2px_8px_rgba(0,0,0,0.62),inset_0_1px_0_rgba(255,215,0,0.07)] focus:border-[rgba(255,230,120,0.78)] focus:shadow-[inset_0_2px_8px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,215,0,0.28),0_0_24px_rgba(255,200,0,0.2)] focus-visible:ring-2 focus-visible:ring-[rgba(250,204,21,0.5)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505] md:py-3";

  return (
    <Card
      themeMode={themeMode}
      frameVariant="shell"
      disableHoverLift={layoutVariant === "fullscreen"}
      className={cn(
        "shadow-[0_18px_56px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)]",
        layoutVariant === "fullscreen" && "!p-3.5 sm:!p-4 md:!p-6 lg:!p-7"
      )}
      title="Goals & Milestones"
      right={
        <div className="flex flex-col items-end gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <div
            className="rounded-lg border border-cyan-400/45 bg-[#050a0c]/90 px-3 py-2 text-right shadow-[0_0_0_1px_rgba(34,211,238,0.2),0_0_20px_rgba(34,211,238,0.18),inset_0_1px_0_rgba(34,211,238,0.12)]"
            title="Total points from missions marked complete"
          >
            <div className="font-mono text-[9px] font-black uppercase tracking-[0.2em] text-cyan-200/85">Earned XP</div>
            <div className="font-mono text-[18px] font-black tabular-nums leading-none text-cyan-50">{earnedMissionXp}</div>
          </div>
          {portalBusy ? (
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-300/88">Syncing…</span>
          ) : null}
          {useApiDeck ? (
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-200/90">API</span>
          ) : (
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-300/85">Local</span>
          )}
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-300/85">Ops deck</div>
        </div>
      }
    >
      {portalError ? (
        <div className="mb-3 rounded-md border border-red-500/35 bg-red-950/40 px-3 py-2 text-[13px] font-medium leading-snug text-red-100/95">
          {portalError}{" "}
          <button
            type="button"
            className="min-h-[40px] rounded px-2 font-semibold underline decoration-red-300/80 underline-offset-2 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#060606]"
            onClick={() => setPortalError(null)}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="mb-5">
        <DeckBrowseDateBar browseDate={browseDate} onBrowseDateChange={setBrowseDate} tone="gold" />
      </div>

      <div className="flex w-full max-w-none min-w-0 flex-col gap-6 min-[1400px]:gap-8 lg:gap-7 xl:gap-8">
        {/* 1 — Missions (full width, cyan strike deck) */}
        <div className={DECK_MISSIONS}>
          <DeckGlowMissions />
          <div className="relative z-[1]">
          <div className="text-[12px] font-black uppercase tracking-[0.2em] text-cyan-200 md:text-[13px] lg:text-[14px]">
            Missions
          </div>
          <p className="mt-2 max-w-prose text-[15px] font-normal leading-relaxed text-neutral-200/90 md:text-[15px] md:leading-[1.55]">
            Create a mission with a target time and point value. Track active and missed.
          </p>

          {useApiDeck && !canDeckWrite ? (
            <p className="mt-2 text-[12px] font-medium leading-snug text-amber-100/92">
              Read-only: your role can view missions but not edit.
            </p>
          ) : null}

          <div id="deck-mission-compose" className={FORM_MISSIONS}>
            <div>
              <label className={missionsLabel}>Mission title</label>
              <input
                ref={missionTitleInputRef}
                className={missionsInput}
                value={mTitle}
                onChange={(e) => setMTitle(e.target.value)}
                placeholder="e.g. Deep work — proposal"
                disabled={useApiDeck && !canDeckWrite}
              />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <DeckDateField
                id="mission-target-date"
                label="Target date"
                labelClassName={missionsLabel}
                value={mDate}
                onValueChange={setMDate}
                disabled={useApiDeck && !canDeckWrite}
                tone="cyan"
              />
              <DeckTimeField
                id="mission-target-time"
                label="Target time"
                labelClassName={missionsLabel}
                value={mTime}
                onValueChange={setMTime}
                disabled={useApiDeck && !canDeckWrite}
                tone="cyan"
              />
              <div>
                <label className={missionsLabel}>Points</label>
                <input
                  className={missionsInput}
                  type="number"
                  min={0}
                  max={9999}
                  value={mPoints}
                  onChange={(e) => setMPoints(Number(e.target.value))}
                  disabled={useApiDeck && !canDeckWrite}
                />
              </div>
            </div>
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => void addMission()}
              disabled={useApiDeck && !canDeckWrite}
              className="w-full rounded-lg border border-emerald-400/58 bg-emerald-950/38 py-3 text-[11px] font-black uppercase tracking-[0.15em] text-emerald-50 shadow-[0_4px_0_rgba(0,0,0,0.42),0_0_0_1px_rgba(52,211,153,0.28),0_8px_32px_rgba(16,185,129,0.32),inset_0_1px_0_rgba(167,243,208,0.12)] hover:border-emerald-300/78 hover:bg-emerald-950/52 hover:shadow-[0_5px_0_rgba(0,0,0,0.38),0_0_0_1px_rgba(52,211,153,0.42),0_12px_40px_rgba(16,185,129,0.38)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505] disabled:cursor-not-allowed disabled:opacity-40 md:min-h-[48px] md:text-[12px]"
            >
              Create mission
            </motion.button>
          </div>

          <div className="mt-5 grid w-full min-w-0 grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
            <div className="min-w-0 rounded-xl border border-emerald-400/48 bg-gradient-to-b from-emerald-950/42 to-black/58 p-3 shadow-[0_12px_40px_rgba(0,0,0,0.4),0_0_0_1px_rgba(52,211,153,0.2),0_0_36px_rgba(16,185,129,0.24),inset_0_1px_0_rgba(167,243,208,0.08)] md:p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200">
                Active missions
              </div>
              <DeckListToolbar
                tone="emerald"
                search={mSearchA}
                onSearchChange={setMSearchA}
                sortLabel="Due"
                sortDir={mSortA}
                onSortDirToggle={() => setMSortA((d) => (d === "desc" ? "asc" : "desc"))}
                placeholder="Search active…"
              />
              <div className={cn(DECK_LIST_INNER_BASE, SCROLL_EMERALD)}>
                {filteredActiveMissions.length === 0 ? (
                  browseDate ? (
                    <DeckEmptyCta
                      message="No active missions on this day."
                      actionLabel="Show all days"
                      onAction={() => setBrowseDate(null)}
                      accentClass="border-emerald-500/35 bg-black/35"
                    />
                  ) : (
                    <DeckEmptyCta
                      message="Nothing in the active queue yet."
                      actionLabel="Create a mission"
                      onAction={focusMissionComposer}
                      accentClass="border-emerald-500/35 bg-black/35"
                    />
                  )
                ) : (
                  filteredActiveMissions.map((m) => {
                    const dueTs = new Date(m.targetIso).getTime();
                    const urgent = Number.isFinite(dueTs) && dueTs - Date.now() < 36e5 && dueTs > Date.now();
                    return (
                      <DeckListItem
                        key={m.id}
                        tone="emerald"
                        title={m.title}
                        badge={<MissionStatusBadge status="active" />}
                        subtitle={
                          <>
                            <DueDateLine
                              label="Due"
                              value={new Date(m.targetIso).toLocaleString()}
                              urgent={urgent}
                            />
                            <div className="mt-0.5">
                              <PriorityPoints points={m.points} tone="ice" />
                            </div>
                          </>
                        }
                        footer={
                          (!useApiDeck || canDeckWrite) && (
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                className={cn(
                                  DECK_ROW_BTN_SECONDARY,
                                  "border-white/22 bg-black/45 text-white/90 shadow-[0_2px_0_rgba(0,0,0,0.35)] hover:border-white/40 focus-visible:ring-white/35"
                                )}
                                onClick={() =>
                                  setTimeEdit({
                                    kind: "mission",
                                    id: m.id,
                                    title: m.title,
                                    targetIso: m.targetIso
                                  })
                                }
                              >
                                Edit time
                              </button>
                              <button
                                type="button"
                                className={cn(
                                  DECK_ROW_BTN_PRIMARY,
                                  "border-emerald-500/48 bg-emerald-950/45 text-emerald-50 shadow-[0_2px_0_rgba(0,0,0,0.35),inset_0_1px_0_rgba(167,243,208,0.1)] hover:border-emerald-300/75 hover:bg-emerald-950/55 focus-visible:ring-emerald-400/55"
                                )}
                                onClick={() => void patchMission(m.id, { status: "done" })}
                              >
                                Complete
                              </button>
                              <button
                                type="button"
                                className={cn(
                                  DECK_ROW_BTN_SECONDARY,
                                  "border-rose-500/42 bg-black/45 text-rose-100 shadow-[0_2px_0_rgba(0,0,0,0.35)] hover:border-rose-400/65 hover:bg-rose-950/30 focus-visible:ring-rose-400/55"
                                )}
                                onClick={() => void patchMission(m.id, { status: "missed" })}
                              >
                                Mark missed
                              </button>
                            </div>
                          )
                        }
                      />
                    );
                  })
                )}
              </div>
            </div>
            <div className="min-w-0 rounded-xl border border-rose-500/48 bg-gradient-to-b from-rose-950/40 to-black/58 p-3 shadow-[0_12px_40px_rgba(0,0,0,0.4),0_0_0_1px_rgba(251,113,133,0.22),0_0_36px_rgba(251,113,133,0.24),inset_0_1px_0_rgba(254,205,211,0.07)] md:p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-rose-200">Missed missions</div>
              <DeckListToolbar
                tone="rose"
                search={mSearchM}
                onSearchChange={setMSearchM}
                sortLabel="Due"
                sortDir={mSortM}
                onSortDirToggle={() => setMSortM((d) => (d === "desc" ? "asc" : "desc"))}
                placeholder="Search missed…"
              />
              <div className={cn(DECK_LIST_INNER_BASE, SCROLL_ROSE)}>
                {filteredMissedMissions.length === 0 ? (
                  browseDate ? (
                    <DeckEmptyCta
                      message="No missed missions on this day."
                      actionLabel="Show all days"
                      onAction={() => setBrowseDate(null)}
                      accentClass="border-rose-500/35 bg-black/35"
                    />
                  ) : (
                    <DeckEmptyCta
                      message="No missed missions in the deck."
                      actionLabel="Create a mission"
                      onAction={focusMissionComposer}
                      accentClass="border-rose-500/35 bg-black/35"
                    />
                  )
                ) : (
                  filteredMissedMissions.map((m) => (
                    <DeckListItem
                      key={m.id}
                      tone="rose"
                      title={m.title}
                      badge={<MissionStatusBadge status="missed" />}
                      subtitle={
                        <>
                          <DueDateLine label="Was due" value={new Date(m.targetIso).toLocaleString()} />
                          <div className="mt-1">
                            <PriorityPoints points={m.points} tone="ice" />
                          </div>
                        </>
                      }
                      footer={
                        (!useApiDeck || canDeckWrite) && (
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              className={cn(
                                DECK_ROW_BTN_SECONDARY,
                                "border-white/22 bg-black/45 text-white/90 shadow-[0_2px_0_rgba(0,0,0,0.35)] hover:border-white/40 focus-visible:ring-white/35"
                              )}
                              onClick={() =>
                                setTimeEdit({
                                  kind: "mission",
                                  id: m.id,
                                  title: m.title,
                                  targetIso: m.targetIso
                                })
                              }
                            >
                              Edit time
                            </button>
                            <button
                              type="button"
                              className={cn(
                                DECK_ROW_BTN_PRIMARY,
                                "border-emerald-500/48 bg-emerald-950/45 text-emerald-50 shadow-[0_2px_0_rgba(0,0,0,0.35)] hover:border-emerald-300/75 focus-visible:ring-emerald-400/55"
                              )}
                              onClick={() => void patchMission(m.id, { status: "done" })}
                            >
                              Complete
                            </button>
                            <button
                              type="button"
                              className={cn(
                                DECK_ROW_BTN_SECONDARY,
                                "border-cyan-500/42 bg-black/45 text-cyan-100 shadow-[0_2px_0_rgba(0,0,0,0.35)] hover:border-cyan-300/65 hover:bg-cyan-950/35 focus-visible:ring-cyan-400/55"
                              )}
                              onClick={() => void patchMission(m.id, { status: "active" })}
                            >
                              Reactivate
                            </button>
                          </div>
                        )
                      }
                    />
                  ))
                )}
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* 2 — Reminders (full width, fuchsia ops deck) */}
        <div className={DECK_REMINDERS}>
          <DeckGlowReminders />
          <div className="relative z-[1]">
          <div className="text-[12px] font-black uppercase tracking-[0.2em] text-fuchsia-200 md:text-[13px] lg:text-[14px]">
            Reminders / schedules
          </div>
          <p className="mt-2 max-w-prose text-[15px] font-normal leading-relaxed text-neutral-200/90 md:leading-[1.55]">
            Schedule with date and time. Separate active and completed.
          </p>

          {useApiDeck && !canDeckWrite ? (
            <p className="mt-2 text-[12px] font-medium leading-snug text-amber-100/92">Read-only reminders for your role.</p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-fuchsia-500/35 bg-black/45 px-3 py-2.5 text-[11px] font-medium text-fuchsia-100/90 shadow-[inset_0_1px_0_rgba(233,213,255,0.06)]">
            <span className="font-black uppercase tracking-[0.14em] text-fuchsia-200/95">Due alarm sound</span>
            <label className="inline-flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-fuchsia-500/50 bg-black/60 text-fuchsia-500 focus:ring-fuchsia-400/50"
                checked={deckAlarmMutedUi}
                onChange={(e) => {
                  const muted = e.target.checked;
                  setDeckAlarmMuted(muted);
                  setDeckAlarmMutedUi(muted);
                }}
              />
              <span>Mute</span>
            </label>
            <input
              ref={deckAlarmFileInputRef}
              type="file"
              accept="audio/*"
              className="sr-only"
              aria-label="Upload custom alarm sound"
              onChange={onDeckAlarmFileChange}
            />
            <button
              type="button"
              className="rounded-md border border-fuchsia-500/45 bg-fuchsia-950/35 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-fuchsia-50 hover:border-fuchsia-300/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400/55"
              onClick={() => deckAlarmFileInputRef.current?.click()}
            >
              Upload tone
            </button>
            {deckAlarmHasCustomUi ? (
              <button
                type="button"
                className="rounded-md border border-white/18 bg-black/50 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-white/85 hover:border-white/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35"
                onClick={() => {
                  clearDeckAlarmCustom();
                  setDeckAlarmHasCustomUi(false);
                }}
              >
                Use default beep
              </button>
            ) : null}
            <button
              type="button"
              className="rounded-md border border-cyan-500/40 bg-black/45 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100 hover:border-cyan-300/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
              onClick={() => {
                void unlockDeckAlarmAudio();
                playDeckAlarmSound();
              }}
            >
              Test
            </button>
            <span className="w-full text-[10px] font-normal leading-snug text-neutral-400/95 sm:w-auto">
              Default: HUD beep. Browsers may require a click or keypress on the page before due alarms can play.
            </span>
          </div>

          <div id="deck-reminder-compose" className={FORM_REMINDERS}>
            <div>
              <label className={remindersLabel}>Reminder title</label>
              <input
                ref={reminderTitleInputRef}
                className={remindersInput}
                value={rTitle}
                onChange={(e) => setRTitle(e.target.value)}
                placeholder="e.g. Call mentor"
                disabled={useApiDeck && !canDeckWrite}
              />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <DeckDateField
                id="reminder-date"
                label="Date"
                labelClassName={remindersLabel}
                value={rDate}
                onValueChange={setRDate}
                disabled={useApiDeck && !canDeckWrite}
                tone="fuchsia"
              />
              <DeckTimeField
                id="reminder-time"
                label="Time"
                labelClassName={remindersLabel}
                value={rTime}
                onValueChange={setRTime}
                disabled={useApiDeck && !canDeckWrite}
                tone="fuchsia"
              />
            </div>
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => void addReminder()}
              disabled={useApiDeck && !canDeckWrite}
              className="w-full rounded-lg border border-fuchsia-400/58 bg-fuchsia-950/38 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-fuchsia-50 shadow-[0_4px_0_rgba(0,0,0,0.42),0_0_0_1px_rgba(192,132,252,0.3),0_8px_32px_rgba(168,85,247,0.32),inset_0_1px_0_rgba(233,213,255,0.1)] hover:border-fuchsia-300/78 hover:bg-fuchsia-950/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505] disabled:cursor-not-allowed disabled:opacity-40 md:min-h-[48px] md:text-[12px]"
            >
              Create reminder
            </motion.button>
          </div>

          <div className="mt-5 grid w-full min-w-0 grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
            <div className="min-w-0 rounded-xl border border-cyan-400/48 bg-gradient-to-b from-cyan-950/40 to-black/58 p-3 shadow-[0_12px_40px_rgba(0,0,0,0.4),0_0_0_1px_rgba(34,211,238,0.22),0_0_34px_rgba(34,211,238,0.22),inset_0_1px_0_rgba(165,243,252,0.08)] md:p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">
                Active reminders
              </div>
              <DeckListToolbar
                tone="cyan"
                search={rSearchAct}
                onSearchChange={setRSearchAct}
                sortLabel="When"
                sortDir={rSortAct}
                onSortDirToggle={() => setRSortAct((d) => (d === "desc" ? "asc" : "desc"))}
                placeholder="Search active…"
              />
              <div className={cn(DECK_LIST_INNER_BASE, SCROLL_CYAN)}>
                {filteredActiveReminders.length === 0 ? (
                  browseDate ? (
                    <DeckEmptyCta
                      message="No active reminders on this day."
                      actionLabel="Show all days"
                      onAction={() => setBrowseDate(null)}
                      accentClass="border-cyan-500/35 bg-black/35"
                    />
                  ) : (
                    <DeckEmptyCta
                      message="No reminders scheduled yet."
                      actionLabel="Create a reminder"
                      onAction={focusReminderComposer}
                      accentClass="border-cyan-500/35 bg-black/35"
                    />
                  )
                ) : (
                  filteredActiveReminders.map((r) => {
                    const timePart = r.time.length === 5 ? `${r.time}:00` : r.time;
                    const whenMs = new Date(`${r.date}T${timePart}`).getTime();
                    const now = Date.now();
                    const isDue = Number.isFinite(whenMs) && whenMs <= now;
                    const urgent =
                      Number.isFinite(whenMs) && whenMs > now && whenMs - now < 864e5;
                    return (
                      <DeckListItem
                        key={r.id}
                        tone="cyan"
                        className={
                          isDue
                            ? "shadow-[0_0_0_1px_rgba(239,68,68,0.5),0_0_28px_rgba(239,68,68,0.22)]"
                            : undefined
                        }
                        title={r.title}
                        badge={<ReminderStatusBadge status="active" />}
                        subtitle={
                          <>
                            {isDue ? (
                              <div
                                className="mb-1.5 flex items-center gap-1.5 rounded-md border border-red-500/55 bg-red-950/45 px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-red-100"
                                role="status"
                              >
                                <span className="deck-alarm-bell inline-block" aria-hidden>
                                  🔔
                                </span>
                                Reminder due — snooze, edit time, or complete
                              </div>
                            ) : null}
                            <DueDateLine
                              label="When"
                              value={`${r.date} · ${formatReminderTimeDisplay(r.time)}`}
                              urgent={urgent}
                            />
                          </>
                        }
                        footer={
                          canEditReminders && (
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                className={cn(
                                  DECK_ROW_BTN_SECONDARY,
                                  "border-white/22 bg-black/45 text-white/90 shadow-[0_2px_0_rgba(0,0,0,0.35)] hover:border-white/40 focus-visible:ring-white/35"
                                )}
                                onClick={() => {
                                  if (reminderNavSlotTargetIdRef.current === r.id) {
                                    reminderUserAcknowledgedRef.current = true;
                                    clearReminderNavAutoTimeout();
                                  }
                                  setTimeEdit({
                                    kind: "reminder",
                                    id: r.id,
                                    title: r.title,
                                    date: r.date,
                                    time: r.time
                                  });
                                }}
                              >
                                Edit time
                              </button>
                              {isDue ? (
                                <button
                                  type="button"
                                  className={cn(
                                    DECK_ROW_BTN_SECONDARY,
                                    "border-red-500/48 bg-red-950/35 text-red-50 shadow-[0_2px_0_rgba(0,0,0,0.35)] hover:border-red-300/75 focus-visible:ring-red-400/55"
                                  )}
                                  onClick={() => void snoozeReminder10Min(r)}
                                >
                                  Snooze 10 min
                                </button>
                              ) : null}
                              <button
                                type="button"
                                className={cn(
                                  DECK_ROW_BTN_PRIMARY,
                                  "border-cyan-500/48 bg-cyan-950/45 text-cyan-50 shadow-[0_2px_0_rgba(0,0,0,0.35)] hover:border-cyan-300/75 hover:bg-cyan-950/55 focus-visible:ring-cyan-400/55"
                                )}
                                onClick={() => {
                                  clearReminderToastKeysForId(r.id);
                                  void patchReminder(r.id, { status: "completed" });
                                }}
                              >
                                Mark completed
                              </button>
                            </div>
                          )
                        }
                      />
                    );
                  })
                )}
              </div>
            </div>
            <div className="min-w-0 rounded-xl border border-fuchsia-400/45 bg-gradient-to-b from-fuchsia-950/36 to-black/58 p-3 shadow-[0_12px_40px_rgba(0,0,0,0.4),0_0_0_1px_rgba(192,132,252,0.24),0_0_34px_rgba(168,85,247,0.26),inset_0_1px_0_rgba(233,213,255,0.07)] md:p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-200 md:text-[11px]">
                Completed reminders
              </div>
              <DeckListToolbar
                tone="fuchsia"
                search={rSearchDone}
                onSearchChange={setRSearchDone}
                sortLabel="When"
                sortDir={rSortDone}
                onSortDirToggle={() => setRSortDone((d) => (d === "desc" ? "asc" : "desc"))}
                placeholder="Search completed…"
              />
              <div className={cn(DECK_LIST_INNER_BASE, SCROLL_FUCHSIA)}>
                {filteredDoneReminders.length === 0 ? (
                  browseDate ? (
                    <DeckEmptyCta
                      message="No completed reminders on this day."
                      actionLabel="Show all days"
                      onAction={() => setBrowseDate(null)}
                      accentClass="border-fuchsia-500/35 bg-black/35"
                    />
                  ) : (
                    <DeckEmptyCta
                      message="No completed reminders yet."
                      actionLabel="Create a reminder"
                      onAction={focusReminderComposer}
                      accentClass="border-fuchsia-500/35 bg-black/35"
                    />
                  )
                ) : (
                  filteredDoneReminders.map((r) => (
                    <DeckListItem
                      key={r.id}
                      tone="fuchsia"
                      title={r.title}
                      dimmed
                      badge={<ReminderStatusBadge status="completed" />}
                      subtitle={
                        <DueDateLine label="Was" value={`${r.date} ${r.time}`} />
                      }
                    />
                  ))
                )}
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* 3 — Notes (full width, ledger gold deck) */}
        <div className={DECK_NOTES}>
          <DeckGlowNotes />
          <div className="relative z-[1]">
          <div className="text-[12px] font-black uppercase tracking-[0.2em] text-[color:var(--gold)] md:text-[13px] lg:text-[14px]">
            Notes
          </div>
          <p className="mt-2 max-w-prose text-[15px] font-normal leading-relaxed text-neutral-200/90 md:leading-[1.55]">
            Capture intel below, then open it from the library—title stays in the list so the reader stays clean.
          </p>

          {useApiDeck && !canDeckWrite ? (
            <p className="mt-2 text-[12px] font-medium leading-snug text-amber-100/92">Read-only notes for your role.</p>
          ) : null}

          <div id="deck-note-compose" className={FORM_NOTES}>
            <div>
              <label className={notesLabel}>Note title</label>
              <input
                ref={noteTitleInputRef}
                className={notesInput}
                value={nTitle}
                onChange={(e) => setNTitle(e.target.value)}
                placeholder="Short label"
                disabled={useApiDeck && !canDeckWrite}
              />
            </div>
            <div>
              <label className={notesLabel}>Note body</label>
              <textarea
                className={cn(notesInput, "min-h-[72px] resize-y")}
                value={nBody}
                onChange={(e) => setNBody(e.target.value)}
                placeholder="Intel, ideas, links…"
                disabled={useApiDeck && !canDeckWrite}
              />
            </div>
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => void addNote()}
              disabled={useApiDeck && !canDeckWrite}
              className="w-full rounded-lg border-[rgba(255,215,0,0.58)] bg-[rgba(255,215,0,0.12)] py-3 text-[11px] font-black uppercase tracking-[0.16em] text-[color:var(--gold)] shadow-[0_4px_0_rgba(0,0,0,0.42),0_0_0_1px_rgba(255,215,0,0.26),0_8px_32px_rgba(255,200,0,0.2),inset_0_1px_0_rgba(255,248,220,0.1)] hover:border-[rgba(255,235,160,0.78)] hover:bg-[rgba(255,215,0,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(250,204,21,0.55)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505] disabled:cursor-not-allowed disabled:opacity-40 md:min-h-[48px] md:text-[12px]"
            >
              Save note
            </motion.button>
          </div>

          <div className="mt-5 w-full min-w-0">
            <DeckListToolbar
              tone="gold"
              search={nSearch}
              onSearchChange={setNSearch}
              sortLabel="Created"
              sortDir={nSort}
              onSortDirToggle={() => setNSort((d) => (d === "desc" ? "asc" : "desc"))}
              placeholder="Search notes…"
            />

            {/* Single merged library + reader (no duplicate title in preview) */}
            <div
              className={cn(
                "mt-3 grid min-h-[min(52vh,420px)] w-full min-w-0 overflow-hidden rounded-xl border-[rgba(255,215,0,0.48)] bg-gradient-to-br from-black/80 via-[#070604]/95 to-black/90 shadow-[0_0_0_1px_rgba(255,215,0,0.18),0_0_40px_rgba(255,200,0,0.14),0_0_80px_rgba(255,180,0,0.06),inset_0_1px_0_rgba(255,235,160,0.06)]",
                "grid-cols-1 lg:grid-cols-[minmax(240px,34%)_1fr] lg:min-h-[min(44vh,480px)]"
              )}
              role="region"
              aria-label="Note library and reader"
            >
              {/* Library column */}
              <div className="flex min-h-0 min-w-0 flex-col border-b border-[rgba(255,215,0,0.22)] lg:border-b-0 lg:border-r">
                <div className="shrink-0 border-b border-[rgba(255,215,0,0.18)] bg-black/35 px-3 py-2.5 md:px-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--gold)]/90">
                    Note library
                  </div>
                  <p className="mt-0.5 text-[12px] font-normal leading-snug text-neutral-300/88">
                    Tap a row—the reader shows body only, no repeated heading.
                  </p>
                </div>
                <div
                  role="listbox"
                  aria-label="Saved notes"
                  className={cn(
                    "flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto p-2.5 md:p-3",
                    SCROLL_GOLD
                  )}
                >
                  {optionNotes.length === 0 ? (
                    browseDate ? (
                      <DeckEmptyCta
                        message="No notes created on this day."
                        actionLabel="Show all days"
                        onAction={() => setBrowseDate(null)}
                        accentClass="border-[rgba(255,215,0,0.28)] bg-black/30"
                      />
                    ) : nSearch.trim() ? (
                      <div className="rounded-lg border border-dashed border-[rgba(255,215,0,0.28)] bg-black/35 px-4 py-8 text-center text-[14px] font-medium leading-relaxed text-neutral-200/88">
                        No notes match this search.
                        <button
                          type="button"
                          onClick={() => setNSearch("")}
                          className="mt-4 inline-flex min-h-[44px] w-full max-w-[14rem] items-center justify-center rounded-lg border border-white/18 bg-black/45 text-[11px] font-black uppercase tracking-[0.16em] text-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(250,204,21,0.5)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]"
                        >
                          Clear search
                        </button>
                      </div>
                    ) : (
                      <DeckEmptyCta
                        message="No notes saved yet."
                        actionLabel="Write a note"
                        onAction={focusNoteComposer}
                        accentClass="border-[rgba(255,215,0,0.28)] bg-black/35"
                      />
                    )
                  ) : (
                    optionNotes.map((n) => {
                      const active = selectedNote?.id === n.id;
                      return (
                        <button
                          key={n.id}
                          type="button"
                          role="option"
                          aria-selected={active}
                          title={n.title}
                          onClick={() => setSelectedNoteId(n.id)}
                          className={cn(
                            "min-h-[44px] w-full rounded-lg border px-3 py-2.5 text-left motion-safe:transition-[box-shadow,border-color,background-color,transform] motion-safe:duration-200 motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(250,204,21,0.45)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]",
                            active
                              ? "border-sky-400/55 bg-gradient-to-r from-sky-500/20 via-sky-500/12 to-transparent shadow-[inset_0_0_0_1px_rgba(56,189,248,0.35),0_0_24px_rgba(56,189,248,0.25),0_0_48px_rgba(14,165,233,0.12)]"
                              : "border-[rgba(255,215,0,0.14)] bg-black/30 motion-safe:hover:-translate-y-px hover:border-[rgba(255,235,160,0.35)] hover:bg-black/45 hover:shadow-[0_0_18px_rgba(255,200,0,0.1)]"
                          )}
                        >
                          <div className="line-clamp-2 text-[14px] font-bold leading-snug text-neutral-50">{n.title}</div>
                          <div className="mt-1 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-400/90">
                            {new Date(n.createdAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric"
                            })}
                          </div>
                        </button>
                      );
                    })
                  )}
                  {notesRemaining > 0 && !notesExpanded ? (
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setNotesExpanded(true)}
                      className="mt-1 min-h-[44px] w-full rounded-lg border-[rgba(255,215,0,0.42)] bg-black/5 py-2.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[color:var(--gold)]/92 shadow-[0_0_14px_rgba(255,200,0,0.12)] hover:border-[rgba(255,235,160,0.65)] hover:shadow-[0_0_22px_rgba(255,215,0,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(250,204,21,0.5)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]"
                    >
                      Load more ({notesRemaining})
                    </motion.button>
                  ) : null}
                  {notesExpanded && filteredNotes.length > 5 ? (
                    <button
                      type="button"
                      className="w-full py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[rgba(255,230,180,0.5)] underline hover:text-[color:var(--gold)]/85"
                      onClick={() => setNotesExpanded(false)}
                    >
                      Collapse to recent five
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Reader column — body & meta only */}
              <div className="flex min-h-0 min-w-0 flex-col bg-black/25 lg:bg-black/20">
                <div className="shrink-0 border-b border-[rgba(255,215,0,0.15)] px-4 py-2.5 md:px-5">
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--gold)]/75">
                    Reader
                  </div>
                </div>
                <div
                  className={cn(
                    "min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-5",
                    SCROLL_GOLD
                  )}
                >
                  {selectedNote ? (
                    <div className="flex min-h-[12rem] flex-col pb-2">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[rgba(255,215,0,0.12)] pb-3 font-mono text-[12px] text-neutral-300/88">
                        <span className="font-semibold text-[color:var(--gold)]/88">
                          {new Date(selectedNote.createdAt).toLocaleString()}
                        </span>
                        {selectedNote.body?.trim() ? (
                          <span className="text-neutral-400/90">{selectedNote.body.trim().length} chars</span>
                        ) : null}
                      </div>
                      <div className="mt-4 whitespace-pre-wrap text-[15px] font-normal leading-[1.65] text-neutral-100/92 md:text-[16px] md:leading-relaxed">
                        {selectedNote.body?.trim()
                          ? selectedNote.body
                          : "No body on this note—titles live in the library list so this space stays for long-form intel."}
                      </div>
                    </div>
                  ) : (
                    <div className="flex min-h-[12rem] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[rgba(255,215,0,0.2)] bg-black/20 px-4 py-10 text-center">
                      <p className="text-[14px] font-medium text-neutral-200/88">Nothing selected</p>
                      <p className="max-w-sm text-[13px] font-normal leading-relaxed text-neutral-400/88">
                        Choose a note in the library, or create one with the form above.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* 4 — Quick access: full width & height below notes */}
        <section
          aria-label="Quick access tools"
          className="relative w-full min-w-0 flex-1 scroll-mt-4"
        >
          <div
            className={cn(
              DECK_QUICK_WRAP,
              "relative flex w-full min-h-[min(52vh,640px)] min-w-0 flex-col sm:min-h-[min(48vh,560px)]"
            )}
          >
            <DeckQuarterGlow />
            <div className="relative z-[1] flex min-h-0 w-full flex-1 flex-col">
              <QuickAccessGrid siteName="The Syndicate" variant="fullWidth" />
            </div>
          </div>
        </section>
      </div>

      {timeEdit ? (
        <div
          className="fixed inset-0 z-[200] flex items-end justify-center p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="deck-time-edit-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/75 backdrop-blur-[2px]"
            aria-label="Close"
            onClick={() => setTimeEdit(null)}
          />
          <div className="relative z-[1] w-full max-w-md rounded-xl border border-red-500/45 bg-[#0a0606] p-4 shadow-[0_0_0_1px_rgba(239,68,68,0.2),0_24px_64px_rgba(0,0,0,0.65)]">
            <h2 id="deck-time-edit-title" className="text-[12px] font-black uppercase tracking-[0.2em] text-red-200/95">
              Edit time
            </h2>
            <p className="mt-1 truncate text-[14px] font-semibold text-white/92" title={timeEdit.title}>
              {timeEdit.title}
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DeckDateField
                id="deck-time-edit-date"
                label="Date"
                labelClassName="text-[11px] font-extrabold uppercase tracking-[0.14em] text-neutral-300"
                value={timeEditDate}
                onValueChange={setTimeEditDate}
                disabled={false}
                tone={timeEdit.kind === "mission" ? "cyan" : "fuchsia"}
              />
              <DeckTimeField
                id="deck-time-edit-time"
                label="Time"
                labelClassName="text-[11px] font-extrabold uppercase tracking-[0.14em] text-neutral-300"
                value={timeEditTime}
                onValueChange={setTimeEditTime}
                disabled={false}
                tone={timeEdit.kind === "mission" ? "cyan" : "fuchsia"}
              />
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className={cn(
                  DECK_ROW_BTN_SECONDARY,
                  "border-white/22 bg-black/50 text-white/90 hover:border-white/38 focus-visible:ring-white/35"
                )}
                onClick={() => setTimeEdit(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={cn(
                  DECK_ROW_BTN_PRIMARY,
                  "border-red-500/55 bg-red-950/45 text-red-50 hover:border-red-300/75 focus-visible:ring-red-400/55"
                )}
                disabled={!timeEditDate?.trim() || !timeEditTime?.trim() || !localDateAndTimeToIso(timeEditDate, timeEditTime)}
                onClick={() => void saveTimeEdit()}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
