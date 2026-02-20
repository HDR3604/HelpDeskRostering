import { useState } from "react"
import { ArrowLeft, Check, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
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
}

export function ScheduleEditorToolbar({
  scheduleTitle,
  dateRange,
  onBack,
  onSave,
  hasChanges,
  isSaving,
  saveStatus,
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
    <div className="shrink-0 flex items-center gap-3 pb-2">
      <Button variant="ghost" size="icon" onClick={handleBack} className="shrink-0 h-8 w-8">
        <ArrowLeft className="h-4 w-4" />
      </Button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-semibold truncate">{scheduleTitle}</h1>
          {hasChanges && (
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {dateRange}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
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
          <Button variant="outline" size="sm" onClick={onSave} disabled={isSaving} className="h-8">
            {isSaving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1.5 h-3.5 w-3.5" />}
            Save
          </Button>
        )}
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
