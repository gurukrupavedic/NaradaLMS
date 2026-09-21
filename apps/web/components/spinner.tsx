import { cn } from '@/lib/utils'

/**
 * A small ring in the current text colour, for the button an edit was just made from. It inherits
 * `currentColor` rather than carrying its own, so it reads as part of whichever button (solid ink,
 * outlined, a bare text link) it sits in. Purely decorative: the button itself says what's
 * happening (its label, `aria-busy`). Under `prefers-reduced-motion` it turns slowly instead of
 * stopping — a frozen ring would just look broken.
 */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-block size-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:[animation-duration:2s]',
        className,
      )}
    />
  )
}
