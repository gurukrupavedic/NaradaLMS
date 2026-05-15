import { cn } from "../../lib/utils";

const KOLAM_MASK_STYLE = {
  maskSize: "200%",
  maskPosition: "25% 8%",
  maskRepeat: "no-repeat",
} as const;

const SHIMMER_GLOW_GRADIENT =
  "linear-gradient(to right, transparent 0%, oklch(0.96 0.16 85 / 0.5) 36%, oklch(1 0.2 88 / 0.95) 50%, oklch(0.96 0.16 85 / 0.5) 64%, transparent 100%)";

const SHIMMER_CORE_GRADIENT =
  "linear-gradient(to right, transparent 0%, oklch(0.98 0.17 85 / 0.75) 40%, oklch(1 0.22 90 / 1) 50%, oklch(0.98 0.17 85 / 0.75) 60%, transparent 100%)";

const SHIMMER_CORE_GLOW_FILTER =
  "drop-shadow(0 0 14px oklch(0.97 0.18 85 / 0.95)) drop-shadow(0 0 32px oklch(0.92 0.15 85 / 0.65))";

export interface KolamIlluminationOverlayProps {
  patternSrc: string;
  className?: string;
}

interface KolamShimmerWaveProps {
  animationDelay?: string;
}

function KolamShimmerWave({ animationDelay }: KolamShimmerWaveProps) {
  return (
    <>
      <div
        className="absolute inset-0 -translate-x-full animate-shimmer opacity-90 blur-2xl"
        style={{
          background: SHIMMER_GLOW_GRADIENT,
          animationDelay,
        }}
      />
      <div
        className="absolute inset-0 -translate-x-full animate-shimmer"
        style={{
          background: SHIMMER_CORE_GRADIENT,
          animationDelay,
          filter: SHIMMER_CORE_GLOW_FILTER,
        }}
      />
    </>
  );
}

export function KolamIlluminationOverlay({
  patternSrc,
  className,
}: KolamIlluminationOverlayProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 opacity-60",
        className
      )}
      style={{
        maskImage: `url(${patternSrc})`,
        WebkitMaskImage: `url(${patternSrc})`,
        ...KOLAM_MASK_STYLE,
        WebkitMaskSize: KOLAM_MASK_STYLE.maskSize,
        WebkitMaskPosition: KOLAM_MASK_STYLE.maskPosition,
        WebkitMaskRepeat: KOLAM_MASK_STYLE.maskRepeat,
      }}
    >
      <div className="absolute inset-0 bg-hema-base opacity-40" />
      <div className="absolute inset-0 overflow-hidden -skew-x-12">
        <KolamShimmerWave />
        <KolamShimmerWave animationDelay="4s" />
      </div>
    </div>
  );
}
