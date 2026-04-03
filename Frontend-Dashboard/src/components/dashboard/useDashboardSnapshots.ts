import { useEffect, useMemo, useState } from "react";
import type {
  CoreIntegritySnapshot,
  DashboardSnapshots,
  NotificationItem,
  ProgramSnapshot,
  SyndicateSnapshot
} from "./types";

export type DashboardCourseLike = {
  id: string;
  title: string;
  meta?: string;
  statusText?: string;
  imageSrc?: string;
};

function safeJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function nowMinus(mins: number) {
  return Date.now() - mins * 60_000;
}

function clampPct(v: number) {
  return Math.max(0, Math.min(100, v));
}

function seedNum(seed: string) {
  return seed.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
}

function missionTitleFallback(missionId: string | null) {
  if (!missionId) return undefined;
  return missionId
    .replaceAll("-", " ")
    .replaceAll("_", " ")
    .replace(/\b[a-z]/g, (m) => m.toUpperCase());
}

/** Consecutive calendar days the operator opened the deck (client local date). */
function bumpUptimeStreak(): number {
  const KEY_LAST = "dashboarded:lastVisitDate";
  const KEY_STREAK = "dashboarded:uptimeStreak";
  const today = new Date().toISOString().slice(0, 10);
  const last = window.localStorage.getItem(KEY_LAST);
  let streak = Number(window.localStorage.getItem(KEY_STREAK) || "0");

  if (last === today) {
    return Math.max(1, streak || 1);
  }

  if (!last) {
    streak = 1;
  } else {
    const lastTime = new Date(`${last}T12:00:00`).getTime();
    const todayTime = new Date(`${today}T12:00:00`).getTime();
    const diffDays = Math.round((todayTime - lastTime) / 86400000);
    if (diffDays === 1) {
      streak = Math.max(1, streak) + 1;
    } else {
      streak = 1;
    }
  }

  window.localStorage.setItem(KEY_LAST, today);
  window.localStorage.setItem(KEY_STREAK, String(streak));
  return streak;
}

