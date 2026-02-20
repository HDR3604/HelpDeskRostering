import { Mail } from "lucide-react"
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

interface ActivateScheduleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  scheduleTitle: string
  onConfirm: () => void
}

export function ActivateScheduleDialog({ open, onOpenChange, scheduleTitle, onConfirm }: ActivateScheduleDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Set as Active Schedule</AlertDialogTitle>
          <AlertDialogDescription>
            This will make <span className="font-medium text-foreground">{scheduleTitle}</span> the
            current active schedule. Any previously active schedule will be deactivated.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex items-start gap-3 rounded-lg border bg-muted/50 px-4 py-3">
          <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            All students on this schedule will be notified of their assigned shifts via email.
          </p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Activate & Notify</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
