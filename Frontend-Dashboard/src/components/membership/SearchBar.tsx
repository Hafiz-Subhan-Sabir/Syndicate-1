"use client";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
};

export function SearchBar({
  value,
  onChange,
  placeholder = "Search insights, articles…",
  id = "membership-search"
}: SearchBarProps) {
  return (
    <div className="relative w-full">
      <label htmlFor={id} className="sr-only">
        Search membership content
      </label>
      <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[color:var(--gold-neon)]/45">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path d="M16.2 16.2 21 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </div>
      <input
        id={id}
        type="search"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-[color:var(--gold-neon-border-mid)] bg-black/50 py-3 pl-11 pr-4 text-left text-[13px] font-medium text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none transition placeholder:text-white/35 focus:border-[rgba(250,204,21,0.55)] focus:ring-2 focus:ring-[rgba(250,204,21,0.18)]"
      />
    </div>
  );
}
