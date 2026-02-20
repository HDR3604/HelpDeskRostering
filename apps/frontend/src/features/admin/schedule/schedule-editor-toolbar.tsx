import { ArrowLeft, Sparkles, Save, Loader2, CalendarDays, Users, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface ScheduleEditorToolbarProps {
  scheduleTitle: string
  dateRange: string
  isActive: boolean
  studentCount: number
  assignmentCount: number
  onBack: () => void
  onSave: () => void
  onGenerate: () => void
  hasChanges: boolean
  isGenerating: boolean
  isSaving: boolean
}

export function ScheduleEditorToolbar({
  scheduleTitle,
  dateRange,
  isActive,
  studentCount,
  assignmentCount,
  onBack,
  onSave,
  onGenerate,
  hasChanges,
  isGenerating,
  isSaving,
}: ScheduleEditorToolbarProps) {
  return (
    <div className="shrink-0 space-y-1">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="mt-0.5 shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">{scheduleTitle}</h1>
              {isActive && <Badge className="shrink-0">Active</Badge>}
              {hasChanges && (
                <Badge variant="outline" className="shrink-0 border-amber-500/50 text-amber-600 dark:text-amber-400">
                  Unsaved changes
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Drag students onto the timetable to assign shifts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={onGenerate} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
            Auto Generate
          </Button>
          <Button size="sm" onClick={onSave} disabled={!hasChanges || isSaving}>
            {isSaving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
            Save
          </Button>
        </div>
      </div>

      {/* Stats row — matches dashboard section header style */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 pl-12 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5" />
          <span>{dateRange}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          <span>{studentCount} students</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5" />
          <span>{assignmentCount} assignments</span>
        </div>
      </div>
    </div>
  )
}
