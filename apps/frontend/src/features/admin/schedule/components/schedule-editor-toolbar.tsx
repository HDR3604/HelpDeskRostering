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

export type ScheduleStatus = "active" | "inactive" | "archived"

const STATUS_BADGE: Record<ScheduleStatus, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15" },
  inactive: { label: "Inactive", className: "bg-blue-500/15 text-blue-500 hover:bg-blue-500/15" },
  archived: { label: "Archived", className: "bg-muted text-muted-foreground hover:bg-muted" },
}

interface ScheduleEditorToolbarProps {
  scheduleTitle: string
  scheduleStatus: ScheduleStatus
  dateRange: string
  onBack: () => void
  onSave: () => void
  onRename: () => void
  hasChanges: boolean
  isSaving: boolean
  saveStatus: "success" | "error" | null
  totalAssignments: number
  totalStudents: number
  totalHours: number
}

export function ScheduleEditorToolbar({
  scheduleTitle,
  scheduleStatus,
  dateRange,
  onBack,
  onSave,
  onRename,
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
    <div className="shrink-0 space-y-[1.625rem] px-3 lg:px-0">
      {/* Title row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-2 lg:gap-3 min-w-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleBack} className="shrink-0 h-8 w-8 mt-0.5">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Back to schedules</TooltipContent>
          </Tooltip>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={onRename}
                className="text-xl lg:text-2xl font-bold tracking-tight truncate hover:underline decoration-muted-foreground/40 underline-offset-4 cursor-pointer text-left"
                title="Click to rename"
              >
                {scheduleTitle}
              </button>
              <Badge className={cn(STATUS_BADGE[scheduleStatus].className, "text-xs px-2 py-0.5 shrink-0")}>
                {STATUS_BADGE[scheduleStatus].label}
              </Badge>
              {hasChanges && (
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                </span>
              )}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground truncate">
              <span className="hidden lg:inline">Drag and drop students to assign shifts · </span>
              {dateRange}
            </p>
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center gap-3 shrink-0">
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
            <Button variant="outline" size="sm" onClick={onSave} disabled={isSaving} className="h-8 gap-2 pl-3 pr-2.5">
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Save
              <kbd className="pointer-events-none select-none rounded border bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground/60">
                ⌘S
              </kbd>
            </Button>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="hidden lg:flex items-center gap-2">
        <StatPill icon={Users} value={totalStudents} label="students" />
        <StatPill icon={CalendarDays} value={totalAssignments} label="slots" />
        <StatPill icon={Clock} value={`${totalHours}h`} label="total" />
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
