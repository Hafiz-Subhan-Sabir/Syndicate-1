export type DashboardNavKey =
  | "dashboard"
  | "programs"
  | "monk"
  | "resources"
  | "affiliate"
  | "support"
  | "settings";

export type ActivityCategory = "program" | "syndicate" | "affiliate" | "system";

export type ActivityItem = {
  id: string;
  category: ActivityCategory;
  title: string;
  detail?: string;
  ts: number; // epoch ms
};

export type NotificationCategory = "system" | "progress" | "rewards" | "social";
export type NotificationItem = {
  id: string;
  category: NotificationCategory;
  title: string;
  message?: string;
  ts: number; // epoch ms
  read: boolean;
  cta?: { label: string; nav?: DashboardNavKey };
};

export type ProgramSnapshot = {
  id: string;
  title: string;
  meta?: string;
  imageSrc?: string;
  progressPct: number;
  lastOpenedTs?: number;
};

export type SyndicateSnapshot = {
  rankLabel: string;
  level: number;
  xpPct: number; // 0..100
  streakDays: number;
  durationDays: 7 | 14 | 30;
  category?: string;
  activeMissionTitle?: string;
  /** Progress signal for active missions row (0..100). */
  activeMissionsPct: number;
  /** Share of challenges missed / slipped (0..100), dashboard metaphor. */
  missedChallengesPct: number;
  leaderboardPos?: number;
  nextRankChecklist: string[];
};

export type AffiliateSnapshot = {
  referralLink?: string;
  clicks: number;
  conversions: number;
  earnings: number;
  recent: Array<{ who: string; status: "clicked" | "joined" | "purchased"; ts: number }>;
};

/** Replaces legacy "stake" — system health / energy metaphor (no gambling semantics). */
export type CoreIntegritySnapshot = {
  integrityPct: number; // 0..100 gauge
  systemUptimeDays: number; // consecutive active days
  energyLevel: number; // 0..100
  loadSeries: number[]; // sparkline for load / throughput
};

export type ResourcesSnapshot = {
  recent: Array<{ title: string; tag: string; ts: number }>;
  recommended: Array<{ title: string; tag: string }>;
  tags: string[];
};

export type GoalsSnapshot = {
  rankGoalLabel: string;
  rankProgressPct: number;
  completionGoalPct: number;
  earningsGoalPct: number;
  integrityGoalPct: number;
  milestones: Array<{ label: string; pct: number; reached: boolean }>;
};

export type RecommendationsSnapshot = {
  nextProgram?: { title: string; reason: string; nav: DashboardNavKey };
  nextChallenge?: { title: string; reason: string; nav: DashboardNavKey };
  affiliateTip?: { title: string; reason: string; nav: DashboardNavKey };
  systemTip?: { title: string; reason: string; nav: DashboardNavKey };
  reminder?: { title: string; reason: string; nav: DashboardNavKey };
};

export type DashboardSnapshots = {
  programs: ProgramSnapshot[];
  syndicate: SyndicateSnapshot;
  affiliate: AffiliateSnapshot;
  coreIntegrity: CoreIntegritySnapshot;
  resources: ResourcesSnapshot;
  goals: GoalsSnapshot;
  recommendations: RecommendationsSnapshot;
  activity: ActivityItem[];
  notifications: NotificationItem[];
};
