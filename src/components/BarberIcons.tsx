// Simple line-art barbershop icons. Inherit color via `currentColor`.
type IconProps = { className?: string; size?: number };

const base = (size: number) => ({
  width: size, height: size, viewBox: "0 0 24 24", fill: "none",
  stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
});

export function ScissorsIcon({ className, size = 24 }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="6" cy="18" r="2.5" />
      <path d="M8 8l12 8M8 16L20 8" />
    </svg>
  );
}

export function RazorIcon({ className, size = 24 }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <path d="M3 8l9 3 8-6c-3 5-7 6-10 6L3 8z" />
      <path d="M12 11l-4 8" />
      <circle cx="7.5" cy="20" r="1.5" />
    </svg>
  );
}

export function CombIcon({ className, size = 24 }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <path d="M3 9h18v3H3z" />
      <path d="M6 12v5M10 12v5M14 12v5M18 12v5" />
    </svg>
  );
}

export function MustacheIcon({ className, size = 24 }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <path d="M12 11c-1.5-2-3-3-5-3-2.5 0-4 1.5-4 3.5C3 13 4.5 14 6.5 14 9 14 10.5 12.5 12 11z" />
      <path d="M12 11c1.5-2 3-3 5-3 2.5 0 4 1.5 4 3.5 0 1.5-1.5 2.5-3.5 2.5C15 14 13.5 12.5 12 11z" />
    </svg>
  );
}

export function PoleIcon({ className, size = 24 }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <rect x="8" y="4" width="8" height="16" rx="4" />
      <path d="M8 8l8 4M8 12l8 4M8 16l8 4" />
      <path d="M7 4h10M7 20h10" />
    </svg>
  );
}