export function useDashboardSnapshots({
  userName,
  courses
}: {
  userName: string;
  courses: DashboardCourseLike[];
}): { snapshots: DashboardSnapshots; hydrated: boolean } {
  const [hydrated, setHydrated] = useState(false);
  const [snap, setSnap] = useState<DashboardSnapshots | null>(null);

  useEffect(() => {
    // Hydrate from localStorage (client-only). This is structured for future API integration.
    const activeProgramId = window.localStorage.getItem("dashboarded:activeProgramId");
    const lastCourseId = window.localStorage.getItem("dashboarded:lastCourseId");
    const progressMap = safeJson<Record<string, number>>(window.localStorage.getItem("dashboarded:course-progress")) ?? {};

    const programs: ProgramSnapshot[] = courses
      .map((c) => ({
        id: c.id,
        title: c.title,
        meta: c.meta ?? c.statusText,
        imageSrc: c.imageSrc,
        progressPct: clampPct(progressMap[c.id] ?? 0),
        lastOpenedTs: c.id === lastCourseId ? nowMinus(8) : c.id === activeProgramId ? nowMinus(3) : undefined
      }))
      .filter((p) => p.progressPct > 0 || p.id === lastCourseId || p.id === activeProgramId)
      .sort((a, b) => (b.lastOpenedTs ?? 0) - (a.lastOpenedTs ?? 0));

    const durationRaw = window.localStorage.getItem("dashboarded:syndicate-duration");
    const durationNum = durationRaw ? Number(durationRaw) : NaN;
    const durationDays: 7 | 14 | 30 = durationNum === 7 || durationNum === 14 || durationNum === 30 ? durationNum : 14;
    const category = window.localStorage.getItem("dashboarded:syndicate-category") ?? "skills";
    const missionId = window.localStorage.getItem("dashboarded:syndicate-missionId");
    const levelRaw = window.localStorage.getItem("dashboarded:syndicate-level");
    const levelNum = levelRaw ? Number(levelRaw) : NaN;
    const level = Number.isFinite(levelNum) ? Math.max(1, Math.floor(levelNum)) : durationDays === 7 ? 6 : durationDays === 14 ? 11 : 17;
    const xpRaw = window.localStorage.getItem("dashboarded:syndicate-xp");
    const xpNum = xpRaw ? Number(xpRaw) : NaN;
    const xpPct = clampPct(Number.isFinite(xpNum) ? xpNum : seedNum(userName + category) % 60 + 20);

    const activeMissionsPct = clampPct(
      missionId ? 38 + (seedNum(userName + "am") % 52) : 12 + (seedNum(userName + "am") % 28)
    );
    const missedChallengesPct = clampPct(2 + (seedNum(userName + "missed") % 45));

    const syndicate: SyndicateSnapshot = {
      rankLabel: durationDays >= 30 ? "Diamond" : durationDays === 14 ? "Elite" : "Gold",
      level,
      xpPct,
      streakDays: (seedNum(userName) % 9) + 3,
      durationDays,
      category,
      activeMissionTitle: missionTitleFallback(missionId),
      activeMissionsPct,
      missedChallengesPct,
      leaderboardPos: (seedNum(userName + "lb") % 87) + 1,
      nextRankChecklist: [
        "Complete 2 missions without skipping",
        "Maintain streak for 5 days",
        "Earn +25 XP from challenges",
        "Finish 1 focus-category mission"
      ]
    };

    const referralLink =
      window.localStorage.getItem("dashboarded:affiliate-ref") || "https://syndicate.app/r/subhan-x91";
    const clicks = (seedNum(userName + "clicks") % 300) + 40;
    const conversions = Math.max(1, Math.floor(clicks * 0.18));
    const earnings = Math.floor(conversions * 38 + (seedNum(userName) % 60));

    const uptimeDays = bumpUptimeStreak();
    const integrityPct = clampPct(Math.min(100, 52 + uptimeDays * 4 + (seedNum(userName + "integrity") % 14)));
    const energyLevel = clampPct(38 + (seedNum(userName + "energy") % 48) + Math.min(12, uptimeDays));
    const coreIntegrity: CoreIntegritySnapshot = {
      integrityPct,
      systemUptimeDays: uptimeDays,
      energyLevel,
      loadSeries: [14, 16, 15, 18, 20, 22, 24].map((v) => v + (seedNum(userName) % 5))
    };

    const notificationsSeed: NotificationItem[] = [
      {
        id: "n-1",
        category: "progress",
        title: "Continue where you left off",
        message: lastCourseId ? `Resume your last program (${lastCourseId.toUpperCase()}) and keep momentum.` : "Pick a program to begin your progress loop.",
        ts: nowMinus(12),
        read: false,
        cta: { label: "Open Programs", nav: "programs" }
      },
      {
        id: "n-2",
        category: "rewards",
        title: "Challenge update",
        message: `You’re ${syndicate.xpPct}% to your next rank unlock. Keep the streak alive.`,
        ts: nowMinus(38),
        read: false,
        cta: { label: "Open Syndicate", nav: "monk" }
      },
      {
        id: "n-3",
        category: "social",
        title: "Community pulse",
        message: "Fresh resource discussions are trending. Check updates and react quickly.",
        ts: nowMinus(74),
        read: true,
        cta: { label: "Open Membership section", nav: "resources" }
      }
    ];

    setSnap({
      programs,
      syndicate,
      affiliate: {
        referralLink,
        clicks,
        conversions,
        earnings,
        recent: [
          { who: "Aariz", status: "joined", ts: nowMinus(9) },
          { who: "Maya", status: "purchased", ts: nowMinus(41) },
          { who: "Nora", status: "clicked", ts: nowMinus(86) }
        ]
      },
      coreIntegrity,
      resources: {
        recent: [
          { title: "Cold Resolve Playbook", tag: "fitness", ts: nowMinus(55) },
          { title: "Offer Craft Framework", tag: "skills", ts: nowMinus(130) }
        ],
        recommended: [
          { title: "Authority Buildout Notes", tag: "power" },
          { title: "Asset Accumulation Checklist", tag: "money" }
        ],
        tags: ["money", "power", "freedom", "fitness", "skills"]
      },
      goals: {
        rankGoalLabel: "Diamond",
        rankProgressPct: clampPct(syndicate.xpPct + 8),
        completionGoalPct: clampPct((programs.reduce((a, p) => a + p.progressPct, 0) / Math.max(1, programs.length)) || 0),
        earningsGoalPct: clampPct(Math.floor((earnings / 2500) * 100)),
        integrityGoalPct: clampPct(Math.floor(((seedNum(userName + "integrityGoal") % 800) / 1000) * 100)),
        milestones: [
          { label: "7-day streak", pct: 100, reached: syndicate.streakDays >= 7 },
          { label: "50% program completion", pct: 50, reached: programs.some((p) => p.progressPct >= 50) },
          { label: "First affiliate payout", pct: 35, reached: earnings >= 300 }
        ]
      },
      recommendations: (() => {
        const primaryProgram = programs[0];
        const nextProgram =
          primaryProgram != null
            ? {
                title: primaryProgram.title,
                reason: `${primaryProgram.progressPct > 0 ? `At ${primaryProgram.progressPct}% — ` : ""}${primaryProgram.meta ? `${primaryProgram.meta}. ` : ""}Pairs with Syndicate execution cadence.`,
                nav: "programs" as const
              }
            : courses.length > 0
              ? {
                  title: courses[0].title,
                  reason: courses[0].meta ?? courses[0].statusText ?? "Open Programs to start this track.",
                  nav: "programs" as const
                }
              : {
                  title: "Java Programming",
                  reason: "Pairs with Syndicate execution cadence.",
                  nav: "programs" as const
                };
        return {
          nextProgram,
          nextChallenge: { title: "Dominance Protocol", reason: "High ROI for confidence and influence.", nav: "monk" },
          affiliateTip: { title: "Add a 1-line CTA", reason: "Improve conversions by clarifying the next step.", nav: "affiliate" },
          systemTip: { title: "Calibrate routine", reason: "Balance daily load so integrity stays in the green band.", nav: "resources" },
          reminder: { title: "Streak defense", reason: "Do one 10-minute mission today to protect streak.", nav: "monk" }
        };
      })(),
      activity: [
        { id: "a-1", category: "program", title: "Completed lesson", detail: "Java: OOP Foundations", ts: nowMinus(22) },
        { id: "a-2", category: "syndicate", title: "XP gained", detail: "+12 XP from mission entry", ts: nowMinus(64) },
        { id: "a-3", category: "affiliate", title: "Referral clicked", detail: "New click from TikTok bio", ts: nowMinus(120) },
        { id: "a-4", category: "system", title: "Core integrity synced", detail: "Throughput nominal", ts: nowMinus(240) },
        { id: "a-5", category: "system", title: "Resource thread updated", detail: "New insight highlighted", ts: nowMinus(420) }
      ],
      notifications: notificationsSeed
    });
    setHydrated(true);
  }, [courses, userName]);

  const snapshots = useMemo(() => {
    if (snap) return snap;
    // Pre-hydration fallback: avoid UI flicker and keep predictable shapes.
    const emptySyndicate: SyndicateSnapshot = {
      rankLabel: "Elite",
      level: 11,
      xpPct: 42,
      streakDays: 4,
      durationDays: 14,
      activeMissionsPct: 0,
      missedChallengesPct: 0,
      nextRankChecklist: []
    };
    const empty: DashboardSnapshots = {
      programs: [],
      syndicate: emptySyndicate,
      affiliate: { clicks: 0, conversions: 0, earnings: 0, recent: [] },
      coreIntegrity: { integrityPct: 0, systemUptimeDays: 0, energyLevel: 0, loadSeries: [] },
      resources: { recent: [], recommended: [], tags: [] },
      goals: { rankGoalLabel: "Diamond", rankProgressPct: 0, completionGoalPct: 0, earningsGoalPct: 0, integrityGoalPct: 0, milestones: [] },
      recommendations: {},
      activity: [],
      notifications: []
    };
    return empty;
  }, [hydrated, snap]);

  return { snapshots, hydrated };
}

