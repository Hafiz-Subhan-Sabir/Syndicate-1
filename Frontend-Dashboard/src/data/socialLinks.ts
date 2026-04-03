/**
 * Default quick-access social / productivity links (clone-ready for API or DB).
 * Replace hrefs with your workspace URLs if needed.
 */
export type SocialLinkAccent = "gold" | "ice" | "green" | "violet";

export type SocialLinkItem = {
  id: string;
  label: string;
  href: string;
  accent: SocialLinkAccent;
};

export const DEFAULT_SOCIAL_LINKS: SocialLinkItem[] = [
  { id: "gcal", label: "Google Calendar", href: "https://calendar.google.com", accent: "ice" },
  { id: "gmail", label: "Gmail", href: "https://mail.google.com", accent: "gold" },
  { id: "gdrive", label: "Google Drive", href: "https://drive.google.com", accent: "green" },
  { id: "gmeet", label: "Google Meet", href: "https://meet.google.com", accent: "violet" },
  { id: "slack", label: "Slack", href: "https://slack.com", accent: "ice" },
  { id: "notion", label: "Notion", href: "https://notion.so", accent: "gold" }
];
