import { cn } from '@/lib/utils'
import { getProficiencyConfig, type ProficiencyLevel } from '@/lib/proficiency'
import { Badge } from '@/components/ui/badge'

interface ProficiencyBadgeProps {
  level: ProficiencyLevel
  compact?: boolean
  className?: string
}

export function ProficiencyBadge({ level, compact = false, className }: ProficiencyBadgeProps) {
  const c = getProficiencyConfig(level)
  return (
    <Badge
      variant="outline"
      className={cn(
        'justify-center border-transparent font-medium',
        c.bg,
        c.text,
        compact ? 'h-4 w-6 px-0 text-xs' : 'w-22',
        className,
      )}
    >
      {compact ? c.shortLabel : c.label}
    </Badge>
  )
}
