"use client";

import React, { useEffect, useMemo, useRef } from "react";
import gsap from "gsap";

export type ChromaItem = {
  id: string;
  image: string;
  title: string;
  subtitle: string;
  handle?: string;
  location?: string;
  badge?: string;
  rating?: number;
  reviews?: number;
  lessons?: number;
  price?: number;
  borderColor?: string;
  gradient?: string;
};

export type ChromaGridProps = {
  items: ChromaItem[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
  /** 2–4 columns at large breakpoints (see globals `.courses-grid`). */
  columns?: 2 | 3 | 4;
  radius?: number;
  damping?: number;
  fadeOut?: number;
  ease?: string;
};

type SetterFn = (v: number | string) => void;

export default function ChromaGrid({
  items,
  selectedId,
  onSelect,
  className = "",
  columns = 2,
  radius = 360,
  damping = 0.45,
  fadeOut = 0.6,
  ease = "power3.out"
}: ChromaGridProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const setX = useRef<SetterFn | null>(null);
  const setY = useRef<SetterFn | null>(null);
  const pos = useRef({ x: 0, y: 0 });

  const data = useMemo(() => items, [items]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    setX.current = gsap.quickSetter(el, "--x", "px") as SetterFn;
    setY.current = gsap.quickSetter(el, "--y", "px") as SetterFn;
    const { width, height } = el.getBoundingClientRect();
    pos.current = { x: width / 2, y: height / 2 };
    setX.current(pos.current.x);
    setY.current(pos.current.y);
  }, []);

  const moveTo = (x: number, y: number) => {
    gsap.to(pos.current, {
      x,
      y,
      duration: damping,
      ease,
      onUpdate: () => {
        setX.current?.(pos.current.x);
        setY.current?.(pos.current.y);
      },
      overwrite: true
    });
  };

  const handleMove = (e: React.PointerEvent) => {
    const r = rootRef.current!.getBoundingClientRect();
    moveTo(e.clientX - r.left, e.clientY - r.top);
  };

  const handleLeave = () => {};

  const handleCardMove: React.MouseEventHandler<HTMLElement> = (e) => {
    const c = e.currentTarget as HTMLElement;
    const rect = c.getBoundingClientRect();
    c.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
    c.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
  };

  return (
    <div
      ref={rootRef}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      className={`courses-grid ${columns === 4 ? "cols-4" : columns === 3 ? "cols-3" : "cols-2"} relative h-full w-full items-start gap-6 ${className}`}
      style={
        {
          ["--r" as any]: `${radius}px`,
          ["--x" as any]: "50%",
          ["--y" as any]: "50%"
        } as React.CSSProperties
      }
    >
      {data.map((c) => {
        const isSelected = selectedId === c.id;
        return (
          <article
            key={c.id}
            data-course-card
            onMouseMove={handleCardMove}
            onClick={() => onSelect?.(c.id)}
            className={[
              "group premium-card gold-glow-hover relative flex min-h-[430px] flex-col w-full rounded-[22px] overflow-hidden cursor-pointer",
              "bg-black/72",
              isSelected ? "glow-edge-strong hud-selected-glow" : "",
              "hud-hover-glow"
            ].join(" ")}
            style={
              {
                ["--card-border" as any]: c.borderColor || "rgba(255,215,0,0.35)",
                background: c.gradient || "linear-gradient(165deg, rgba(255,215,0,0.14), rgba(255,195,0,0.06), rgba(0,0,0,0.9))",
                ["--spotlight-color" as any]: "rgba(255,215,0,0.22)",
                borderColor: isSelected ? "rgba(255,215,0,0.85)" : "rgba(255,215,0,0.30)"
              } as React.CSSProperties
            }
            role="button"
            tabIndex={0}
          >
            <div className="absolute left-4 top-4 z-30 rounded-md border border-[rgba(255,215,0,0.6)] bg-black/70 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--gold)] shadow-[0_0_12px_rgba(255,215,0,0.35)]">
              {c.badge ?? "Premium"}
            </div>
            <div
              className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-20 opacity-40 group-hover:opacity-70"
              style={{
                background:
                  "radial-gradient(circle at var(--mouse-x) var(--mouse-y), var(--spotlight-color), transparent 70%)"
              }}
            />

            <div className="relative z-10 flex-1 p-[12px] box-border">
              <img
                src={c.image}
                alt={c.title}
                loading="lazy"
                className="w-full h-[210px] object-cover rounded-[14px]"
              />
            </div>

            <footer className="relative z-10 flex flex-1 flex-col p-4 text-white">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 rounded-md border border-[rgba(255,215,0,0.35)] bg-black/55 px-2 py-1 text-[11px] text-white/75">
                  <span className="text-[12px] leading-none tracking-[0.02em] text-[color:var(--gold)]">{"★★★★★"}</span>
                  <span className="font-semibold">{(c.rating ?? 4.8).toFixed(1)} ({c.reviews ?? 120})</span>
                </div>
                <div className="inline-flex items-center gap-1 rounded-md border border-[rgba(255,215,0,0.35)] bg-black/55 px-2 py-1 text-[11px] font-semibold text-white/78">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[color:var(--gold)]" fill="none" aria-hidden="true">
                    <path d="M5 4.8h14v14.4H5z" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M8 8h8M8 11.5h8M8 15h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                  <span>{c.lessons ?? 24} Lessons</span>
                </div>
              </div>

              <h3 className="heading-glow m-0 text-[1.04rem] font-black uppercase tracking-[0.09em] text-[color:var(--gold)]/92">
                {c.title}
              </h3>
              <p className="mt-2 text-[0.9rem] leading-relaxed text-white/72">{c.subtitle}</p>

              <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                <span className="text-[0.82rem] font-semibold uppercase tracking-[0.12em] text-white/62">
                  {c.handle ?? "Course"}
                </span>
                <div className="rounded-md border-2 border-[rgba(255,215,0,0.65)] bg-black/70 px-3 py-1.5 text-[0.95rem] font-black tracking-[0.04em] text-[color:var(--gold)] shadow-[0_0_12px_rgba(255,215,0,0.4)]">
                  ${c.price ?? 99}
                </div>
              </div>
            </footer>
          </article>
        );
      })}

      {/* Removed global dimming masks so card colors remain visible by default. */}
    </div>
  );
}

