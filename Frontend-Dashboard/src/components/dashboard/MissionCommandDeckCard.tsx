"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { SocialLinkAccent, SocialLinkItem } from "@/data/socialLinks";
import { DEFAULT_SOCIAL_LINKS } from "@/data/socialLinks";
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
import { Card, cn, ProgressBar, type ThemeMode } from "./dashboardPrimitives";
import type { GoalsSnapshot } from "./types";
import { faviconUrlFromHref } from "@/lib/socialBranding";

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
  points: number;
  status: "active" | "completed";
};

type NoteRow = {
  id: string;
  title: string;
  body: string;
  createdAt: number;
};

type ApiMission = { id: number; title: string; target_at: string; points: number; status: string };
type ApiReminder = { id: number; title: string; date: string; time: string; points: number; status: string };
type ApiNote = { id: number; title: string; body: string; created_at: string };
type ApiSocial = { id: number; platform: string; url: string; label: string; is_active: boolean };

const SOCIAL_PLATFORM_OPTIONS: { value: string; label: string }[] = [
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "x", label: "X (Twitter)" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "youtube", label: "YouTube" },
  { value: "tiktok", label: "TikTok" },
  { value: "discord", label: "Discord" },
  { value: "website", label: "Website" },
  { value: "calendar", label: "Calendar" },
  { value: "email", label: "Email" },
  { value: "other", label: "Other" }
];

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

function socialAccentStyle(accent: SocialLinkItem["accent"]) {
  switch (accent) {
    case "ice":
      return { border: "rgba(0,255,255,0.45)", glow: "rgba(0,255,255,0.2)", text: "#d7ffff" };
    case "green":
      return { border: "rgba(0,255,122,0.45)", glow: "rgba(0,255,122,0.2)", text: "#b4ffd8" };
    case "violet":
      return { border: "rgba(196,126,255,0.5)", glow: "rgba(196,126,255,0.22)", text: "#ead6ff" };
    default:
      return { border: "rgba(255,215,0,0.5)", glow: "rgba(255,215,0,0.22)", text: "#ffe7a1" };
  }
}

function platformToAccent(platform: string): SocialLinkAccent {
  switch (platform) {
    case "facebook":
    case "linkedin":
    case "discord":
      return "ice";
    case "instagram":
    case "tiktok":
      return "violet";
    case "youtube":
      return "green";
    case "x":
      return "gold";
    default:
      return "gold";
  }
}

function apiSocialToItem(s: ApiSocial): SocialLinkItem {
  return {
    id: String(s.id),
    label: (s.label || s.platform).trim() || s.platform,
    href: s.url,
    accent: platformToAccent(s.platform)
  };
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
    points: r.points,
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

/** Inner panels: same gold / #060606 language as sidebar & top bar */
const DECK_QUARTER =
  "relative overflow-hidden rounded-xl border border-[rgba(197,179,88,0.26)] bg-[#060606]/78 p-5 shadow-[0_0_0_1px_rgba(197,179,88,0.08),0_0_52px_rgba(197,179,88,0.08),inset_0_1px_0_rgba(197,179,88,0.08)] md:p-6 lg:p-8 xl:p-9";

function DeckQuarterGlow() {
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-90 [background:radial-gradient(720px_320px_at_20%_0%,rgba(197,179,88,0.11),rgba(0,0,0,0)_60%)]"
      aria-hidden
    />
  );
}

const DECK_LIST_SCROLL =
  "mt-3 min-h-[min(36vh,320px)] max-h-[min(72vh,820px)] space-y-2.5 overflow-y-auto overflow-x-hidden py-1 pr-1.5 [scrollbar-color:rgba(197,179,88,0.5)_rgba(0,0,0,0.35)]";

/** Sub-panels inside missions/reminders (active/missed lists) */
const DECK_LIST_INNER =
  "mt-2 min-h-[min(34vh,280px)] max-h-[min(68vh,720px)] space-y-2.5 overflow-y-auto overflow-x-hidden py-1 pr-1.5 [scrollbar-color:rgba(197,179,88,0.5)_rgba(0,0,0,0.35)]";

const DECK_FORM_SHELL =
  "mt-4 space-y-3 rounded-xl border border-[rgba(197,179,88,0.22)] bg-black/38 p-3.5 shadow-[inset_0_1px_0_rgba(197,179,88,0.06)] md:mt-5 md:p-4 lg:p-5";

