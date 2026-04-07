"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { getDevLoginLine, getDevLoginPassword, getDevLoginUsername } from "@/lib/devCredentials";
import { authRequired, getApiDisplayHint, readStoredAccess } from "@/lib/portal-api";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (user || readStoredAccess()) {
      router.replace("/");
    }
  }, [user, loading, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  const hint =
    process.env.NODE_ENV === "development"
      ? `API: ${getApiDisplayHint()} · Also: viewer1, admin1 (same password). Direct browser→Django: set NEXT_PUBLIC_API_BASE=http://127.0.0.1:8000 in .env.local (otherwise Next proxy is used).`
      : null;

  function fillDevCredentials() {
    setUsername(getDevLoginUsername());
    setPassword(getDevLoginPassword());
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4 text-white">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-lg border border-[rgba(255,215,0,0.35)] bg-[#0a0a0a]/95 p-8 shadow-[0_0_40px_rgba(255,215,0,0.12)]"
      >
        <h1 className="text-lg font-black uppercase tracking-[0.2em] text-[color:var(--gold)]/95">
          Syndicate access
        </h1>
        <p className="mt-2 text-[13px] text-white/55">
          Sign in to sync missions, reminders, notes, and social links with the portal API.
        </p>
        {!authRequired() ? (
          <p className="mt-2 text-[11px] text-amber-200/80">
            Auth gate is off (<code className="font-mono">NEXT_PUBLIC_AUTH_REQUIRED=false</code>). You can open the
            dashboard directly; login is optional for API-backed data.
          </p>
        ) : null}
        {process.env.NODE_ENV === "development" ? (
          <div className="mt-4 rounded-md border border-[rgba(0,255,122,0.35)] bg-[rgba(0,255,122,0.06)] px-3 py-2.5">
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-[#b4ffd8]/90">Dev credentials</div>
            <p className="mt-1 font-mono text-[12px] text-white/88">
              <span className="text-white/50">user / pass</span> {getDevLoginLine()}
            </p>
            <p className="mt-1 text-[10px] text-white/45">
              Run <code className="rounded bg-black/40 px-1">python manage.py seed_portal</code> in Backend first (resets
              these passwords unless <code className="rounded bg-black/40 px-1">--no-reset-password</code>).
            </p>
            <button
              type="button"
              onClick={fillDevCredentials}
              className="mt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#b4ffd8] underline hover:text-white"
            >
              Fill username &amp; password
            </button>
          </div>
        ) : null}
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">
              Username or email
            </label>
            <input
              className="mt-1 w-full rounded-md border border-white/15 bg-black/50 px-3 py-2 font-mono text-[14px] text-white outline-none focus:border-[rgba(255,215,0,0.5)]"
              autoComplete="username"
              placeholder="demo or demo@example.com"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">Password</label>
            <div className="relative mt-1">
              <input
                className="w-full rounded-md border border-white/15 bg-black/50 py-2 pl-3 pr-11 font-mono text-[14px] text-white outline-none focus:border-[rgba(255,215,0,0.5)]"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-label="Password"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded border border-white/10 bg-black/50 text-white/55 transition hover:border-[rgba(255,215,0,0.35)] hover:text-[color:var(--gold)]"
                title={showPassword ? "Hide password" : "Show password"}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {/* Eye = password visible; EyeOff = hidden (matches what you see on screen) */}
                {showPassword ? <Eye className="h-4 w-4" strokeWidth={2} /> : <EyeOff className="h-4 w-4" strokeWidth={2} />}
              </button>
            </div>
          </div>
          {error ? <div className="text-[13px] text-red-300/95">{error}</div> : null}
          <motion.button
            type="submit"
            disabled={busy}
            whileTap={{ scale: 0.99 }}
            className="w-full rounded-md border border-[rgba(255,215,0,0.45)] bg-[rgba(255,215,0,0.12)] py-2.5 text-[11px] font-black uppercase tracking-[0.18em] text-[color:var(--gold)] hover:bg-[rgba(255,215,0,0.18)] disabled:opacity-50"
          >
            {busy ? "Signing in…" : "Enter dashboard"}
          </motion.button>
        </form>
        {hint ? <p className="mt-4 text-[11px] leading-relaxed text-white/40">{hint}</p> : null}
      </motion.div>
    </div>
  );
}
