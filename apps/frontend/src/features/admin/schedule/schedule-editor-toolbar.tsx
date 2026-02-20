import { useState } from "react"
import { ArrowLeft, Check, X, Loader2, Users, CalendarDays, Clock } from "lucide-react"
import { StatPill } from "./stat-pill"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"

interface ScheduleEditorToolbarProps {
  scheduleTitle: string
  dateRange: string
  onBack: () => void
  onSave: () => void
  hasChanges: boolean
  isSaving: boolean
  saveStatus: "success" | "error" | null
  totalAssignments: number
  totalStudents: number
  totalHours: number
}

export function ScheduleEditorToolbar({
  scheduleTitle,
  dateRange,
  onBack,
  onSave,
  hasChanges,
  isSaving,
  saveStatus,
  totalAssignments,
  totalStudents,
  totalHours,
}: ScheduleEditorToolbarProps) {
  const [showLeaveDialog, setShowLeaveDialog] = useState(false)

  function handleBack() {
    if (hasChanges) {
      setShowLeaveDialog(true)
    } else {
      onBack()
    }
  }

  return (
    <div className="shrink-0 pb-2">
      {/* Title row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-2 sm:gap-3 min-w-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleBack} className="shrink-0 h-8 w-8 mt-0.5">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={4} showArrow={false} className="bg-background text-foreground border border-border/50 rounded-lg shadow-xl px-2.5 py-1.5 text-xs">Back to schedules</TooltipContent>
          </Tooltip>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">{scheduleTitle}</h1>
              {hasChanges ? (
                <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/15 text-xs px-2 py-0.5 shrink-0">
                  Unsaved
                </Badge>
              ) : (
                <Badge className="bg-muted text-muted-foreground hover:bg-muted text-xs px-2 py-0.5 shrink-0">
                  Draft
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground truncate">
              <span className="hidden sm:inline">Drag and drop students to assign shifts · </span>
              {dateRange}
            </p>
          </div>
        </div>

        {/* Stats + Save */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Stats pills — hidden on mobile */}
          <div className="hidden md:flex items-center gap-2">
            <StatPill icon={Users} value={totalStudents} label="students" />
            <StatPill icon={CalendarDays} value={totalAssignments} label="slots" />
            <StatPill icon={Clock} value={`${totalHours}h`} label="total" />
          </div>

          {saveStatus && (
            <span
              className={cn(
                "flex items-center gap-1 text-xs font-medium animate-in fade-in duration-150",
                saveStatus === "success" && "text-emerald-600 dark:text-emerald-400",
                saveStatus === "error" && "text-red-600 dark:text-red-400",
              )}
            >
              {saveStatus === "success" ? (
                <><Check className="h-3.5 w-3.5" /> Saved</>
              ) : (
                <><X className="h-3.5 w-3.5" /> Failed</>
              )}
            </span>
          )}

          {hasChanges && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={onSave} disabled={isSaving} className="h-8">
                  {isSaving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1.5 h-3.5 w-3.5" />}
                  Save
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={4} showArrow={false} className="bg-background text-foreground border border-border/50 rounded-lg shadow-xl px-2.5 py-1.5 text-xs">
                <kbd className="text-[10px]">⌘S</kbd>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes that will be lost. Are you sure you want to leave?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onBack}>Discard changes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
