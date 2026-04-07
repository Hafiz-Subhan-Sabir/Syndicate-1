export type GoalId = "web_dev" | "digital_marketing" | "youtube" | "money_online" | "ai_automation";

export type RoadmapStep = {
  id: string;
  title: string;
  outcome: string;
  why: string;
  earningAfter: string;
  icon: string;
};

export type CourseRec = {
  id: string;
  title: string;
  outcome: string;
  earningHint: string;
};

export const GOAL_OPTIONS: { id: GoalId; label: string; short: string }[] = [
  { id: "web_dev", label: "Web Developer", short: "Web" },
  { id: "digital_marketing", label: "Digital Marketer", short: "Growth" },
  { id: "youtube", label: "YouTube Creator", short: "YT" },
  { id: "money_online", label: "Make Money Online", short: "MMO" },
  { id: "ai_automation", label: "AI / Automation", short: "AI" }
];

export const ROADMAPS: Record<GoalId, RoadmapStep[]> = {
  web_dev: [
    {
      id: "html",
      title: "HTML / CSS",
      outcome: "Structure & style any layout",
      why: "Every interface starts here — non-negotiable foundation.",
      earningAfter: "Small landing-page gigs ($50–$200)",
      icon: "◆"
    },
    {
      id: "js",
      title: "JavaScript",
      outcome: "Make websites interactive",
      why: "Required for React and real client projects.",
      earningAfter: "Script fixes & mini tools ($100–$400)",
      icon: "◇"
    },
    {
      id: "react",
      title: "React",
      outcome: "Component-driven UIs at scale",
      why: "Industry default for product teams and freelance briefs.",
      earningAfter: "Start freelancing UI builds ($400–$1.5k)",
      icon: "◈"
    },
    {
      id: "next",
      title: "Next.js",
      outcome: "Full pages with routing & data",
      why: "Matches how modern apps ship — portfolio + client work.",
      earningAfter: "Productized sites & retainers ($800–$3k)",
      icon: "▣"
    },
    {
      id: "backend",
      title: "Backend basics",
      outcome: "APIs, auth, databases",
      why: "Unlock “full stack” quotes and SaaS ideas.",
      earningAfter: "Build MVPs for clients ($1.5k–$8k)",
      icon: "⬡"
    },
    {
      id: "freelance",
      title: "Freelancing",
      outcome: "Repeatable client pipeline",
      why: "Turn skills into predictable income.",
      earningAfter: "Stack projects & referrals ($2k–$10k+/mo)",
      icon: "★"
    }
  ],
  digital_marketing: [
    {
      id: "dm_base",
      title: "Marketing foundations",
      outcome: "ICP, offer, positioning",
      why: "Without clarity, ads and content waste budget.",
      earningAfter: "Audit & strategy mini-offers ($200–$800)",
      icon: "◎"
    },
    {
      id: "content",
      title: "Content systems",
      outcome: "Consistent organic reach",
      why: "Trust before you scale paid spend.",
      earningAfter: "Content retainers ($500–$2k/mo)",
      icon: "✎"
    },
    {
      id: "seo",
      title: "SEO",
      outcome: "Rank for intent keywords",
      why: "Compounds — unlike one-off campaigns.",
      earningAfter: "SEO setup projects ($800–$3k)",
      icon: "⌁"
    },
    {
      id: "ads",
      title: "Paid ads",
      outcome: "Profitable acquisition loops",
      why: "Scale what already converts.",
      earningAfter: "Ad management % or flat ($1k–$5k/mo)",
      icon: "▲"
    },
    {
      id: "analytics",
      title: "Analytics",
      outcome: "Prove ROI with data",
      why: "Keeps clients renewing.",
      earningAfter: "Reporting dashboards ($400–$1.5k)",
      icon: "◉"
    },
    {
      id: "monetize_dm",
      title: "Monetize stack",
      outcome: "Productized services",
      why: "Package expertise into sellable ladders.",
      earningAfter: "High-ticket funnels ($5k–$20k+)",
      icon: "★"
    }
  ],
  youtube: [
    {
      id: "niche",
      title: "Niche & promise",
      outcome: "Clear channel thesis",
      why: "Algorithm rewards consistency + specificity.",
      earningAfter: "Sponsorship prep (small deals)",
      icon: "◎"
    },
    {
      id: "film",
      title: "Filming workflow",
      outcome: "Fast, repeatable setup",
      why: "Volume without burnout.",
      earningAfter: "B-roll / templates for others",
      icon: "▶"
    },
    {
      id: "edit",
      title: "Editing",
      outcome: "Retention-first pacing",
      why: "Watch time > vanity metrics.",
      earningAfter: "Edit gigs ($150–$600/video)",
      icon: "✂"
    },
    {
      id: "thumb",
      title: "Thumbnails",
      outcome: "Click-worthy frames",
      why: "CTR is half the battle.",
      earningAfter: "Thumbnail packs for creators",
      icon: "◆"
    },
    {
      id: "publish",
      title: "Publishing rhythm",
      outcome: "Upload + community loop",
      why: "Compounding audience growth.",
      earningAfter: "Affiliate + digital products",
      icon: "⏱"
    },
    {
      id: "yt_money",
      title: "Monetization",
      outcome: "Ads, sponsors, products",
      why: "Diversify beyond AdSense.",
      earningAfter: "Brand deals ($500–$10k+)",
      icon: "★"
    }
  ],
  money_online: [
    {
      id: "mindset",
      title: "Operator mindset",
      outcome: "Bias to shipping",
      why: "Execution beats endless research.",
      earningAfter: "Consulting intros ($100–$400)",
      icon: "◉"
    },
    {
      id: "offer",
      title: "Irresistible offer",
      outcome: "One clear transformation",
      why: "Conversion lives or dies here.",
      earningAfter: "Low-ticket info products ($27–$97)",
      icon: "◇"
    },
    {
      id: "traffic",
      title: "Traffic engine",
      outcome: "One channel mastered",
      why: "Focus beats scattered posts.",
      earningAfter: "Lead-gen for small biz ($500–$2k)",
      icon: "⌁"
    },
    {
      id: "funnel",
      title: "Funnel & email",
      outcome: "Capture → nurture → sell",
      why: "LTV > one-time sales.",
      earningAfter: "Funnel builds ($2k–$8k)",
      icon: "⬡"
    },
    {
      id: "scale",
      title: "Scale & systems",
      outcome: "Automate delivery",
      why: "Time leverage = real freedom.",
      earningAfter: "SaaS / cohort programs ($5k–$30k)",
      icon: "★"
    }
  ],
  ai_automation: [
    {
      id: "prompt",
      title: "Prompting craft",
      outcome: "Reliable outputs every time",
      why: "Quality gates everything downstream.",
      earningAfter: "Prompt packs & audits ($150–$600)",
      icon: "✎"
    },
    {
      id: "api",
      title: "APIs & tools",
      outcome: "Wire models into apps",
      why: "From chat to product.",
      earningAfter: "Integration micro-projects ($800–$3k)",
      icon: "◈"
    },
    {
      id: "agents",
      title: "Agents & workflows",
      outcome: "Multi-step automation",
      why: "Replace repetitive ops work.",
      earningAfter: "Ops automation retainers ($1.5k–$6k/mo)",
      icon: "⬡"
    },
    {
      id: "data",
      title: "Data & evaluation",
      outcome: "Measure what breaks",
      why: "Trust + iterate safely.",
      earningAfter: "Eval harness builds ($1k–$4k)",
      icon: "◉"
    },
    {
      id: "product",
      title: "Ship a product",
      outcome: "Packaged AI utility",
      why: "Recurring > one-off prompts.",
      earningAfter: "Micro-SaaS or templates ($2k–$15k/mo)",
      icon: "★"
    }
  ]
};

