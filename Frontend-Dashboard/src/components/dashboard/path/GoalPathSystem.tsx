"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { DashboardNavKey } from "../types";
import type { DashboardCourseLike } from "../useDashboardSnapshots";
import { themeAccent, type ThemeMode } from "../dashboardPrimitives";
import type { GoalId } from "./goalPathData";
import { ROADMAPS } from "./goalPathData";
import { PathSelector } from "./PathSelector";
import { CourseFlow } from "./CourseFlow";

const LS_KEY = "dashboarded:goal-path-v1";

type Persisted = {
  goal: GoalId;
  stepByGoal: Partial<Record<GoalId, number>>;
};

function readPersist(): Persisted {
  if (typeof window === "undefined") return { goal: "web_dev", stepByGoal: {} };
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return { goal: "web_dev", stepByGoal: {} };
    const j = JSON.parse(raw) as Partial<Persisted>;
    const goal = (j.goal as GoalId) ?? "web_dev";
    if (!ROADMAPS[goal]) return { goal: "web_dev", stepByGoal: {} };
    return { goal, stepByGoal: typeof j.stepByGoal === "object" && j.stepByGoal ? j.stepByGoal : {} };
  } catch {
    return { goal: "web_dev", stepByGoal: {} };
  }
}

function writePersist(p: Persisted) {
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

export function GoalPathSystem({
  themeMode,
  courses,
  onNavigate
}: {
  themeMode: ThemeMode;
  courses: DashboardCourseLike[];
  onNavigate: (nav: DashboardNavKey) => void;
}) {
  const t = themeAccent(themeMode);
  const [persist, setPersist] = useState<Persisted>(() => readPersist());

  useEffect(() => {
    writePersist(persist);
  }, [persist]);

  const goal = persist.goal;
  const maxLen = ROADMAPS[goal].length;
  const currentIndex = Math.max(0, persist.stepByGoal[goal] ?? 0);

  const setGoal = useCallback((g: GoalId) => {
    setPersist((p) => ({ ...p, goal: g }));
  }, []);

  const courseStepIdx = Math.min(currentIndex, Math.max(0, maxLen - 1));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="cut-frame cyber-frame gold-stroke relative w-full min-w-0 max-w-none overflow-hidden border border-[rgba(197,179,88,0.32)] bg-[#050505]/90 fluid-shell-p backdrop-blur-[12px]"
      style={{
        borderColor: t.border,
        boxShadow: `0 0 0 1px ${t.glow}, 0 0 48px rgba(250,204,21,0.06), 0 24px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,215,0,0.06)`
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-100 [background:radial-gradient(ellipse_120%_70%_at_50%_-15%,rgba(250,204,21,0.11),rgba(0,0,0,0)_55%),radial-gradient(900px_420px_at_85%_0%,rgba(197,179,88,0.07),rgba(0,0,0,0)_58%),linear-gradient(180deg,rgba(255,215,0,0.03),rgba(0,0,0,0)_28%)]"
        aria-hidden
      />
      <div className="relative">
        <div className="sm:mt-1">
          <PathSelector selected={goal} onSelect={setGoal} />
        </div>
        <CourseFlow goal={goal} courses={courses} userStepIndex={courseStepIdx} onNavigate={onNavigate} />
      </div>
    </motion.div>
  );
}
