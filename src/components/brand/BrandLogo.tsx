import logoHorizontal from "@/assets/prudente-em-foco-logo-horizontal.png.asset.json";
import logoCompact from "@/assets/prudente-em-foco-logo-compact.png.asset.json";
import logoMark from "@/assets/prudente-em-foco-mark.png.asset.json";

type Variant = "horizontal" | "compact" | "mark";
type Size = "sm" | "md" | "lg" | "xl";

const HEIGHT: Record<Size, string> = {
  sm: "h-8 md:h-10",
  md: "h-11 md:h-14",
  lg: "h-16 md:h-24",
  xl: "h-20 md:h-28",
};

const ASSET: Record<Variant, { url: string; alt: string }> = {
  horizontal: { url: logoHorizontal.url, alt: "Prudente em Foco — Eventos que marcam" },
  compact: { url: logoCompact.url, alt: "Prudente em Foco" },
  mark: { url: logoMark.url, alt: "Prudente em Foco" },
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
