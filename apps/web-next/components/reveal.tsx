'use client'

import { useEffect, useRef, type ElementType, type ReactNode } from 'react'

/**
 * Scroll-reveal that fails open.
 *
 * The entrance is decoration; the dashboard underneath is the product. So the
 * reveal is written so that every way it can fail ends with the content
 * *visible* rather than hidden:
 *
 *   - already in view on mount  → revealed synchronously, no observer needed
 *   - no IntersectionObserver   → revealed immediately
 *   - observer never delivers   → a timer reveals it anyway
 *
 * The last case is not hypothetical: a backgrounded or hidden tab throttles
 * IntersectionObserver, and an unconditional `opacity: 0` waiting on a callback
 * that never arrives leaves the reader looking at an empty page. Anything that
 * can hide content must be able to give up.
 */

const FAILSAFE_MS = 1200

export function Reveal({
  children,
  as: Tag = 'div',
  className,
  delay = 0,
}: {
  children: ReactNode
  as?: ElementType
  className?: string
  delay?: number
}) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const show = () => node.setAttribute('data-reveal', 'in')

    if (typeof IntersectionObserver === 'undefined') {
      show()
      return
    }

    // Anything already on screen at mount should never animate in on a timer.
    if (node.getBoundingClientRect().top < window.innerHeight) {
      show()
      return
    }

    const failsafe = setTimeout(show, FAILSAFE_MS)

    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            clearTimeout(failsafe)
            show()
            observer.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -6% 0px' },
    )

    observer.observe(node)

    return () => {
      clearTimeout(failsafe)
      observer.disconnect()
    }
  }, [])

  return (
    <Tag
      ref={ref}
      data-reveal=""
      className={className}
      style={{ '--reveal-delay': `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </Tag>
  )
}
