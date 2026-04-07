"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/components/dashboard/dashboardPrimitives";
import { faviconUrlFromHref } from "@/lib/socialBranding";

/** Same-tab navigation (no target="_blank"). */
function openSameTab(href: string) {
  window.location.assign(href);
}

function resolveIframeSrc(href: string, explicit?: string): string {
  if (explicit?.trim()) return explicit.trim();
  try {
    const u = new URL(href);
    if ((u.hostname === "www.youtube.com" || u.hostname === "youtube.com") && u.searchParams.get("v")) {
      return `https://www.youtube-nocookie.com/embed/${u.searchParams.get("v")}`;
    }
    if (u.hostname === "youtu.be") {
      const id = u.pathname.replace(/^\//, "").split("/")[0];
      if (id) return `https://www.youtube-nocookie.com/embed/${id}`;
    }
  } catch {
    /* ignore */
  }
  return href;
}

export type QuickAccessTool = {
  id: string;
  label: string;
  href: string;
  iframeSrc?: string;
  embedInApp: boolean;
};

/** Borders / text on tiles — match the parent deck accent (not global gold). */
export type QuickAccessTileAccent = {
  tileBorder: string;
  tileShadow: string;
  tileHoverBorder: string;
  /** Strong accent glow on tile hover (outer shadow stack). */
  tileHoverGlow: string;
  tileFocusRing: string;
  iconBorder: string;
  iconShadow?: string;
  /** Icon frame glow when parent tile is hovered. */
  iconHoverGlow: string;
  fallbackLetterClass: string;
  labelClass: string;
  footerClass: string;
  /** Divider under deck header row. */
  headerBorderClass: string;
  /** HUD pill border / text (matches deck). */
  hudChipClass: string;
};

export type QuickAccessCategory = {
  id: string;
  /** Small mono label above the main title (e.g. COMMS DECK). */
  deckLabel: string;
  /** Large HUD category title. */
  title: string;
  /** Pill on the top-right of each deck. */
  hudLabel?: string;
  deckClassName: string;
  /** Accent glow along the top edge of the deck. */
  topGlowClass: string;
  /** Inner tiles + HUD header line: same palette as deck border. */
  tileAccent: QuickAccessTileAccent;
  tools: QuickAccessTool[];
};

export const QUICK_ACCESS_CATEGORIES: QuickAccessCategory[] = [
  {
    id: "communication",
    deckLabel: "COMMS DECK",
    title: "COMMUNICATION",
    hudLabel: "HUD",
    topGlowClass: "opacity-[0.85] [background:radial-gradient(520px_180px_at_50%_0%,rgba(34,211,238,0.35),transparent_72%)]",
    deckClassName:
      "border-cyan-400/40 bg-gradient-to-b from-cyan-950/40 via-[#060606]/96 to-[#050505] shadow-[0_0_0_1px_rgba(34,211,238,0.15),0_0_28px_rgba(34,211,238,0.08),inset_0_1px_0_rgba(255,255,255,0.05)]",
    tileAccent: {
      headerBorderClass: "border-cyan-400/22",
      tileBorder: "border-cyan-400/30",
      tileShadow:
        "shadow-[0_0_0_1px_rgba(34,211,238,0.12),0_8px_28px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(34,211,238,0.07)]",
      tileHoverBorder: "hover:border-cyan-300/80",
      tileHoverGlow:
        "hover:shadow-[0_0_0_1px_rgba(34,211,238,0.7),0_0_32px_rgba(34,211,238,0.55),0_0_64px_rgba(34,211,238,0.3),0_0_96px_rgba(34,211,238,0.14),inset_0_1px_0_rgba(34,211,238,0.22)]",
      tileFocusRing: "focus-visible:ring-2 focus-visible:ring-cyan-400/45",
      iconBorder: "border-cyan-400/45",
      iconShadow: "shadow-[0_0_12px_rgba(34,211,238,0.12)]",
      iconHoverGlow:
        "group-hover:border-cyan-200/75 group-hover:shadow-[0_0_22px_rgba(34,211,238,0.65),0_0_44px_rgba(34,211,238,0.32)]",
      fallbackLetterClass: "text-cyan-200/70",
      labelClass: "text-cyan-100/95",
      footerClass: "text-cyan-200/55",
      hudChipClass: "border-cyan-400/35 text-cyan-100/85 bg-black/55"
    },
    tools: [
      { id: "gmail", label: "Gmail", href: "https://mail.google.com", embedInApp: false },
      { id: "slack", label: "Slack", href: "https://slack.com", embedInApp: false },
      { id: "meet", label: "Meet", href: "https://meet.google.com", embedInApp: false },
      { id: "discord", label: "Discord", href: "https://discord.com", embedInApp: false },
      { id: "teams", label: "Teams", href: "https://teams.microsoft.com", embedInApp: false },
      { id: "zoom", label: "Zoom", href: "https://zoom.us", embedInApp: false }
    ]
  },
  {
    id: "productivity",
    deckLabel: "OPS DECK",
    title: "PRODUCTIVITY",
    hudLabel: "HUD",
    topGlowClass: "opacity-[0.9] [background:radial-gradient(520px_180px_at_50%_0%,rgba(192,132,252,0.38),transparent_72%)]",
    deckClassName:
      "border-fuchsia-500/38 bg-gradient-to-b from-purple-950/45 via-[#07060c]/96 to-[#050505] shadow-[0_0_0_1px_rgba(192,132,252,0.16),0_0_28px_rgba(168,85,247,0.1),inset_0_1px_0_rgba(255,255,255,0.05)]",
    tileAccent: {
      headerBorderClass: "border-fuchsia-400/22",
      tileBorder: "border-fuchsia-400/32",
      tileShadow:
        "shadow-[0_0_0_1px_rgba(192,132,252,0.14),0_8px_28px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(192,132,252,0.08)]",
      tileHoverBorder: "hover:border-fuchsia-300/78",
      tileHoverGlow:
        "hover:shadow-[0_0_0_1px_rgba(217,70,239,0.65),0_0_32px_rgba(192,132,252,0.52),0_0_64px_rgba(168,85,247,0.32),0_0_96px_rgba(147,51,234,0.14),inset_0_1px_0_rgba(232,121,249,0.18)]",
      tileFocusRing: "focus-visible:ring-2 focus-visible:ring-fuchsia-400/45",
      iconBorder: "border-fuchsia-400/48",
      iconShadow: "shadow-[0_0_12px_rgba(168,85,247,0.15)]",
      iconHoverGlow:
        "group-hover:border-fuchsia-200/72 group-hover:shadow-[0_0_22px_rgba(217,70,239,0.58),0_0_46px_rgba(168,85,247,0.35)]",
      fallbackLetterClass: "text-fuchsia-200/70",
      labelClass: "text-fuchsia-100/95",
      footerClass: "text-fuchsia-200/55",
      hudChipClass: "border-fuchsia-400/38 text-fuchsia-100/88 bg-black/55"
    },
    tools: [
      { id: "notion", label: "Notion", href: "https://www.notion.so", embedInApp: false },
      { id: "gdocs", label: "Docs", href: "https://docs.google.com", embedInApp: false },
      { id: "trello", label: "Trello", href: "https://trello.com", embedInApp: false },
      { id: "drive", label: "Drive", href: "https://drive.google.com", embedInApp: false },
      { id: "calendar", label: "Calendar", href: "https://calendar.google.com", embedInApp: false },
      { id: "figma", label: "Figma", href: "https://www.figma.com", embedInApp: false }
    ]
  },
  {
    id: "business",
    deckLabel: "LEDGER DECK",
    title: "BUSINESS",
    hudLabel: "HUD",
    topGlowClass: "opacity-[0.88] [background:radial-gradient(520px_180px_at_50%_0%,rgba(255,215,0,0.22),transparent_70%)]",
    deckClassName:
      "border-[rgba(255,215,0,0.42)] bg-gradient-to-b from-[rgba(255,215,0,0.08)] via-[#060606]/96 to-[#050505] shadow-[0_0_0_1px_rgba(255,215,0,0.14),0_0_32px_rgba(255,215,0,0.07),inset_0_1px_0_rgba(255,255,255,0.05)]",
    tileAccent: {
      headerBorderClass: "border-[rgba(255,215,0,0.22)]",
      tileBorder: "border-[rgba(255,215,0,0.32)]",
      tileShadow:
        "shadow-[0_0_0_1px_rgba(255,215,0,0.12),0_8px_28px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,215,0,0.07)]",
      tileHoverBorder: "hover:border-[rgba(255,230,120,0.78)]",
      tileHoverGlow:
        "hover:shadow-[0_0_0_1px_rgba(255,215,0,0.75),0_0_32px_rgba(255,215,0,0.45),0_0_64px_rgba(255,200,0,0.22),0_0_96px_rgba(255,180,0,0.1),inset_0_1px_0_rgba(255,235,150,0.18)]",
      tileFocusRing: "focus-visible:ring-2 focus-visible:ring-[rgba(255,215,0,0.4)]",
      iconBorder: "border-[rgba(255,215,0,0.45)]",
      iconShadow: "shadow-[0_0_12px_rgba(255,215,0,0.1)]",
      iconHoverGlow:
        "group-hover:border-[rgba(255,235,160,0.85)] group-hover:shadow-[0_0_22px_rgba(255,215,0,0.55),0_0_44px_rgba(255,200,0,0.28)]",
      fallbackLetterClass: "text-[color:var(--gold)]/60",
      labelClass: "text-[color:var(--gold)]/92",
      footerClass: "text-[rgba(255,230,150,0.55)]",
      hudChipClass: "border-[rgba(255,215,0,0.38)] text-[color:var(--gold)]/88 bg-black/55"
    },
    tools: [
      { id: "linkedin-biz", label: "LinkedIn", href: "https://www.linkedin.com", embedInApp: false },
      { id: "stripe", label: "Stripe", href: "https://dashboard.stripe.com", embedInApp: false },
      { id: "paypal", label: "PayPal", href: "https://www.paypal.com", embedInApp: false },
      { id: "hubspot", label: "HubSpot", href: "https://www.hubspot.com", embedInApp: false },
      { id: "analytics", label: "Analytics", href: "https://analytics.google.com", embedInApp: false },
      { id: "sheets", label: "Sheets", href: "https://sheets.google.com", embedInApp: false }
    ]
  },
  {
    id: "social",
    deckLabel: "NET DECK",
    title: "SOCIAL",
    hudLabel: "HUD",
    topGlowClass: "opacity-[0.88] [background:radial-gradient(520px_180px_at_50%_0%,rgba(251,113,133,0.32),transparent_72%)]",
    deckClassName:
      "border-rose-500/40 bg-gradient-to-b from-rose-950/35 via-[#060606]/96 to-[#050505] shadow-[0_0_0_1px_rgba(251,113,133,0.14),0_0_28px_rgba(251,113,133,0.08),inset_0_1px_0_rgba(255,255,255,0.05)]",
    tileAccent: {
      headerBorderClass: "border-rose-400/22",
      tileBorder: "border-rose-400/32",
      tileShadow:
        "shadow-[0_0_0_1px_rgba(251,113,133,0.12),0_8px_28px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(251,113,133,0.07)]",
      tileHoverBorder: "hover:border-rose-300/78",
      tileHoverGlow:
        "hover:shadow-[0_0_0_1px_rgba(251,113,133,0.68),0_0_32px_rgba(251,113,133,0.5),0_0_64px_rgba(244,63,94,0.28),0_0_96px_rgba(225,29,72,0.12),inset_0_1px_0_rgba(254,205,211,0.15)]",
      tileFocusRing: "focus-visible:ring-2 focus-visible:ring-rose-400/45",
      iconBorder: "border-rose-400/48",
      iconShadow: "shadow-[0_0_12px_rgba(251,113,133,0.12)]",
      iconHoverGlow:
        "group-hover:border-rose-200/75 group-hover:shadow-[0_0_22px_rgba(251,113,133,0.6),0_0_44px_rgba(244,63,94,0.3)]",
      fallbackLetterClass: "text-rose-200/70",
      labelClass: "text-rose-50/95",
      footerClass: "text-rose-200/55",
      hudChipClass: "border-rose-400/38 text-rose-100/88 bg-black/55"
    },
    tools: [
      { id: "linkedin", label: "LinkedIn", href: "https://www.linkedin.com", embedInApp: false },
      { id: "x", label: "X", href: "https://x.com", embedInApp: false },
      { id: "instagram", label: "Instagram", href: "https://www.instagram.com", embedInApp: false },
      {
        id: "youtube",
        label: "YouTube",
        href: "https://www.youtube.com",
        iframeSrc: "https://www.youtube-nocookie.com/embed/ScMzIvxBSi4",
        embedInApp: true
      }
    ]
  },
  {
    id: "dev",
    deckLabel: "BUILD DECK",
    title: "DEV",
    hudLabel: "HUD",
    topGlowClass: "opacity-[0.88] [background:radial-gradient(520px_180px_at_50%_0%,rgba(52,211,153,0.32),transparent_72%)]",
    deckClassName:
      "border-emerald-500/42 bg-gradient-to-b from-emerald-950/38 via-[#060606]/96 to-[#050505] shadow-[0_0_0_1px_rgba(52,211,153,0.15),0_0_28px_rgba(16,185,129,0.09),inset_0_1px_0_rgba(255,255,255,0.05)]",
    tileAccent: {
      headerBorderClass: "border-emerald-400/22",
      tileBorder: "border-emerald-400/32",
      tileShadow:
        "shadow-[0_0_0_1px_rgba(52,211,153,0.12),0_8px_28px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(52,211,153,0.07)]",
      tileHoverBorder: "hover:border-emerald-300/78",
      tileHoverGlow:
        "hover:shadow-[0_0_0_1px_rgba(52,211,153,0.68),0_0_32px_rgba(16,185,129,0.52),0_0_64px_rgba(5,150,105,0.28),0_0_96px_rgba(4,120,87,0.12),inset_0_1px_0_rgba(167,243,208,0.16)]",
      tileFocusRing: "focus-visible:ring-2 focus-visible:ring-emerald-400/45",
      iconBorder: "border-emerald-400/48",
      iconShadow: "shadow-[0_0_12px_rgba(16,185,129,0.14)]",
      iconHoverGlow:
        "group-hover:border-emerald-200/75 group-hover:shadow-[0_0_22px_rgba(52,211,153,0.58),0_0_44px_rgba(16,185,129,0.32)]",
      fallbackLetterClass: "text-emerald-200/70",
      labelClass: "text-emerald-50/95",
      footerClass: "text-emerald-200/55",
      hudChipClass: "border-emerald-400/38 text-emerald-100/88 bg-black/55"
    },
    tools: [
      { id: "github", label: "GitHub", href: "https://github.com", embedInApp: false },
      { id: "vercel", label: "Vercel", href: "https://vercel.com", embedInApp: false },
      { id: "railway", label: "Railway", href: "https://railway.app", embedInApp: false },
      {
        id: "mdn",
        label: "MDN",
        href: "https://developer.mozilla.org",
        embedInApp: true
      },
      { id: "stackoverflow", label: "Stack Overflow", href: "https://stackoverflow.com", embedInApp: false },
      { id: "codesandbox", label: "CodeSandbox", href: "https://codesandbox.io", embedInApp: false }
    ]
  }
];

const IFRAME_SANDBOX =
  "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads";

export type QuickAccessGridProps = {
  siteName?: string;
  viewerTitle?: string;
  helpText?: string;
  className?: string;
  categories?: QuickAccessCategory[];
  /** Full-bleed panel: fills parent width/height, scrolls internally. */
  variant?: "default" | "fullWidth";
};

function QuickAccessTile({
  tool,
  accent,
  onActivate
}: {
  tool: QuickAccessTool;
  accent: QuickAccessTileAccent;
  onActivate: (tool: QuickAccessTool) => void;
}) {
  const [iconOk, setIconOk] = useState(true);
  const fav = faviconUrlFromHref(tool.href);
  const footer = tool.embedInApp ? "Viewer · same tab fallback" : "Same tab · direct";

  return (
    <motion.button
      type="button"
      whileHover={{ y: -3, scale: 1.015 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onActivate(tool)}
      aria-label={`Open ${tool.label} in this tab`}
      className={cn(
        "compact-card-ui group flex min-h-[6.5rem] w-full max-w-full flex-col items-center justify-between rounded-xl border bg-gradient-to-b from-[#0c0c0c]/98 to-[#040404]/98 px-2 py-2.5 text-center outline-none sm:min-h-[7rem] sm:px-2 sm:py-3",
        "touch-manipulation select-none",
        "motion-safe:transition-[box-shadow,border-color,filter] motion-safe:duration-300 motion-safe:ease-out",
        accent.tileBorder,
        accent.tileShadow,
        accent.tileHoverBorder,
        accent.tileHoverGlow,
        "hover:brightness-[1.06] motion-reduce:hover:brightness-100",
        accent.tileFocusRing
      )}
    >
      <div
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-lg border bg-black/70 motion-safe:transition-[box-shadow,border-color] motion-safe:duration-300 motion-safe:ease-out sm:h-12 sm:w-12",
          accent.iconBorder,
          accent.iconShadow,
          accent.iconHoverGlow
        )}
      >
        {fav && iconOk ? (
          <img
            src={fav}
            alt=""
            width={26}
            height={26}
            className="h-[22px] w-[22px] object-contain opacity-95 motion-safe:transition-opacity sm:h-[26px] sm:w-[26px] group-hover:opacity-100"
            loading="lazy"
            onError={() => setIconOk(false)}
          />
        ) : (
          <span className={cn("text-base font-black", accent.fallbackLetterClass)} aria-hidden>
            {tool.label.slice(0, 1).toUpperCase()}
          </span>
        )}
      </div>
      <div className="mt-2 min-h-[2.25rem] w-full px-0.5">
        <span
          className={cn(
            "block text-[9px] font-black uppercase leading-snug tracking-[0.14em] sm:text-[11px] sm:tracking-[0.16em]",
            accent.labelClass
          )}
        >
          {tool.label}
        </span>
      </div>
      <div
          className={cn(
          "mt-1 text-[6.5px] font-mono font-semibold uppercase leading-tight tracking-[0.12em] opacity-90 sm:text-[8px] sm:tracking-[0.14em]",
          accent.footerClass,
          "motion-safe:transition-opacity motion-safe:duration-300 group-hover:opacity-100"
        )}
      >
        {footer}
      </div>
    </motion.button>
  );
}

