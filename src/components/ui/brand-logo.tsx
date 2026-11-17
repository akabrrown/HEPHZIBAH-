import Image from "next/image";

interface BrandLogoProps {
  variant?: "auto" | "dark" | "light" | "badge";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  priority?: boolean;
}

const SIZE_MAP = {
  sm: { width: 140, height: 65, className: "h-8 w-auto" },
  md: { width: 180, height: 84, className: "h-10 w-auto" },
  lg: { width: 240, height: 112, className: "h-14 w-auto" },
  xl: { width: 340, height: 158, className: "h-20 w-auto" },
};

/**
 * BrandLogo
 * Cleanly cropped Hephzibah Media brand identity.
 * Available in:
 * - 'auto' (default): Theme-responsive! Automatically switches between dark and light brand logos via CSS.
 * - 'dark': Crisp white camera & typography with vivid red accents on transparent bg. Ideal for dark pages.
 * - 'light': Sleek black camera & typography with vivid red accents on transparent bg. Ideal for white/light bands.
 * - 'badge': High-contrast original badge with cyan framed backdrop.
 */
export function BrandLogo({
  variant = "auto",
  size = "md",
  className = "",
  priority = false,
}: BrandLogoProps) {
  const { width, height, className: sizeClass } = SIZE_MAP[size];

  if (variant === "auto") {
    return (
      <div className={`inline-flex items-center shrink-0 ${className}`}>
        <Image
          src="/media/logo-dark-mode.png"
          alt="Hephzibah Media — Capturing Glory"
          width={width}
          height={height}
          priority={priority}
          className={`${sizeClass} object-contain transition-opacity dark-logo`}
        />
        <Image
          src="/media/logo-light-mode.png"
          alt="Hephzibah Media — Capturing Glory"
          width={width}
          height={height}
          priority={priority}
          className={`${sizeClass} object-contain transition-opacity light-logo`}
        />
      </div>
    );
  }

  const src =
    variant === "badge"
      ? "/media/logo-badge.png"
      : variant === "light"
      ? "/media/logo-light-mode.png"
      : "/media/logo-dark-mode.png";

  return (
    <div className={`inline-flex items-center shrink-0 ${className}`}>
      <Image
        src={src}
        alt="Hephzibah Media — Capturing Glory"
        width={width}
        height={height}
        priority={priority}
        className={`${sizeClass} object-contain transition-opacity`}
      />
    </div>
  );
}
