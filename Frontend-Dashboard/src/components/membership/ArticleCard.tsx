"use client";



import { motion } from "framer-motion";

import { useState } from "react";

import toast from "react-hot-toast";



export type ArticleDto = {

  id: number;

  title: string;

  slug: string;

  description: string;

  content?: string;

  source_url: string;

  thumbnail: string;

  published_at: string;

  tags: string[];

  is_featured: boolean;

  /** Relative API path e.g. `/api/portal/membership/articles/3/pdf/` when a PDF is stored on the article. */

  pdf_url: string | null;

};



function sourceLabel(url: string): string {

  const u = (url || "").trim();

  if (!u) return "Library";

  try {

    const host = new URL(u).hostname.replace(/^www\./, "");

    if (host.includes("forbes")) return "Forbes";

    if (host.includes("gq.")) return "GQ";

    if (host.includes("luxurylifestylemag")) return "Luxury Lifestyle";

    const part = host.split(".")[0];

    return part ? part.charAt(0).toUpperCase() + part.slice(1) : "External";

  } catch {

    return "External";

  }

}



function cx(...parts: Array<string | false | null | undefined>) {

  return parts.filter(Boolean).join(" ");

}



type ArticleCardProps = {

  article: ArticleDto;

  featured?: boolean;

  index?: number;

  /** Opens the PDF inside the membership reader panel (dashboard). */

  onOpenPdf?: (article: ArticleDto) => Promise<void>;

  /** Opens the original article URL inside the membership reader panel (iframe). */

  onOpenWeb?: (article: ArticleDto) => void;

};



export function ArticleCard({ article, featured, index = 0, onOpenPdf, onOpenWeb }: ArticleCardProps) {

  const label = sourceLabel(article.source_url);

  const [pdfOpening, setPdfOpening] = useState(false);

  const hasWeb = Boolean(article.source_url?.trim());

  const hasPdf = Boolean(article.pdf_url?.trim());



  const handlePdf = async () => {

    if (!onOpenPdf) return;

    setPdfOpening(true);

    try {

      await onOpenPdf(article);

    } catch (e) {

      toast.error(e instanceof Error ? e.message : "Could not open PDF.");

    } finally {

      setPdfOpening(false);

    }

  };



  const handleWeb = () => {

    onOpenWeb?.(article);

  };



  return (

    <motion.article

      layout

      initial={{ opacity: 0, y: 10 }}

      animate={{ opacity: 1, y: 0 }}

      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.35) }}

      className={cx(

        "group flex h-full min-h-[280px] flex-col rounded-xl border bg-black/45 p-6 text-left transition duration-200",

        "border-[rgba(197,179,88,0.22)] shadow-[0_0_0_1px_rgba(0,0,0,0.35)]",

        "hover:-translate-y-0.5 hover:border-[rgba(250,204,21,0.45)] hover:shadow-[0_0_32px_rgba(250,204,21,0.12),0_12px_40px_rgba(0,0,0,0.45)]",

        featured && "md:min-h-[320px] md:border-[rgba(250,204,21,0.38)] md:shadow-[0_0_40px_rgba(250,204,21,0.14)]"

      )}

    >

      {article.thumbnail?.trim() ? (

        <div className="mb-4 aspect-[16/9] w-full overflow-hidden rounded-lg border border-white/10 bg-black/50">

          <img

            src={article.thumbnail.trim()}

            alt=""

            loading="lazy"

            className="h-full w-full object-cover opacity-90"

          />

        </div>

      ) : null}



      <div className="mb-3 flex flex-wrap items-center gap-2">

        <span className="rounded-md border border-[rgba(250,204,21,0.28)] bg-[rgba(250,204,21,0.08)] px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[color:var(--gold-neon)]/88">

          {label}

        </span>

        {article.is_featured ? (

          <span className="rounded-md border border-[rgba(0,255,255,0.28)] bg-[rgba(0,255,255,0.06)] px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-cyan-200/85">

            Featured

          </span>

        ) : null}

      </div>



      <h3

        className={cx(

          "line-clamp-3 font-bold leading-snug text-white/95",

          featured ? "text-[17px] sm:text-[19px]" : "text-[15px] sm:text-[16px]"

        )}

      >

        {article.title}

      </h3>



      <p className="mt-3 line-clamp-2 flex-1 text-[13px] leading-relaxed text-white/58">{article.description}</p>



      {article.tags?.length ? (

        <div className="mt-4 flex flex-wrap gap-1.5">

          {article.tags.slice(0, 4).map((t) => (

            <span

              key={t}

              className="rounded-full border border-white/12 bg-black/35 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/55"

            >

              {t}

            </span>

          ))}

        </div>

      ) : null}



      <div className="mt-auto flex flex-col gap-2 pt-6 sm:flex-row sm:gap-3">

        {hasPdf && onOpenPdf ? (

          <button

            type="button"

            disabled={pdfOpening}

            onClick={() => void handlePdf()}

            className="cut-frame-sm cyber-frame gold-stroke premium-gold-border inline-flex flex-1 items-center justify-center bg-black/40 px-4 py-3 text-center text-[11px] font-black uppercase tracking-[0.22em] text-[color:var(--gold-neon)]/92 transition hover:border-[rgba(255,215,0,0.55)] hover:text-[rgba(255,215,0,0.98)] disabled:opacity-50"

          >

            {pdfOpening ? "Loading…" : "View PDF"}

          </button>

        ) : null}

        {hasWeb && onOpenWeb ? (

          <button

            type="button"

            onClick={handleWeb}

            className={cx(

              "cut-frame-sm cyber-frame gold-stroke premium-gold-border inline-flex flex-1 items-center justify-center bg-black/40 px-4 py-3 text-center text-[11px] font-black uppercase tracking-[0.22em] text-[color:var(--gold-neon)]/92 transition hover:border-[rgba(255,215,0,0.55)] hover:text-[rgba(255,215,0,0.98)]",

              hasPdf && onOpenPdf && "border-white/20 text-white/80 hover:text-white/95"

            )}

          >

            Read online

          </button>

        ) : null}

      </div>

    </motion.article>

  );

}

