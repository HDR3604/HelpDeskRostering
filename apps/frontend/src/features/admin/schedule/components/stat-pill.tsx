import type { LucideIcon } from "lucide-react"

interface StatPillProps {
  icon: LucideIcon
  value: number | string
  label: string
}

export function StatPill({ icon: Icon, value, label }: StatPillProps) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg border bg-muted/30 px-3 py-1.5">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-sm font-medium tabular-nums">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}