function GoalsMilestonesRail({ goals, hydrated }: { goals: GoalsSnapshot; hydrated: boolean }) {
  if (!hydrated) {
    return (
      <div
        className="mb-6 rounded-xl border border-[rgba(197,179,88,0.26)] bg-[#060606]/80 p-6 shadow-[0_0_0_1px_rgba(197,179,88,0.08),0_0_56px_rgba(197,179,88,0.08),inset_0_1px_0_rgba(197,179,88,0.08)] md:mb-7 md:p-7 lg:p-8"
        aria-busy="true"
        aria-label="Loading goals"
      >
        <div className="h-4 w-48 max-w-[60%] animate-pulse rounded-md bg-[rgba(197,179,88,0.14)]" />
        <p className="mt-3 h-4 w-full max-w-md animate-pulse rounded bg-[rgba(197,179,88,0.08)]" />
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[5rem] animate-pulse rounded-lg bg-[rgba(197,179,88,0.07)]" />
          ))}
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg bg-[rgba(197,179,88,0.06)]" />
          ))}
        </div>
      </div>
    );
  }

  const metrics: { label: string; pct: number; tone: "neonGreen" | "ember" }[] = [
    { label: `Rank · ${goals.rankGoalLabel}`, pct: goals.rankProgressPct, tone: "neonGreen" },
    { label: "Program completion", pct: goals.completionGoalPct, tone: "ember" },
    { label: "Earnings target", pct: goals.earningsGoalPct, tone: "ember" },
    { label: "Integrity load", pct: goals.integrityGoalPct, tone: "ember" }
  ];

  return (
    <div className="relative mb-6 overflow-hidden rounded-xl border border-[rgba(197,179,88,0.26)] bg-[#060606]/80 p-6 shadow-[0_0_0_1px_rgba(197,179,88,0.08),0_0_56px_rgba(197,179,88,0.08),inset_0_1px_0_rgba(197,179,88,0.08)] md:mb-7 md:p-7 lg:p-8">
      <DeckQuarterGlow />
      <div className="relative z-[1]">
        <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[12px] font-black uppercase tracking-[0.22em] text-[color:var(--gold)] md:text-[13px]">Goals snapshot</div>
          <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-white/65 md:text-[14px] md:leading-relaxed">
            Rank and pipeline targets aligned with the command shell. Milestones show{" "}
            <span className="font-semibold text-[#7dff5c]">neon green</span> when secured and{" "}
            <span className="font-semibold text-[#ff7a7a]">neon red</span> while still open.
          </p>
        </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-lg border border-[rgba(197,179,88,0.22)] bg-black/40 p-4 shadow-[inset_0_1px_0_rgba(197,179,88,0.05)] md:p-4"
          >
            <div className="text-[14px] font-semibold leading-snug text-white/90 md:text-[15px]">{m.label}</div>
            <div className="mt-3">
              <ProgressBar pct={m.pct} tone={m.tone} />
            </div>
            <div className="mt-2 font-mono text-[13px] font-bold tabular-nums text-white/55">{Math.round(m.pct)}%</div>
          </div>
        ))}
        </div>

        {goals.milestones.length > 0 ? (
        <div className="mt-6 border-t border-[rgba(197,179,88,0.2)] pt-5">
          <div className="text-[11px] font-black uppercase tracking-[0.2em] text-[color:var(--gold)] md:text-[12px]">Milestone ledger</div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {goals.milestones.map((ms) => (
              <div
                key={ms.label}
                className={cn(
                  "rounded-lg border px-4 py-4 transition-shadow md:px-5 md:py-4",
                  ms.reached
                    ? "border-[#39ff14]/45 bg-[#081208]/90 shadow-[0_0_22px_rgba(57,255,20,0.14)]"
                    : "border-[#ff3838]/42 bg-[#160808]/90 shadow-[0_0_18px_rgba(255,56,56,0.12)]"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[15px] font-bold leading-snug text-white/92 md:text-[16px]">{ms.label}</span>
                  <span
                    className={cn(
                      "shrink-0 rounded border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em]",
                      ms.reached
                        ? "border-[#39ff14]/40 text-[#9dff7a]"
                        : "border-[#ff4d4d]/40 text-[#ff9d9d]"
                    )}
                  >
                    {ms.reached ? "Secured" : "Open"}
                  </span>
                </div>
                <div className="mt-2.5">
                  <ProgressBar pct={ms.reached ? 100 : ms.pct} tone={ms.reached ? "neonGreen" : "danger"} />
                </div>
              </div>
            ))}
          </div>
        </div>
        ) : null}
      </div>
    </div>
  );
}