function InAppViewerModal({
  open,
  onClose,
  src,
  pageHref,
  title,
  viewerDialogLabel
}: {
  open: boolean;
  onClose: () => void;
  src: string;
  pageHref: string;
  title: string;
  viewerDialogLabel: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const openFull = useCallback(() => {
    openSameTab(pageHref);
  }, [pageHref]);

  return (
    <AnimatePresence mode="sync">
      {open ? (
        <motion.div
          key="quick-access-viewer-root"
          className="fixed inset-0 z-[220] flex items-center justify-center p-3 sm:p-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.button
            type="button"
            aria-label="Close viewer backdrop"
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            key="quick-access-viewer-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={viewerDialogLabel}
            className={cn(
              "relative z-[221] flex h-[min(92vh,820px)] w-[min(96vw,1120px)] flex-col overflow-hidden",
              "cut-frame cyber-frame gold-stroke border border-[rgba(255,215,0,0.35)] bg-[#050505]/96 shadow-[0_0_60px_rgba(0,0,0,0.75)]"
            )}
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
          >
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-black/50 px-3 py-2.5 sm:px-4">
              <div className="min-w-0">
                <div className="truncate text-[11px] font-black uppercase tracking-[0.18em] text-[color:var(--gold)]/90">
                  {title}
                </div>
                <div className="mt-0.5 truncate font-mono text-[10px] text-white/45">{pageHref}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={openFull}
                  className="rounded-md border border-[rgba(255,215,0,0.4)] bg-[rgba(255,215,0,0.08)] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-[color:var(--gold)] hover:bg-[rgba(255,215,0,0.14)]"
                >
                  Open full page
                </motion.button>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onClose}
                  className="rounded-md border border-white/15 bg-black/40 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/75 hover:border-white/25 hover:text-white"
                >
                  Close
                </motion.button>
              </div>
            </div>

            <div className="relative min-h-0 flex-1 bg-black">
              <iframe
                title={title}
                src={src}
                className="h-full w-full border-0"
                sandbox={IFRAME_SANDBOX}
                referrerPolicy="strict-origin-when-cross-origin"
                allow="fullscreen; clipboard-write"
              />
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function QuickAccessGrid({
  siteName = "The Syndicate",
  viewerTitle,
  helpText,
  className,
  categories = QUICK_ACCESS_CATEGORIES,
  variant = "default"
}: QuickAccessGridProps) {
  const resolvedViewerTitle = viewerTitle ?? `${siteName} · viewer`;
  const resolvedHelp =
    helpText ??
    `Launch tools in this tab. When in-app preview is available, ${siteName} opens the viewer first; otherwise the destination loads directly. No new tabs.`;

  const [viewer, setViewer] = useState<{ src: string; href: string; label: string } | null>(null);

  const onActivate = useCallback((tool: QuickAccessTool) => {
    if (!tool.embedInApp) {
      openSameTab(tool.href);
      return;
    }
    const src = resolveIframeSrc(tool.href, tool.iframeSrc);
    setViewer({ src, href: tool.href, label: tool.label });
  }, []);

  const closeViewer = useCallback(() => setViewer(null), []);

  const isFull = variant === "fullWidth";

  return (
    <>
      <div
        className={cn(
          "flex w-full max-w-none min-w-0 flex-col",
          isFull && "h-full min-h-0 flex-1",
          className
        )}
      >
        <div className="shrink-0 border-b border-[rgba(197,179,88,0.14)] pb-[clamp(0.85rem,2vw+0.25rem,1.15rem)]">
          <h2 className="text-[clamp(0.95rem,2.2vw,1.2rem)] font-black uppercase italic tracking-[0.18em] text-[color:var(--gold)] drop-shadow-[0_0_24px_rgba(255,215,0,0.15)] sm:tracking-[0.22em]">
            Quick access
          </h2>
          <p className="mt-2 max-w-4xl text-[clamp(0.68rem,0.45vw+0.55rem,0.9rem)] leading-relaxed text-white/62 md:leading-relaxed">
            {resolvedHelp}
          </p>
        </div>

        <div
          className={cn(
            "min-h-0 w-full flex-1",
            isFull && "overflow-y-auto overflow-x-hidden pt-[clamp(1rem,2.5vw+0.35rem,1.35rem)] [scrollbar-color:rgba(197,179,88,0.45)_rgba(0,0,0,0.35)]",
            !isFull && "mt-[clamp(1rem,2.5vw+0.35rem,1.35rem)]"
          )}
        >
          <div
            className={cn(
              "grid w-full min-w-0 grid-cols-1 gap-[clamp(0.85rem,2vw+0.35rem,1.75rem)] sm:grid-cols-2",
              isFull && "pb-2"
            )}
          >
            {categories.map((cat) => (
              <div
                key={cat.id}
                className={cn(
                  "relative flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border p-[var(--fluid-deck-p)]",
                  "shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
                  cat.deckClassName
                )}
              >
                <div
                  className={cn("pointer-events-none absolute inset-x-0 top-0 h-28", cat.topGlowClass)}
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(420px_200px_at_80%_100%,rgba(0,0,0,0.5),transparent_65%)]"
                  aria-hidden
                />

                <div className="relative z-[1] flex min-w-0 flex-col gap-[clamp(0.85rem,2vw+0.25rem,1.15rem)]">
                  <div
                    className={cn(
                      "flex flex-wrap items-start justify-between gap-2 border-b pb-3",
                      cat.tileAccent.headerBorderClass
                    )}
                  >
                    <div className="min-w-0">
                      <div className="font-mono text-[clamp(0.5rem,0.35vw+0.38rem,0.65rem)] font-bold uppercase tracking-[0.2em] text-white/48">
                        {cat.deckLabel}
                      </div>
                      <div className="mt-1.5 text-[clamp(0.72rem,0.55vw+0.5rem,0.9rem)] font-black uppercase tracking-[0.2em] text-white/92 sm:tracking-[0.24em]">
                        {cat.title}
                      </div>
                    </div>
                    {cat.hudLabel ? (
                      <span
                        className={cn(
                          "shrink-0 rounded border px-2.5 py-1 font-mono text-[9px] font-black uppercase tracking-[0.16em]",
                          cat.tileAccent.hudChipClass
                        )}
                      >
                        {cat.hudLabel}
                      </span>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-2 gap-[clamp(0.45rem,1.2vw+0.2rem,0.9rem)] sm:grid-cols-3">
                    {cat.tools.map((tool) => (
                      <QuickAccessTile
                        key={tool.id}
                        tool={tool}
                        accent={cat.tileAccent}
                        onActivate={onActivate}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <InAppViewerModal
        open={viewer != null}
        onClose={closeViewer}
        src={viewer?.src ?? "about:blank"}
        pageHref={viewer?.href ?? ""}
        title={viewer ? `${resolvedViewerTitle} — ${viewer.label}` : resolvedViewerTitle}
        viewerDialogLabel={resolvedViewerTitle}
      />
    </>
  );
}
