type Variant = "horizontal" | "compact" | "mark";
type Size = "sm" | "md" | "lg" | "xl";

const HEIGHT: Record<Size, string> = {
  sm: "h-9 md:h-11",
  md: "h-11 md:h-14",
  lg: "h-20 md:h-24",
  xl: "h-24 md:h-32",
};

const ASSET: Record<Variant, { url: string; alt: string }> = {
  horizontal: { url: "/brand/logo-horizontal.png", alt: "Prudente em Foco — Eventos que marcam" },
  compact: { url: "/brand/logo-compact.png", alt: "Prudente em Foco" },
  mark: { url: "/brand/mark.png", alt: "Prudente em Foco" },
};

export function BrandLogo({
  variant = "compact",
  size = "md",
  className = "",
  priority = false,
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
  priority?: boolean;
}) {
  const { url, alt } = ASSET[variant];
  return (
    <img
      src={url}
      alt={alt}
      className={`${HEIGHT[size]} w-auto object-contain ${className}`}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
    />
  );
}
