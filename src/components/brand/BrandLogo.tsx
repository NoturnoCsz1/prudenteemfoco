type Variant = "horizontal" | "compact" | "mark";
type Size = "sm" | "md" | "lg" | "xl";

const HEIGHT: Record<Size, string> = {
  sm: "h-8 md:h-10",
  md: "h-9 md:h-12",
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
      className={`${HEIGHT[size]} block w-auto max-w-full shrink-0 object-contain ${className}`}
      style={{ aspectRatio: variant === "horizontal" ? "415 / 125" : variant === "compact" ? "431 / 124" : "158 / 157" }}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
    />
  );
}
