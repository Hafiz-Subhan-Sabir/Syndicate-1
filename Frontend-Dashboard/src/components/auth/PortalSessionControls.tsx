"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { authRequired } from "@/lib/portal-api";
import { themeAccent, type ThemeMode } from "@/components/dashboard/dashboardPrimitives";

export function PortalSessionControls({ themeMode }: { themeMode: ThemeMode }) {
  const { user, logout, loading } = useAuth();
  const t = themeAccent(themeMode);

  if (loading) {
    return (
      <div className="rounded-md border border-white/10 bg-black/30 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-white/35">
        Session…
      </div>
    );
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="rounded-md border bg-black/35 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--gold)]/90 hover:bg-black/55"
        style={{ borderColor: t.border, boxShadow: `0 0 0 1px ${t.glow}33` }}
      >
        Portal login
      </Link>
    );
  }

  return (
    <div
      className="flex items-center gap-2 rounded-md border border-white/12 bg-black/35 px-2 py-1"
      style={{ boxShadow: `0 0 0 1px ${t.glow}22` }}
    >
      <span className="max-w-[120px] truncate font-mono text-[10px] font-bold text-white/75" title={user.username}>
        {user.username}
      </span>
      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        onClick={() => void logout()}
        className="rounded border border-white/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-white/55 hover:border-red-400/40 hover:text-red-200/90"
      >
        Logout
      </motion.button>
      {!authRequired() ? (
        <span className="hidden text-[8px] text-white/30 sm:inline" title="Dashboard reachable without login">
          gate off
        </span>
      ) : null}
    </div>
  );
}
