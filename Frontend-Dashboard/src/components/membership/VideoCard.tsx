"use client";

import { motion } from "framer-motion";

export type VideoDto = {
  id: number;
  title: string;
  description: string;
  video_url: string;
  thumbnail: string;
  duration: string;
  created_at: string;
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

type VideoCardProps = {
  video: VideoDto;
  onPlay: (video: VideoDto) => void;
  index?: number;
};

export function VideoCard({ video, onPlay, index = 0 }: VideoCardProps) {
  const thumb = video.thumbnail?.trim() || "/placeholder-video.svg";

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.35) }}
      className={cx(
        "flex h-full min-h-[280px] flex-col rounded-xl border border-[rgba(197,179,88,0.22)] bg-black/45 p-4 text-left transition duration-200",
        "hover:-translate-y-0.5 hover:border-[rgba(250,204,21,0.45)] hover:shadow-[0_0_32px_rgba(250,204,21,0.12)]"
      )}
    >
      <button
        type="button"
        onClick={() => onPlay(video)}
        className="relative aspect-video w-full overflow-hidden rounded-lg border border-white/10 bg-black/60 text-left outline-none transition group-hover:border-[rgba(250,204,21,0.35)] focus-visible:ring-2 focus-visible:ring-[rgba(250,204,21,0.35)]"
        aria-label={`Play ${video.title}`}
      >
        <img src={thumb} alt="" loading="lazy" className="h-full w-full object-cover opacity-90" />
        <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <span className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[rgba(250,204,21,0.45)] bg-black/55 text-[color:var(--gold-neon)] shadow-[0_0_24px_rgba(250,204,21,0.25)] transition group-hover:scale-105">
          <svg className="ml-0.5 h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M8 5v14l11-7L8 5Z" />
          </svg>
        </span>
        {video.duration ? (
          <span className="absolute bottom-2 right-2 rounded bg-black/75 px-2 py-0.5 text-[10px] font-bold tabular-nums text-white/90">
            {video.duration}
          </span>
        ) : null}
      </button>

      <h3 className="mt-4 line-clamp-2 text-[15px] font-bold leading-snug text-white/95">{video.title}</h3>
      {video.description ? (
        <p className="mt-2 line-clamp-2 flex-1 text-[12px] leading-relaxed text-white/55">{video.description}</p>
      ) : (
        <div className="flex-1" />
      )}
    </motion.article>
  );
}
