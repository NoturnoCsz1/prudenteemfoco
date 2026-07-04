import type { SVGProps } from "react";

/**
 * Prudente em Foco — PF monogram.
 * Two overlapping strokes forming P + F, with a live-dot mark suggesting
 * event flow. Uses design tokens so it adapts to theme.
 */
export function LogoPF({
  size = 28,
  showWordmark = false,
  className,
  ...rest
}: {
  size?: number;
  showWordmark?: boolean;
  className?: string;
} & Omit<SVGProps<SVGSVGElement>, "className">) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        {...rest}
      >
        {/* Rounded square background */}
        <rect
          x="0.5"
          y="0.5"
          width="31"
          height="31"
          rx="8"
          fill="color-mix(in oklab, var(--primary) 14%, transparent)"
          stroke="color-mix(in oklab, var(--primary) 45%, transparent)"
        />
        {/* P stem */}
        <path
          d="M8 7.5V24.5"
          stroke="var(--primary)"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        {/* P bowl */}
        <path
          d="M8 8.5H15.5C17.7091 8.5 19.5 10.2909 19.5 12.5C19.5 14.7091 17.7091 16.5 15.5 16.5H8"
          stroke="var(--primary)"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* F crossbar upper */}
        <path
          d="M14.5 20.5H23.5"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        {/* F crossbar mid */}
        <path
          d="M14.5 24.5H20"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          opacity="0.6"
        />
        {/* Live pulse dot */}
        <circle cx="25" cy="8" r="2" fill="var(--live)" />
      </svg>
      {showWordmark && (
        <span className="font-display text-sm font-semibold tracking-tight text-foreground">
          Prudente <span className="text-muted-foreground">em Foco</span>
        </span>
      )}
    </span>
  );
}
