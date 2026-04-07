"use client";

/**
 * Standalone route for the membership hub (same component as the dashboard shell).
 * Primary UX: open via sidebar “Membership section” on the main dashboard.
 */
import { MembershipContentHub } from "@/components/membership/MembershipContentHub";

export default function MembershipContentPage() {
  return (
    <div className="min-h-screen bg-[#060606] p-6 text-white">
      <div className="shell-neon-yellow cut-frame cyber-frame gold-stroke relative mx-auto max-w-6xl border bg-[#060606]/70 p-6 sm:p-8">
        <div className="absolute inset-0 opacity-70 [background:radial-gradient(820px_520px_at_40%_0%,rgba(250,204,21,0.09),rgba(0,0,0,0)_64%)]" />
        <div className="relative">
          <MembershipContentHub />
        </div>
      </div>
    </div>
  );
}
