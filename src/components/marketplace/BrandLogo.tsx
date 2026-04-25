import { Cormorant_Garamond } from "next/font/google";
import { cn } from "@/lib/utils";

const brandFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["600", "700"],
});

type BrandLogoProps = {
  variant?: "full" | "mark";
  className?: string;
  priority?: boolean;
  alt?: string;
};

export function BrandLogo({
  variant = "full",
  className,
  priority: _priority = false,
  alt = "SpareKart logo",
}: BrandLogoProps) {
  return (
    <span
      aria-label={alt}
      className={cn(
        brandFont.className,
        "inline-flex items-center justify-center whitespace-nowrap font-semibold uppercase leading-none",
        variant === "mark"
          ? "text-[1.15rem] tracking-[0.18em]"
          : "text-[1.45rem] tracking-[0.2em] sm:text-[1.65rem]",
        className,
      )}
    >
      SpareKart
    </span>
  );
}