function SocialQuickLinkTile({ link }: { link: SocialLinkItem }) {
  const a = socialAccentStyle(link.accent);
  const [iconOk, setIconOk] = useState(true);
  const fav = faviconUrlFromHref(link.href);

  return (
    <motion.a
      href={link.href}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      className="group flex min-h-[5.5rem] flex-col justify-between rounded-xl border bg-gradient-to-b from-[#101010]/95 to-[#060606]/98 px-3.5 py-3 text-left outline-none transition-[filter,box-shadow] hover:brightness-[1.05] focus-visible:ring-2 focus-visible:ring-[rgba(197,179,88,0.35)] md:min-h-[5.75rem]"
      style={{
        borderColor: a.border,
        boxShadow: `0 0 0 1px ${a.glow}, 0 0 28px rgba(197,179,88,0.06), inset 0 1px 0 rgba(197,179,88,0.05)`
      }}
    >
      <div className="flex items-start gap-2.5">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[rgba(197,179,88,0.2)] bg-black/50 md:h-11 md:w-11">
          {fav && iconOk ? (
            <img
              src={fav}
              alt=""
              width={24}
              height={24}
              className="h-6 w-6 object-contain opacity-95 group-hover:opacity-100"
              loading="lazy"
              onError={() => setIconOk(false)}
            />
          ) : (
            <span className="text-[15px] font-black text-[#8a7a6a]" aria-hidden>
              {link.label.slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <span className="block text-[12px] font-black uppercase tracking-[0.1em] leading-tight" style={{ color: a.text }}>
            {link.label}
          </span>
          <span className="mt-1 block truncate font-mono text-[10px] leading-tight text-[#9d8e7c]">
            {link.href.replace(/^https?:\/\//, "")}
          </span>
        </div>
      </div>
    </motion.a>
  );
}

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

export function MissionCommandDeckCard({
  themeMode,
  goals,
  goalsHydrated
}: {
  themeMode: ThemeMode;
  goals: GoalsSnapshot;
  goalsHydrated: boolean;
}) {
  const { user, loading: authLoading, can } = useAuth();

  const useApiDeck =
    !authLoading && !!user && (can("deck.view") || can("deck.manage") || can("*"));
  const canDeckWrite = can("deck.manage") || can("*");
  const canSocialRead =
    can("social.links.view") || can("social.links.manage") || can("social.links.manage_all") || can("*");
  const canSocialWrite = can("social.links.manage") || can("social.links.manage_all") || can("*");

  const [missions, setMissions] = useState<MissionRow[]>([]);
  const [reminders, setReminders] = useState<ReminderRow[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [socialLinks, setSocialLinks] = useState<SocialLinkItem[]>(DEFAULT_SOCIAL_LINKS);
  const [rawSocial, setRawSocial] = useState<ApiSocial[]>([]);
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
  const [mTarget, setMTarget] = useState("");
  const [mPoints, setMPoints] = useState(10);

  const [rTitle, setRTitle] = useState("");
  const [rDate, setRDate] = useState("");
  const [rTime, setRTime] = useState("");
  const [rPoints, setRPoints] = useState(5);

  const [nTitle, setNTitle] = useState("");
  const [nBody, setNBody] = useState("");

  const [sPlatform, setSPlatform] = useState("website");
  const [sUrl, setSUrl] = useState("https://");
  const [sLabel, setSLabel] = useState("");
  const [sActive, setSActive] = useState(true);

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
      setMissions(mList.map(mapMission));

      const rList = (rRes.ok && Array.isArray(rRes.data) ? rRes.data : []) as ApiReminder[];
      setReminders(rList.map(mapReminder));

      const nList = (nRes.ok && Array.isArray(nRes.data) ? nRes.data : []) as ApiNote[];
      setNotes(nList.map(mapNote).sort((a, b) => b.createdAt - a.createdAt));

      if (canSocialRead) {
        const sRes = await portalFetch<unknown>(`/api/portal/social-links/`);
        if (sRes.ok && Array.isArray(sRes.data)) {
          const all = sRes.data as ApiSocial[];
          setRawSocial(all);
          setSocialLinks(
            all.filter((s) => s.is_active).map(apiSocialToItem)
          );
        }
      } else {
        setRawSocial([]);
        setSocialLinks(DEFAULT_SOCIAL_LINKS);
      }
    } catch (e) {
      setPortalError(e instanceof Error ? e.message : "Portal sync failed");
    } finally {
      setPortalBusy(false);
    }
  }, [user, useApiDeck, canDeckWrite, canSocialRead]);

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
    setSocialLinks(DEFAULT_SOCIAL_LINKS);
  }, []);

  useEffect(() => {
    if (useApiDeck) {
      void refreshPortal();
    } else if (!authLoading) {
      hydrateLocal();
    }
  }, [useApiDeck, authLoading, refreshPortal, hydrateLocal]);

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

  const missionBuckets = useMemo(() => bucketMissions(missions), [missions]);
  const activeMissions = missionBuckets.active;
  const missedMissions = missionBuckets.missed;

  const sortByTarget = (a: MissionRow, b: MissionRow, dir: DeckSortDir) => {
    const da = new Date(a.targetIso).getTime();
    const db = new Date(b.targetIso).getTime();
    return dir === "desc" ? db - da : da - db;
  };

  const filteredActiveMissions = useMemo(() => {
    const rows = filterBySearch(activeMissions, (r) => `${r.title} ${r.targetIso}`, mSearchA);
    return [...rows].sort((a, b) => sortByTarget(a, b, mSortA));
  }, [activeMissions, mSearchA, mSortA]);

  const filteredMissedMissions = useMemo(() => {
    const rows = filterBySearch(missedMissions, (r) => `${r.title} ${r.targetIso}`, mSearchM);
    return [...rows].sort((a, b) => sortByTarget(a, b, mSortM));
  }, [missedMissions, mSearchM, mSortM]);

  const activeReminders = useMemo(() => reminders.filter((r) => r.status === "active"), [reminders]);
  const doneReminders = useMemo(() => reminders.filter((r) => r.status === "completed"), [reminders]);

  const reminderSortKey = (r: ReminderRow) => `${r.date}T${r.time.length === 5 ? r.time + ":00" : r.time}`;

  const filteredActiveReminders = useMemo(() => {
    const rows = filterBySearch(activeReminders, (r) => `${r.title} ${r.date} ${r.time}`, rSearchAct);
    return [...rows].sort((a, b) => {
      const cmp = reminderSortKey(a).localeCompare(reminderSortKey(b));
      return rSortAct === "desc" ? -cmp : cmp;
    });
  }, [activeReminders, rSearchAct, rSortAct]);

  const filteredDoneReminders = useMemo(() => {
    const rows = filterBySearch(doneReminders, (r) => `${r.title} ${r.date} ${r.time}`, rSearchDone);
    return [...rows].sort((a, b) => {
      const cmp = reminderSortKey(a).localeCompare(reminderSortKey(b));
      return rSortDone === "desc" ? -cmp : cmp;
    });
  }, [doneReminders, rSearchDone, rSortDone]);

  const filteredNotes = useMemo(() => {
    const rows = filterBySearch(notes, (n) => `${n.title} ${n.body}`, nSearch);
    return [...rows].sort((a, b) => {
      const cmp = a.createdAt - b.createdAt;
      return nSort === "desc" ? -cmp : cmp;
    });
  }, [notes, nSearch, nSort]);

  const optionNotes = notesExpanded ? filteredNotes : filteredNotes.slice(0, 5);
  const notesRemaining = Math.max(0, filteredNotes.length - 5);

  const selectedNote =
    filteredNotes.find((n) => n.id === selectedNoteId) ?? optionNotes[0] ?? null;

  const addMission = async () => {
    const title = mTitle.trim();
    if (!title || !mTarget) return;
    if (useApiDeck && canDeckWrite) {
      const res = await portalFetch(`/api/portal/missions/`, {
        method: "POST",
        body: JSON.stringify({
          title,
          target_at: new Date(mTarget).toISOString(),
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
        targetIso: new Date(mTarget).toISOString(),
        points: Math.max(0, Math.min(9999, Math.floor(mPoints))),
        status: "active"
      };
      persistMissions([row, ...missions]);
    }
    setMTitle("");
    setMTarget("");
    setMPoints(10);
  };

  const patchMission = async (id: string, status: MissionRow["status"]) => {
    if (useApiDeck && canDeckWrite) {
      const res = await portalFetch(`/api/portal/missions/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      if (!res.ok) setPortalError("Could not update mission");
      await refreshPortal();
    } else {
      persistMissions(missions.map((x) => (x.id === id ? { ...x, status } : x)));
    }
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
          points: Math.max(0, Math.min(9999, Math.floor(rPoints))),
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
        points: Math.max(0, Math.min(9999, Math.floor(rPoints))),
        status: "active"
      };
      persistReminders([row, ...reminders]);
    }
    setRTitle("");
    setRDate("");
    setRTime("");
    setRPoints(5);
  };

  const patchReminder = async (id: string, status: ReminderRow["status"]) => {
    if (useApiDeck && canDeckWrite) {
      const res = await portalFetch(`/api/portal/reminders/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      if (!res.ok) setPortalError("Could not update reminder");
      await refreshPortal();
    } else {
      persistReminders(reminders.map((x) => (x.id === id ? { ...x, status } : x)));
    }
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

  const addSocialLink = async () => {
    if (!canSocialWrite || !useApiDeck) return;
    const url = sUrl.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      setPortalError("Social URL must start with http:// or https://");
      return;
    }
    const res = await portalFetch(`/api/portal/social-links/`, {
      method: "POST",
      body: JSON.stringify({
        platform: sPlatform,
        url,
        label: sLabel.trim(),
        is_active: sActive
      })
    });
    if (!res.ok) setPortalError("Could not create social link");
    setSUrl("https://");
    setSLabel("");
    setSPlatform("website");
    setSActive(true);
    await refreshPortal();
  };

  const deleteSocialLink = async (id: number) => {
    if (!canSocialWrite) return;
    const res = await portalFetch(`/api/portal/social-links/${id}/`, { method: "DELETE" });
    if (!res.ok) setPortalError("Could not delete link");
    await refreshPortal();
  };

  const labelCls =
    "text-[11px] font-extrabold uppercase tracking-[0.16em] text-[color:var(--gold)]/75 md:text-[12px]";
  const inputCls =
    "mt-1.5 w-full rounded-lg border border-[rgba(197,179,88,0.22)] bg-black/45 px-3 py-2.5 text-[14px] text-white/88 outline-none placeholder:text-white/35 shadow-[inset_0_1px_0_rgba(197,179,88,0.04)] focus:border-[rgba(197,179,88,0.5)] focus:shadow-[0_0_0_1px_rgba(197,179,88,0.12)] md:py-2.5 md:text-[15px]";

  return (
    <Card
      themeMode={themeMode}
      frameVariant="shell"
      title="Goals & Milestones"
      right={
        <div className="flex items-center gap-2">
          {portalBusy ? (
            <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/40">Syncing…</span>
          ) : null}
          {useApiDeck ? (
            <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-emerald-300/80">API</span>
          ) : (
            <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/45">Local</span>
          )}
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">Ops deck</div>
        </div>
      }
    >
      {portalError ? (
        <div className="mb-3 rounded-md border border-red-500/35 bg-red-950/40 px-3 py-2 text-[12px] text-red-200/95">
          {portalError}{" "}
          <button type="button" className="underline" onClick={() => setPortalError(null)}>
            Dismiss
          </button>
        </div>
      ) : null}

      <GoalsMilestonesRail goals={goals} hydrated={goalsHydrated} />

      <div className="grid w-full max-w-none grid-cols-1 gap-6 min-[1400px]:grid-cols-2 min-[1400px]:gap-8 lg:gap-7 xl:gap-8">
        {/* 1 — Missions */}
        <div className={DECK_QUARTER}>
          <DeckQuarterGlow />
          <div className="relative z-[1]">
          <div className="text-[12px] font-black uppercase tracking-[0.2em] text-[color:var(--gold)] md:text-[13px] lg:text-[14px]">Missions</div>
          <p className="mt-2 text-[13px] leading-relaxed text-white/60 md:text-[14px] md:leading-relaxed">
            Create a mission with a target time and point value. Track active and missed.
          </p>

          {useApiDeck && !canDeckWrite ? (
            <p className="mt-2 text-[10px] text-amber-200/85">Read-only: your role can view missions but not edit.</p>
          ) : null}

          <div className={DECK_FORM_SHELL}>
            <div>
              <label className={labelCls}>Mission title</label>
              <input
                className={inputCls}
                value={mTitle}
                onChange={(e) => setMTitle(e.target.value)}
                placeholder="e.g. Deep work — proposal"
                disabled={useApiDeck && !canDeckWrite}
              />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Target date & time</label>
                <input
                  className={inputCls}
                  type="datetime-local"
                  value={mTarget}
                  onChange={(e) => setMTarget(e.target.value)}
                  disabled={useApiDeck && !canDeckWrite}
                />
              </div>
              <div>
                <label className={labelCls}>Points</label>
                <input
                  className={inputCls}
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
              className="w-full rounded-lg border border-[#39ff14]/38 bg-[rgba(57,255,20,0.08)] py-3 text-[11px] font-black uppercase tracking-[0.15em] text-[#b8ff9e] shadow-[0_0_22px_rgba(57,255,20,0.1)] hover:bg-[rgba(57,255,20,0.14)] disabled:cursor-not-allowed disabled:opacity-40 md:text-[12px]"
            >
              Create mission
            </motion.button>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-[#39ff14]/34 bg-[#071007]/90 p-3 shadow-[0_0_24px_rgba(57,255,20,0.08)] md:p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[#9dff7a]">Active missions</div>
              <DeckListToolbar
                search={mSearchA}
                onSearchChange={setMSearchA}
                sortLabel="Due"
                sortDir={mSortA}
                onSortDirToggle={() => setMSortA((d) => (d === "desc" ? "asc" : "desc"))}
                placeholder="Search active…"
              />
              <div className={DECK_LIST_INNER}>
                {filteredActiveMissions.length === 0 ? (
                  <div className="text-[13px] text-white/45">None active.</div>
                ) : (
                  filteredActiveMissions.map((m) => {
                    const dueTs = new Date(m.targetIso).getTime();
                    const urgent = Number.isFinite(dueTs) && dueTs - Date.now() < 36e5 && dueTs > Date.now();
                    return (
                      <DeckListItem
                        key={m.id}
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
                            <div className="flex flex-wrap gap-1">
                              <button
                                type="button"
                                className="rounded border border-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#d4c4b8] hover:border-[#39ff14]/45 hover:text-[#b8ff9e]"
                                onClick={() => void patchMission(m.id, "done")}
                              >
                                Complete
                              </button>
                              <button
                                type="button"
                                className="rounded border border-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#d4c4b8] hover:border-[#ff3838]/55 hover:text-[#ffb0b0]"
                                onClick={() => void patchMission(m.id, "missed")}
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
            <div className="rounded-xl border border-[#ff3838]/34 bg-[#140808]/90 p-3 shadow-[0_0_24px_rgba(255,56,56,0.1)] md:p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[#ff9a9a]">Missed missions</div>
              <DeckListToolbar
                search={mSearchM}
                onSearchChange={setMSearchM}
                sortLabel="Due"
                sortDir={mSortM}
                onSortDirToggle={() => setMSortM((d) => (d === "desc" ? "asc" : "desc"))}
                placeholder="Search missed…"
              />
              <div className={DECK_LIST_INNER}>
                {filteredMissedMissions.length === 0 ? (
                  <div className="text-[13px] text-white/45">None missed.</div>
                ) : (
                  filteredMissedMissions.map((m) => (
                    <DeckListItem
                      key={m.id}
                      title={m.title}
                      badge={<MissionStatusBadge status="missed" />}
                      subtitle={
                        <DueDateLine label="Was due" value={new Date(m.targetIso).toLocaleString()} />
                      }
                    />
                  ))
                )}
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* 2 — Reminders */}
        <div className={DECK_QUARTER}>
          <DeckQuarterGlow />
          <div className="relative z-[1]">
          <div className="text-[12px] font-black uppercase tracking-[0.2em] text-[color:var(--gold)] md:text-[13px] lg:text-[14px]">
            Reminders / schedules
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-white/60 md:text-[14px] md:leading-relaxed">
            Schedule with date, time, and points. Separate active and completed.
          </p>

          {useApiDeck && !canDeckWrite ? (
            <p className="mt-2 text-[10px] text-amber-200/85">Read-only reminders for your role.</p>
          ) : null}

          <div className={DECK_FORM_SHELL}>
            <div>
              <label className={labelCls}>Reminder title</label>
              <input
                className={inputCls}
                value={rTitle}
                onChange={(e) => setRTitle(e.target.value)}
                placeholder="e.g. Call mentor"
                disabled={useApiDeck && !canDeckWrite}
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <label className={labelCls}>Date</label>
                <input
                  className={inputCls}
                  type="date"
                  value={rDate}
                  onChange={(e) => setRDate(e.target.value)}
                  disabled={useApiDeck && !canDeckWrite}
                />
              </div>
              <div className="col-span-1">
                <label className={labelCls}>Time</label>
                <input
                  className={inputCls}
                  type="time"
                  value={rTime}
                  onChange={(e) => setRTime(e.target.value)}
                  disabled={useApiDeck && !canDeckWrite}
                />
              </div>
              <div className="col-span-1">
                <label className={labelCls}>Points</label>
                <input
                  className={inputCls}
                  type="number"
                  min={0}
                  max={9999}
                  value={rPoints}
                  onChange={(e) => setRPoints(Number(e.target.value))}
                  disabled={useApiDeck && !canDeckWrite}
                />
              </div>
            </div>
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => void addReminder()}
              disabled={useApiDeck && !canDeckWrite}
              className="w-full rounded-lg border border-[rgba(197,179,88,0.45)] bg-[rgba(197,179,88,0.1)] py-3 text-[11px] font-black uppercase tracking-[0.16em] text-[color:var(--gold)] shadow-[0_0_20px_rgba(197,179,88,0.08)] hover:bg-[rgba(197,179,88,0.16)] disabled:cursor-not-allowed disabled:opacity-40 md:text-[12px]"
            >
              Create reminder
            </motion.button>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-[#39ff14]/32 bg-[#071007]/88 p-3 md:p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[#b8ff9e]">
                Active reminders
              </div>
              <DeckListToolbar
                search={rSearchAct}
                onSearchChange={setRSearchAct}
                sortLabel="When"
                sortDir={rSortAct}
                onSortDirToggle={() => setRSortAct((d) => (d === "desc" ? "asc" : "desc"))}
                placeholder="Search active…"
              />
              <div className={DECK_LIST_INNER}>
                {filteredActiveReminders.length === 0 ? (
                  <div className="text-[13px] text-white/45">None scheduled.</div>
                ) : (
                  filteredActiveReminders.map((r) => {
                    const timePart = r.time.length === 5 ? `${r.time}:00` : r.time;
                    const whenMs = new Date(`${r.date}T${timePart}`).getTime();
                    const urgent =
                      Number.isFinite(whenMs) &&
                      whenMs > Date.now() &&
                      whenMs - Date.now() < 864e5;
                    return (
                      <DeckListItem
                        key={r.id}
                        title={r.title}
                        badge={<ReminderStatusBadge status="active" />}
                        subtitle={
                          <>
                            <DueDateLine label="When" value={`${r.date} · ${r.time}`} urgent={urgent} />
                            <div className="mt-0.5">
                              <PriorityPoints points={r.points} tone="gold" />
                            </div>
                          </>
                        }
                        footer={
                          (!useApiDeck || canDeckWrite) && (
                            <button
                              type="button"
                              className="rounded border border-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#d4c4b8] hover:border-[#39ff14]/45 hover:text-[#b8ff9e]"
                              onClick={() => void patchReminder(r.id, "completed")}
                            >
                              Mark completed
                            </button>
                          )
                        }
                      />
                    );
                  })
                )}
              </div>
            </div>
            <div className="rounded-xl border border-[rgba(197,179,88,0.28)] bg-black/35 p-3 shadow-[inset_0_1px_0_rgba(197,179,88,0.06)] md:p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--gold)]/80 md:text-[11px]">Completed reminders</div>
              <DeckListToolbar
                search={rSearchDone}
                onSearchChange={setRSearchDone}
                sortLabel="When"
                sortDir={rSortDone}
                onSortDirToggle={() => setRSortDone((d) => (d === "desc" ? "asc" : "desc"))}
                placeholder="Search completed…"
              />
              <div className={DECK_LIST_INNER}>
                {filteredDoneReminders.length === 0 ? (
                  <div className="text-[13px] text-white/45">None yet.</div>
                ) : (
                  filteredDoneReminders.map((r) => (
                    <DeckListItem
                      key={r.id}
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

        {/* 3 — Notes */}
        <div className={DECK_QUARTER}>
          <DeckQuarterGlow />
          <div className="relative z-[1]">
          <div className="text-[12px] font-black uppercase tracking-[0.2em] text-[color:var(--gold)] md:text-[13px] lg:text-[14px]">Notes</div>
          <p className="mt-2 text-[13px] leading-relaxed text-white/60 md:text-[14px] md:leading-relaxed">
            Create notes and review the latest five in the selector below.
          </p>

          {useApiDeck && !canDeckWrite ? (
            <p className="mt-2 text-[10px] text-amber-200/85">Read-only notes for your role.</p>
          ) : null}

          <div className={DECK_FORM_SHELL}>
            <div>
              <label className={labelCls}>Note title</label>
              <input
                className={inputCls}
                value={nTitle}
                onChange={(e) => setNTitle(e.target.value)}
                placeholder="Short label"
                disabled={useApiDeck && !canDeckWrite}
              />
            </div>
            <div>
              <label className={labelCls}>Note body</label>
              <textarea
                className={cn(inputCls, "min-h-[72px] resize-y")}
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
              className="w-full rounded-lg border border-[rgba(197,179,88,0.45)] bg-[rgba(197,179,88,0.1)] py-3 text-[11px] font-black uppercase tracking-[0.16em] text-[color:var(--gold)] shadow-[0_0_20px_rgba(197,179,88,0.08)] hover:bg-[rgba(197,179,88,0.16)] disabled:cursor-not-allowed disabled:opacity-40 md:text-[12px]"
            >
              Save note
            </motion.button>
          </div>

          <div className="mt-5">
            <DeckListToolbar
              search={nSearch}
              onSearchChange={setNSearch}
              sortLabel="Created"
              sortDir={nSort}
              onSortDirToggle={() => setNSort((d) => (d === "desc" ? "asc" : "desc"))}
              placeholder="Search notes…"
            />
            <label className={labelCls}>Recent notes (select to view)</label>
            <select
              className="mt-1 w-full rounded-md border border-[rgba(255,215,0,0.35)] bg-[#0a0a0a] px-2 py-1 font-mono text-[13px] font-semibold leading-snug text-white/90 outline-none focus:border-[rgba(255,215,0,0.65)]"
              size={filteredNotes.length === 0 ? 1 : Math.min(8, Math.max(4, optionNotes.length))}
              value={selectedNote?.id ?? ""}
              onChange={(e) => setSelectedNoteId(e.target.value || null)}
            >
              {optionNotes.length === 0 ? (
                <option value="">No notes yet</option>
              ) : (
                optionNotes.map((n) => (
                  <option key={n.id} value={n.id} className="bg-[#111] py-2 text-[13px]">
                    {n.title} — {new Date(n.createdAt).toLocaleDateString()}
                  </option>
                ))
              )}
            </select>
            {selectedNote ? (
              <div className="mt-4 min-h-[min(28vh,200px)] rounded-xl border border-[rgba(197,179,88,0.24)] bg-black/45 p-4 shadow-[inset_0_1px_0_rgba(197,179,88,0.06)] md:min-h-[min(32vh,260px)] md:p-6">
                <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--gold)]/75">Preview</div>
                <div className="mt-2 text-[15px] font-black text-white/92 md:text-[16px]">{selectedNote.title}</div>
                <div className="mt-3 max-h-[min(48vh,520px)] overflow-y-auto whitespace-pre-wrap text-[14px] leading-relaxed text-white/75 [scrollbar-color:rgba(197,179,88,0.42)_rgba(0,0,0,0.25)] md:text-[15px] md:leading-relaxed">
                  {selectedNote.body || "—"}
                </div>
              </div>
            ) : null}
            {notesRemaining > 0 && !notesExpanded ? (
              <motion.button
                type="button"
                whileTap={{ scale: 0.99 }}
                onClick={() => setNotesExpanded(true)}
                className="mt-2 w-full rounded-md border border-[rgba(255,215,0,0.35)] bg-black/40 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[color:var(--gold)]/92 hover:bg-black/55"
              >
                View more ({notesRemaining} left)
              </motion.button>
            ) : null}
            {notesExpanded && filteredNotes.length > 5 ? (
              <button
                type="button"
                className="mt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/45 underline hover:text-white/70"
                onClick={() => setNotesExpanded(false)}
              >
                Show first 5 only
              </button>
            ) : null}
          </div>
          </div>
        </div>

        {/* 4 — Quick access + social admin */}
        <div className={DECK_QUARTER}>
          <DeckQuarterGlow />
          <div className="relative z-[1]">
          <div className="text-[12px] font-black uppercase tracking-[0.2em] text-[color:var(--gold)] md:text-[13px] lg:text-[14px]">
            Quick access · social tools
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-white/60 md:text-[14px] md:leading-relaxed">
            Links from the portal API when signed in; otherwise bundled defaults. Tiles open in{" "}
            <span className="font-semibold text-[#9dff7a]">this tab</span> (site icons via public favicon lookup).
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-3.5">
            {socialLinks.map((link) => (
              <SocialQuickLinkTile key={link.id} link={link} />
            ))}
          </div>

          {useApiDeck && canSocialWrite ? (
            <div className="mt-5 rounded-lg border border-[rgba(197,179,88,0.2)] bg-black/35 p-3 md:p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--gold)]/80">Manage links</div>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Platform</label>
                  <select
                    className={inputCls}
                    value={sPlatform}
                    onChange={(e) => setSPlatform(e.target.value)}
                  >
                    {SOCIAL_PLATFORM_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Label</label>
                  <input className={inputCls} value={sLabel} onChange={(e) => setSLabel(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>URL</label>
                  <input className={inputCls} value={sUrl} onChange={(e) => setSUrl(e.target.value)} />
                </div>
              </div>
              <label className="mt-2 flex items-center gap-2 text-[10px] text-white/55">
                <input type="checkbox" checked={sActive} onChange={(e) => setSActive(e.target.checked)} />
                Active (shown in quick grid)
              </label>
              <motion.button
                type="button"
                whileTap={{ scale: 0.99 }}
                onClick={() => void addSocialLink()}
                className="mt-3 w-full rounded-lg border border-[rgba(197,179,88,0.42)] bg-[rgba(197,179,88,0.09)] py-2.5 text-[10px] font-black uppercase tracking-[0.15em] text-[color:var(--gold)] shadow-[0_0_18px_rgba(197,179,88,0.08)] hover:bg-[rgba(197,179,88,0.14)] md:text-[11px]"
              >
                Add social link
              </motion.button>

              {rawSocial.length ? (
                <ul className="mt-4 min-h-[120px] max-h-[min(48vh,440px)] space-y-1.5 overflow-y-auto overflow-x-hidden text-[13px] text-white/78 [scrollbar-color:rgba(197,179,88,0.42)_rgba(0,0,0,0.25)]">
                  {rawSocial.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center justify-between gap-2 rounded border border-white/8 bg-black/40 px-2 py-1"
                    >
                      <span className="min-w-0 truncate">
                        <span className="font-mono text-[9px] text-white/40">{s.platform}</span>{" "}
                        {s.label || s.url}
                      </span>
                      <button
                        type="button"
                        className="shrink-0 text-[9px] font-bold uppercase tracking-[0.1em] text-red-300/90 hover:underline"
                        onClick={() => void deleteSocialLink(s.id)}
                      >
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
          </div>
        </div>
      </div>
    </Card>
  );
}
