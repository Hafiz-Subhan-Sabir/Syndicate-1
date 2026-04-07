"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { portalFetch } from "@/lib/portal-api";
import { SearchBar } from "./SearchBar";
import { ArticleCard, type ArticleDto } from "./ArticleCard";
import { VideoCard, type VideoDto } from "./VideoCard";

type Tab = "articles" | "videos";

type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
  search_source?: string;
  tokens?: string[];
};

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return v;
}

function parseYoutubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|watch\?(?:[^#]*&)?v=))([\w-]{11})/);
  return m?.[1] ?? null;
}

function parseVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m?.[1] ?? null;
}

function embedUrlForVideo(url: string): string | null {
  const y = parseYoutubeId(url);
  if (y) return `https://www.youtube.com/embed/${y}?autoplay=1&rel=0`;
  const v = parseVimeoId(url);
  if (v) return `https://player.vimeo.com/video/${v}?autoplay=1`;
  return null;
}

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function MembershipContentHub() {
  const [tab, setTab] = useState<Tab>("articles");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search, 300);
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);

  const [articles, setArticles] = useState<ArticleDto[]>([]);
  const [videos, setVideos] = useState<VideoDto[]>([]);
  const [articlePage, setArticlePage] = useState(1);
  const [videoPage, setVideoPage] = useState(1);
  const [articleNext, setArticleNext] = useState<string | null>(null);
  const [videoNext, setVideoNext] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchHint, setSearchHint] = useState<string | null>(null);
  const [activeVideo, setActiveVideo] = useState<VideoDto | null>(null);

  const embed = activeVideo ? embedUrlForVideo(activeVideo.video_url) : null;

  const loadTags = useCallback(async () => {
    const { ok, data } = await portalFetch<string[]>("/api/portal/membership/tags/");
    if (ok && Array.isArray(data)) setTags(data);
  }, []);

  const loadArticles = useCallback(
    async (page: number, append: boolean) => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());
      if (tagFilter) params.set("tag", tagFilter);
      params.set("sort", sort);
      const { ok, data } = await portalFetch<Paginated<ArticleDto>>(
        `/api/portal/membership/articles/?${params.toString()}`
      );
      if (!ok) {
        setError(typeof data === "object" && data && "detail" in data ? String((data as { detail?: string }).detail) : "Could not load articles.");
        setLoading(false);
        return;
      }
      const body = data as Paginated<ArticleDto>;
      setArticleNext(body.next);
      setSearchHint(body.search_source ? `Source: ${body.search_source}` : null);
      setArticles((prev) => (append ? [...prev, ...body.results] : body.results));
      setLoading(false);
      setError(null);
    },
    [debouncedSearch, tagFilter, sort]
  );

  const loadVideos = useCallback(async (page: number, append: boolean) => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    const { ok, data } = await portalFetch<Paginated<VideoDto>>(`/api/portal/membership/videos/?${params.toString()}`);
    if (!ok) {
      setError(typeof data === "object" && data && "detail" in data ? String((data as { detail?: string }).detail) : "Could not load videos.");
      setLoading(false);
      return;
    }
    const body = data as Paginated<VideoDto>;
    setVideoNext(body.next);
    setVideos((prev) => (append ? [...prev, ...body.results] : body.results));
    setLoading(false);
    setError(null);
  }, []);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  useEffect(() => {
    setError(null);
  }, [tab]);

  useEffect(() => {
    if (tab !== "articles") return;
    setLoading(true);
    setArticlePage(1);
    void loadArticles(1, false);
  }, [tab, debouncedSearch, tagFilter, sort, loadArticles]);

  useEffect(() => {
    if (tab !== "videos") return;
    setLoading(true);
    setVideoPage(1);
    void loadVideos(1, false);
  }, [tab, loadVideos]);

  const sortedFeaturedFirst = useMemo(() => {
    const copy = [...articles];
    copy.sort((a, b) => Number(b.is_featured) - Number(a.is_featured));
    return copy;
  }, [articles]);

  const loadMoreArticles = () => {
    if (!articleNext) return;
    const next = articlePage + 1;
    setArticlePage(next);
    void loadArticles(next, true);
  };

  const loadMoreVideos = () => {
    if (!videoNext) return;
    const next = videoPage + 1;
    setVideoPage(next);
    void loadVideos(next, true);
  };

  return (
    <div className="w-full max-w-none pr-[clamp(0.15rem,0.5vw+0.05rem,0.35rem)]">
      <div className="mb-[clamp(1rem,2.5vw+0.35rem,1.5rem)] border-b border-[color:var(--gold-neon-border-mid)] pb-[clamp(0.85rem,2vw+0.25rem,1.15rem)]">
        <motion.h2
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[clamp(1.15rem,2.5vw,1.75rem)] font-black italic tracking-[0.02em] text-[color:var(--gold-neon)] drop-shadow-[0_0_24px_rgba(250,204,21,0.28)]"
        >
          Member Intelligence
        </motion.h2>
        <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-white/55">
          Curated press, field notes, and video briefings — searchable and aligned to your operator rhythm.
        </p>
      </div>

      <div className="mb-[clamp(1rem,2.5vw+0.35rem,1.5rem)] flex flex-wrap fluid-membership-gap border-b border-white/10 pb-[clamp(0.85rem,2vw+0.25rem,1.15rem)]">
        {(
          [
            { id: "articles" as const, label: "Articles" },
            { id: "videos" as const, label: "Videos" }
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cx(
              "rounded-lg border px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] transition",
              tab === t.id
                ? "border-[rgba(250,204,21,0.55)] bg-[rgba(250,204,21,0.12)] text-[color:var(--gold-neon)]"
                : "border-white/14 bg-black/30 text-white/55 hover:border-white/25 hover:text-white/75"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "articles" ? (
        <div className="space-y-[clamp(1rem,2.5vw+0.35rem,1.5rem)]">
          <SearchBar value={search} onChange={setSearch} />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/40">Sort</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as "newest" | "oldest")}
                className="rounded-lg border border-[color:var(--gold-neon-border-mid)] bg-black/50 px-3 py-2 text-[12px] font-semibold text-white/85 outline-none focus:border-[rgba(250,204,21,0.5)]"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
              </select>
            </div>
            {searchHint ? (
              <span className="text-[10px] font-semibold uppercase tracking-wider text-cyan-200/55">{searchHint}</span>
            ) : null}
          </div>

          {tags.length ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/40">Tags</span>
              <button
                type="button"
                onClick={() => setTagFilter(null)}
                className={cx(
                  "rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition",
                  !tagFilter
                    ? "border-[rgba(250,204,21,0.45)] text-[color:var(--gold-neon)]"
                    : "border-white/12 text-white/50 hover:text-white/70"
                )}
              >
                All
              </button>
              {tags.map((tg) => (
                <button
                  key={tg}
                  type="button"
                  onClick={() => setTagFilter(tg === tagFilter ? null : tg)}
                  className={cx(
                    "rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition",
                    tagFilter === tg
                      ? "border-[rgba(250,204,21,0.45)] text-[color:var(--gold-neon)]"
                      : "border-white/12 text-white/50 hover:text-white/70"
                  )}
                >
                  {tg}
                </button>
              ))}
            </div>
          ) : null}

          {error ? (
            <div className="rounded-xl border border-red-500/35 bg-red-950/25 p-4 text-[13px] text-red-200/90">{error}</div>
          ) : null}

          {loading && !articles.length ? (
            <div className="py-16 text-center text-[13px] text-white/45">Loading intelligence…</div>
          ) : (
            <div
              className={cx(
                "grid gap-6",
                "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
                sortedFeaturedFirst.some((a) => a.is_featured) && "xl:grid-flow-dense"
              )}
            >
              {sortedFeaturedFirst.map((article, i) => {
                const featured = article.is_featured && i === 0;
                return (
                  <div key={article.id} className={cx(featured && "md:col-span-2 xl:col-span-2")}>
                    <ArticleCard article={article} featured={featured} index={i} />
                  </div>
                );
              })}
            </div>
          )}

          {articleNext ? (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={loadMoreArticles}
                className="cut-frame-sm cyber-frame gold-stroke premium-gold-border rounded-lg bg-black/40 px-6 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-[color:var(--gold-neon)]/88 transition hover:border-[rgba(255,215,0,0.55)]"
              >
                Load more
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-[clamp(1rem,2.5vw+0.35rem,1.5rem)]">
          {error ? (
            <div className="rounded-xl border border-red-500/35 bg-red-950/25 p-[var(--fluid-card-p)] text-[clamp(0.72rem,0.45vw+0.55rem,0.85rem)] text-red-200/90">{error}</div>
          ) : null}
          {loading && !videos.length ? (
            <div className="py-[clamp(3rem,10vh,4.5rem)] text-center text-[clamp(0.72rem,0.45vw+0.55rem,0.85rem)] text-white/45">Loading videos…</div>
          ) : (
            <div className="grid grid-cols-1 gap-[clamp(1rem,2.5vw+0.35rem,1.5rem)] md:grid-cols-2 xl:grid-cols-3">
              {videos.map((v, i) => (
                <VideoCard key={v.id} video={v} onPlay={setActiveVideo} index={i} />
              ))}
            </div>
          )}
          {videoNext ? (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={loadMoreVideos}
                className="cut-frame-sm cyber-frame gold-stroke premium-gold-border rounded-lg bg-black/40 px-6 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-[color:var(--gold-neon)]/88 transition hover:border-[rgba(255,215,0,0.55)]"
              >
                Load more
              </button>
            </div>
          ) : null}
        </div>
      )}

      <AnimatePresence>
        {activeVideo ? (
          <motion.div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-label="Video player"
            onClick={() => setActiveVideo(null)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="relative w-full max-w-4xl overflow-hidden rounded-xl border border-[rgba(250,204,21,0.35)] bg-black shadow-[0_0_60px_rgba(250,204,21,0.15)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                <div className="min-w-0 text-[13px] font-bold text-white/90 line-clamp-1">{activeVideo.title}</div>
                <button
                  type="button"
                  onClick={() => setActiveVideo(null)}
                  className="shrink-0 rounded-lg border border-white/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white/70 hover:border-red-400/40 hover:text-red-200"
                >
                  Close
                </button>
              </div>
              <div className="aspect-video w-full bg-black">
                {embed ? (
                  <iframe
                    title={activeVideo.title}
                    src={embed}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-[13px] text-white/65">
                    <p>Embed not available for this URL. Open in a new tab instead.</p>
                    <a
                      href={activeVideo.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[color:var(--gold-neon)] underline"
                    >
                      Open video
                    </a>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
