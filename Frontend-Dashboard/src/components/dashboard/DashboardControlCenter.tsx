"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { DashboardNavKey, DashboardSnapshots, NotificationItem } from "./types";
import { useDashboardSnapshots, type DashboardCourseLike } from "./useDashboardSnapshots";
import { accentByKey, Card, cn, ProgressBar, themeAccent, type ThemeMode } from "./dashboardPrimitives";
import { PortalSessionControls } from "../auth/PortalSessionControls";
import { GoalPathSystem } from "./path/GoalPathSystem";
import { MissionCommandDeckCard } from "./MissionCommandDeckCard";

export type { ThemeMode };

function timeAgo(ts: number) {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function NotificationBell({
  themeMode,
  notifications,
  onNavigate
}: {
  themeMode: ThemeMode;
  notifications: NotificationItem[];
  onNavigate: (nav: DashboardNavKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const unread = notifications.filter((n) => !n.read).length;
  const t = themeAccent(themeMode);
  const panelRef = useRef<HTMLDivElement | null>(null);

  return (
    <div className="relative">
      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.98 }}
        className="cut-frame-sm cyber-frame gold-stroke hud-hover-glow grid h-10 w-10 place-items-center border bg-black/50 text-white/80 hover:text-white"
        style={{ borderColor: t.border }}
        aria-label="Notifications"
        aria-expanded={open}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
          <path
            d="M12 20.2a2.2 2.2 0 0 0 2.2-2.2H9.8A2.2 2.2 0 0 0 12 20.2Z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M18.2 16.2H5.8l1.1-1.3V11a5.1 5.1 0 0 1 10.2 0v3.9l1.1 1.3Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full border border-white/10 bg-[rgba(255,59,59,0.95)] text-[10px] font-black text-white shadow-[0_0_16px_rgba(255,59,59,0.35)]">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </motion.button>

      <AnimatePresence>
        {open ? (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="cut-frame cyber-frame gold-stroke absolute right-0 top-[calc(100%+10px)] z-50 w-[min(420px,92vw)] overflow-hidden border bg-[#060606]/95 p-3 backdrop-blur-md"
            style={{ borderColor: t.border, boxShadow: `0 0 0 1px ${t.glow}, 0 0 26px ${t.glow}` }}
            role="menu"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-white/60">
                Notifications
              </div>
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">
                {unread} unread
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {notifications.slice(0, 6).map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    if (n.cta?.nav) onNavigate(n.cta.nav);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full rounded-md border bg-black/35 px-3 py-2 text-left transition hover:bg-black/55",
                    n.read ? "border-white/10" : "border-[rgba(255,215,0,0.30)]"
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[12px] font-bold text-white/80">{n.title}</div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
                      {timeAgo(n.ts)}
                    </div>
                  </div>
                  {n.message ? <div className="mt-1 text-[12px] text-white/60">{n.message}</div> : null}
                  {n.cta?.label ? (
                    <div className="mt-2 text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--gold)]/90">
                      {n.cta.label} →
                    </div>
                  ) : null}
                </button>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function HeroStatusPanel({
  themeMode,
  userName,
  userRole,
  profileAvatar,
  snapshots,
  onNavigate
}: {
  themeMode: ThemeMode;
  userName: string;
  userRole: string;
  profileAvatar: string;
  snapshots: DashboardSnapshots;
  onNavigate: (nav: DashboardNavKey) => void;
}) {
  const s = snapshots;
  const t = themeAccent(themeMode);
  const ongoingPrograms = s.programs.length;
  const programsAvgPct =
    s.programs.length > 0 ? Math.round(s.programs.reduce((acc, p) => acc + p.progressPct, 0) / s.programs.length) : 0;
  const activeMissionCount = s.syndicate.activeMissionTitle ? 1 : 0;
  const missionsPct = s.syndicate.activeMissionsPct;
  const missedPct = s.syndicate.missedChallengesPct;
  return (
    <div
      className="cut-frame cyber-frame gold-stroke relative w-full max-w-none overflow-hidden border border-[rgba(197,179,88,0.26)] bg-[#060606]/78 p-5 backdrop-blur-[10px] md:p-6 lg:p-7"
      style={{ borderColor: "rgba(197,179,88,0.28)", boxShadow: `0 0 0 1px rgba(197,179,88,0.08), 0 0 52px ${t.glow}` }}
    >
      <div className="absolute inset-0 opacity-[0.88] [background:radial-gradient(920px_560px_at_38%_0%,rgba(197,179,88,0.11),rgba(0,0,0,0)_64%)]" />
      <div className="absolute inset-0 opacity-35 [background:radial-gradient(800px_320px_at_90%_0%,rgba(196,126,255,0.10),rgba(0,0,0,0)_62%)]" />

      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <img
            src={profileAvatar}
            alt="Profile avatar"
            className="h-14 w-14 rounded-lg border border-white/10 bg-black/30 object-cover p-0.5"
          />
          <div className="min-w-0">
            <div className="font-mono text-[14px] font-black uppercase tracking-[0.12em] text-[color:var(--gold)]/92">
              {userName}
            </div>
            <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
              {userRole} • Rank: <span className="text-white/80">{s.syndicate.rankLabel}</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="group relative inline-flex items-center gap-2 rounded-md border border-white/10 bg-black/30 px-2 py-1">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-white/22" fill="none" aria-hidden="true">
                  <path d="M12 3.8l6.2 3.6v7.2L12 18.2l-6.2-3.6V7.4L12 3.8Z" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M7.8 9.2h8.4M7.8 12h6.2M7.8 14.8h8.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
                </svg>
                <span className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Diamond</span>
                <div className="pointer-events-none absolute left-1/2 top-[calc(100%+10px)] z-50 hidden w-[260px] -translate-x-1/2 rounded-md border border-white/10 bg-black/90 p-2 text-[11px] text-white/70 shadow-[0_0_28px_rgba(168,85,247,0.18)] group-hover:block">
                  <div className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-fuchsia-200/85">Future state</div>
                  <div className="mt-1">Sync remaining <span className="font-mono font-black text-white/90">28%</span> XP to unlock Diamond-tier HUD.</div>
                </div>
              </div>
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">Next rank preview</div>
            </div>
            <div className="mt-3">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.14em] text-white/65">
                <span>XP toward next rank</span>
                <span className="text-white/85">{s.syndicate.xpPct}%</span>
              </div>
              <div className="mt-2">
                <ProgressBar pct={s.syndicate.xpPct} tone={themeMode === "danger" ? "danger" : themeMode === "cyberpunk" ? "ice" : "gold"} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <button
              type="button"
              onClick={() => onNavigate("programs")}
              className="rounded-md border bg-black/40 px-3 py-2 text-left hover:bg-black/65"
              style={{
                borderColor: accentByKey("programs").border,
                boxShadow: `0 0 0 1px ${accentByKey("programs").glow}`
              }}
            >
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/70">Active programs</div>
              <div className="mt-1 space-y-0.5">
                <div className="font-mono text-[14px] font-black tabular-nums text-white/92">
                  {ongoingPrograms}{" "}
                  <span className="text-[9px] font-bold tracking-[0.12em] text-white/45">ONGOING</span>
                </div>
                <div className="font-mono text-[12px] font-black tabular-nums text-white/78">{programsAvgPct}%</div>
              </div>
              <div className="mt-2">
                <ProgressBar pct={programsAvgPct} tone="gold" />
              </div>
            </button>
            <button
              type="button"
              onClick={() => onNavigate("monk")}
              className="rounded-md border bg-black/40 px-3 py-2 text-left hover:bg-black/65"
              style={{
                borderColor: accentByKey("monk").border,
                boxShadow: `0 0 0 1px ${accentByKey("monk").glow}`
              }}
            >
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/70">Active missions</div>
              <div className="mt-1 space-y-0.5">
                <div className="font-mono text-[14px] font-black tabular-nums text-white/92">{missionsPct}%</div>
                <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/45">{activeMissionCount} live</div>
              </div>
              <div className="mt-2">
                <ProgressBar pct={missionsPct} tone="ice" />
              </div>
            </button>
            <button
              type="button"
              onClick={() => onNavigate("monk")}
              className="rounded-md border bg-black/40 px-3 py-2 text-left hover:bg-black/65"
              style={{
                borderColor: accentByKey("alerts").border,
                boxShadow: `0 0 0 1px ${accentByKey("alerts").glow}`
              }}
            >
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/70">Missed challenges</div>
              <div className="mt-1 font-mono text-[14px] font-black tabular-nums text-white/92">{missedPct}%</div>
              <div className="mt-2">
                <ProgressBar pct={missedPct} tone="danger" />
              </div>
            </button>
            <button
              type="button"
              onClick={() => onNavigate("affiliate")}
              className="rounded-md border bg-black/40 px-3 py-2 text-left hover:bg-black/65"
              style={{
                borderColor: accentByKey("affiliate").border,
                boxShadow: `0 0 0 1px ${accentByKey("affiliate").glow}`
              }}
            >
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/70">Mission points</div>
              <div className="mt-1 font-mono text-[14px] font-black tabular-nums text-white/92">{s.affiliate.earnings}</div>
            </button>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 pl-1">
            <PortalSessionControls themeMode={themeMode} />
            <NotificationBell themeMode={themeMode} notifications={s.notifications} onNavigate={onNavigate} />
          </div>
        </div>
      </div>

      <div className="relative mt-4 flex flex-wrap items-center justify-between gap-3">
        <div
          className="rounded-md border px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em]"
          style={{
            borderColor: accentByKey("alerts").border,
            background: accentByKey("alerts").fill,
            color: accentByKey("alerts").text,
            boxShadow: `0 0 22px ${accentByKey("alerts").glow}`
          }}
        >
          Streak: {s.syndicate.streakDays} days
        </div>
        <div className="flex flex-wrap gap-2">
          <motion.button
            type="button"
            onClick={() => onNavigate("programs")}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            className="rounded-md border bg-black/30 px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[color:var(--gold)]/95 hover:bg-black/45"
            style={{ borderColor: accentByKey("energy").border, boxShadow: `0 0 20px ${accentByKey("energy").glow}` }}
          >
            Continue Program
          </motion.button>
          <motion.button
            type="button"
            onClick={() => onNavigate("monk")}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            className="rounded-md border bg-black/30 px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.18em] hover:bg-black/45"
            style={{ borderColor: accentByKey("monk").border, color: accentByKey("monk").text, boxShadow: `0 0 20px ${accentByKey("monk").glow}` }}
          >
            Join Challenge
          </motion.button>
        </div>
      </div>

    </div>
  );
}

function AffiliateSnapshotCard({
  themeMode,
  snapshots,
  onNavigate
}: {
  themeMode: ThemeMode;
  snapshots: DashboardSnapshots;
  onNavigate: (nav: DashboardNavKey) => void;
}) {
  const a = snapshots.affiliate;
  const [hoverMetric, setHoverMetric] = useState<string | null>(null);
  return (
    <Card
      themeMode={themeMode}
      title="Affiliate Portal Snapshot"
      accentKey="affiliate"
      frameVariant="shell"
      headerImageSrc="/assets/dashboard/affiliate.svg"
      right={
        <motion.button
          type="button"
          onClick={() => onNavigate("affiliate")}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
          className="text-[10px] font-black uppercase tracking-[0.14em] text-[#b4ffd8]"
        >
          Open →
        </motion.button>
      }
    >
      <div className="rounded-md border border-white/10 bg-black/35 p-3">
        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/55">Referral link</div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="min-w-0 truncate text-[12px] font-semibold text-white/70">{a.referralLink ?? "—"}</div>
          <motion.button
            type="button"
            onClick={() => {
              if (a.referralLink) navigator.clipboard?.writeText(a.referralLink);
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            className="rounded-md border border-white/10 bg-black/20 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white/70 hover:border-[rgba(0,255,122,0.45)] hover:text-[#b4ffd8]"
          >
            Copy
          </motion.button>
        </div>
      </div>

      {/* Mini funnel visualization (hoverable) */}
      <div className="mt-3 rounded-md border border-[rgba(0,255,122,0.18)] bg-black/30 p-3">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/55">Funnel</div>
          <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[#b4ffd8]">
            {hoverMetric ? hoverMetric : "hover"}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            { k: "Infiltrations", v: a.clicks, pct: 100, tone: "rgba(0,255,122,0.55)" },
            { k: "Operatives", v: a.conversions, pct: Math.max(4, Math.min(100, Math.round((a.conversions / Math.max(1, a.clicks)) * 100))), tone: "rgba(255,215,0,0.55)" },
            { k: "Credits", v: `${a.earnings}`, pct: Math.max(8, Math.min(100, Math.round((a.earnings / 1200) * 100))), tone: "rgba(196,126,255,0.55)" }
          ].map((m) => (
            <motion.div
              key={m.k}
              onMouseEnter={() => setHoverMetric(`${m.k}: ${m.v}`)}
              onMouseLeave={() => setHoverMetric(null)}
              whileHover={{ y: -2 }}
              className="rounded-md border border-white/10 bg-black/35 p-2"
            >
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/55">{m.k}</div>
              <div className="mt-1 font-mono text-[13px] font-black tabular-nums text-white/90">{String(m.v)}</div>
              <div className="mt-2 h-2 overflow-hidden rounded-full border border-white/10 bg-black/50">
                <div className="h-full rounded-full" style={{ width: `${m.pct}%`, background: m.tone, boxShadow: `0 0 18px ${m.tone}` }} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {[
          ["System infiltrations", a.clicks],
          ["Operatives synced", a.conversions],
          ["Mission points", a.earnings]
        ].map(([k, v]) => (
          <motion.div
            key={String(k)}
            whileHover={{ y: -2 }}
            className="rounded-md border border-white/10 bg-black/35 px-3 py-2 transition hover:border-[rgba(0,255,122,0.35)] hover:bg-black/60"
          >
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/55">{k}</div>
            <div className="mt-1 font-mono text-[14px] font-black tabular-nums text-white/92">{String(v)}</div>
          </motion.div>
        ))}
      </div>

      <div className="mt-3 rounded-md border border-white/10 bg-black/35 p-3">
        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/55">Recent</div>
        <div className="mt-2 space-y-2">
          {a.recent.slice(0, 3).map((r) => (
            <motion.div
              key={r.who + r.ts}
              whileHover={{ y: -2 }}
              className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-black/30 px-3 py-2 transition hover:border-[rgba(0,255,122,0.35)] hover:bg-black/60"
            >
              <div className="text-[12px] font-semibold text-white/80">
                {r.who} •{" "}
                <span
                  className="rounded-md border border-white/10 bg-black/40 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em]"
                  style={{
                    borderColor:
                      r.status === "purchased"
                        ? "rgba(0,255,122,0.45)"
                        : r.status === "joined"
                          ? "rgba(255,215,0,0.35)"
                          : "rgba(255,255,255,0.18)",
                    color:
                      r.status === "purchased"
                        ? "#b4ffd8"
                        : r.status === "joined"
                          ? "#ffe7a1"
                          : "rgba(255,255,255,0.72)"
                  }}
                >
                  {r.status}
                </span>
              </div>
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">{timeAgo(r.ts)}</div>
            </motion.div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <motion.button
            type="button"
            onClick={() => onNavigate("affiliate")}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            className="rounded-md border border-[rgba(255,215,0,0.35)] bg-black/20 px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[color:var(--gold)]/90 hover:border-[rgba(255,215,0,0.7)]"
          >
            Quick Share
          </motion.button>
        </div>
      </div>
    </Card>
  );
}

function ActivityTimelineCard({
  themeMode,
  snapshots
}: {
  themeMode: ThemeMode;
  snapshots: DashboardSnapshots;
}) {
  const icon = (cat: string) => {
    if (cat === "program") return "rgba(255,215,0,0.75)";
    if (cat === "syndicate") return "rgba(0,255,255,0.55)";
    if (cat === "affiliate") return "rgba(0,255,122,0.55)";
    if (cat === "system") return "rgba(196,126,255,0.55)";
    return "rgba(255,255,255,0.25)";
  };

  return (
    <Card
      themeMode={themeMode}
      title="Activity Timeline"
      frameVariant="shell"
      right={<div className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">Unified</div>}
    >
      <div className="min-h-[min(42vh,380px)] max-h-[min(62vh,620px)] space-y-2 overflow-y-auto overflow-x-hidden pr-1 [scrollbar-color:rgba(197,179,88,0.35)_transparent]">
        {snapshots.activity.slice(0, 10).map((a) => (
          <div
            key={a.id}
            className="flex items-start justify-between gap-3 rounded-md border border-[rgba(197,179,88,0.18)] bg-black/40 px-3 py-2.5 md:px-4 md:py-3"
          >
            <div className="flex min-w-0 items-start gap-2">
              <span className="mt-[5px] inline-flex h-2.5 w-2.5 rounded-full" style={{ background: icon(a.category), boxShadow: `0 0 14px ${icon(a.category)}` }} />
              <div className="min-w-0">
                <div className="truncate text-[12px] font-semibold text-white/78">
                  {a.title}{" "}
                  <span className="ml-2 rounded-md border border-white/10 bg-black/40 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-white/50">
                    {a.category}
                  </span>
                </div>
                {a.detail ? <div className="truncate text-[12px] text-white/58">{a.detail}</div> : null}
              </div>
            </div>
            <div className="shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] text-white/45">{timeAgo(a.ts)}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function DashboardControlCenter({
  themeMode,
  userName,
  userRole,
  profileAvatar,
  courses,
  onNavigate
}: {
  themeMode: ThemeMode;
  userName: string;
  userRole: string;
  profileAvatar: string;
  courses: DashboardCourseLike[];
  onNavigate: (nav: DashboardNavKey) => void;
}) {
  const { snapshots } = useDashboardSnapshots({ userName, courses });
  const integrityHigh = snapshots.coreIntegrity.integrityPct > 90;

  return (
    <div
      className={cn(
        "relative w-full max-w-none space-y-5 rounded-lg transition-[box-shadow] duration-700 md:space-y-6 lg:space-y-7",
        integrityHigh && "dashboard-integrity-pulse"
      )}
    >
      <div className="ghost-muted w-full min-w-0 max-w-none space-y-5 md:space-y-6 lg:space-y-7">
        <HeroStatusPanel
          themeMode={themeMode}
          userName={userName}
          userRole={userRole}
          profileAvatar={profileAvatar}
          snapshots={snapshots}
          onNavigate={onNavigate}
        />

        <MissionCommandDeckCard themeMode={themeMode} />

        <GoalPathSystem themeMode={themeMode} courses={courses} onNavigate={onNavigate} />

        <AffiliateSnapshotCard themeMode={themeMode} snapshots={snapshots} onNavigate={onNavigate} />

        <ActivityTimelineCard themeMode={themeMode} snapshots={snapshots} />
      </div>
    </div>
  );
}