/** Three course cards: [support, focus, future] — middle is “recommended now”. */
export function coursesForGoalStep(goal: GoalId, stepIndex: number): CourseRec[] {
  const step = ROADMAPS[goal][stepIndex];
  const prev = ROADMAPS[goal][stepIndex - 1];
  const next = ROADMAPS[goal][stepIndex + 1];
  const label = GOAL_OPTIONS.find((g) => g.id === goal)?.label ?? "Path";

  const support: CourseRec = {
    id: `${goal}-prev`,
    title: prev ? `${prev.title} — deep dive` : `${label} — foundations`,
    outcome: prev ? `Solidify ${prev.title.toLowerCase()}` : "Lock in core habits before you scale",
    earningHint: prev ? "$200–$800 per project" : "$100–$500 starter gigs"
  };

  const focus: CourseRec = {
    id: `${goal}-focus-${step?.id ?? "x"}`,
    title: step ? `${step.title} — project sprint` : "Path accelerator",
    outcome: step?.outcome ?? "Stay on the critical path",
    earningHint: "$400–$2k as skills compound"
  };

  const future: CourseRec = {
    id: `${goal}-next`,
    title: next ? `Preview: ${next.title}` : "Advanced portfolio build",
    outcome: next ? `Prep for ${next.title}` : "Stand out with shipped work",
    earningHint: next ? "Complete current step to unlock" : "$800–$5k+ at mastery"
  };

  return [support, focus, future];
}

/** Match dashboard course titles to the middle “focus” card when possible. */
export function personalizeCourses(
  goal: GoalId,
  stepIdx: number,
  triple: [CourseRec, CourseRec, CourseRec],
  courses: { title: string }[]
): [CourseRec, CourseRec, CourseRec] {
  if (!courses.length) return triple;
  const step = ROADMAPS[goal][stepIdx];
  if (!step) return triple;
  const token =
    step.title
      .split(/[\s/]+/)[0]
      ?.toLowerCase()
      .replace(/[^a-z0-9]/g, "") ?? "";
  if (token.length < 2) return triple;
  const match = courses.find((c) => c.title.toLowerCase().includes(token));
  if (!match) return triple;
  const [a, b, c] = triple;
  return [a, { ...b, title: match.title }, c];
}
