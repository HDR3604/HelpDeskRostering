import { useState } from "react"
import { ArrowLeft, Check, X, Loader2, Users, CalendarDays, Clock } from "lucide-react"
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
    <div className="shrink-0 pb-4">
      {/* Page title row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleBack} className="shrink-0 h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Back to schedules</TooltipContent>
          </Tooltip>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight truncate">{scheduleTitle}</h1>
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
            <p className="mt-1 text-muted-foreground">Drag and drop students to assign shifts · {dateRange}</p>
          </div>
        </div>

        {/* Stats + Save */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1.5 rounded-md bg-muted/50 px-2.5 py-1">
              <Users className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-medium tabular-nums">{totalStudents}</span>
              <span className="text-[10px] text-muted-foreground">students</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-md bg-muted/50 px-2.5 py-1">
              <CalendarDays className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-medium tabular-nums">{totalAssignments}</span>
              <span className="text-[10px] text-muted-foreground">slots</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-md bg-muted/50 px-2.5 py-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-medium tabular-nums">{totalHours}h</span>
              <span className="text-[10px] text-muted-foreground">total</span>
            </div>
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
              <TooltipContent side="bottom">
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
