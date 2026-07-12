import { cn } from '@/lib/utils'
import { CaretRightIcon } from '@/components/ui/icons'

export interface BreadcrumbItem {
  label: string
  href?: string
  className?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center gap-1', className)}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <CaretRightIcon className="text-muted-foreground/50 size-3 shrink-0" />}
            {isLast ? (
              <span className={cn('text-foreground text-sm', item.className)} aria-current="page">
                {item.label}
              </span>
            ) : (
              <a
                href={item.href ?? '#'}
                className={cn(
                  'text-muted-foreground hover:text-foreground text-sm transition-colors',
                  item.className,
                )}
              >
                {item.label}
              </a>
            )}
          </span>
        )
      })}
    </nav>
  )
}
