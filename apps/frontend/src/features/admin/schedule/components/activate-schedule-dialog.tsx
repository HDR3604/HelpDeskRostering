import { useState } from "react"
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

interface ActivateScheduleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  scheduleTitle: string
  onConfirm: (notify: boolean) => void
}

export function ActivateScheduleDialog({ open, onOpenChange, scheduleTitle, onConfirm }: ActivateScheduleDialogProps) {
  const [notify, setNotify] = useState("yes")

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

        <div className="space-y-2">
          <Label className="text-sm font-medium">Notify students?</Label>
          <RadioGroup value={notify} onValueChange={setNotify} className="gap-2">
            <label className="flex items-start gap-3 rounded-lg border px-4 py-3 cursor-pointer has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
              <RadioGroupItem value="yes" className="mt-0.5" />
              <div>
                <div className="text-sm font-medium">Yes, notify students</div>
                <p className="text-xs text-muted-foreground">Students will receive an email with their assigned shifts.</p>
              </div>
            </label>
            <label className="flex items-start gap-3 rounded-lg border px-4 py-3 cursor-pointer has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
              <RadioGroupItem value="no" className="mt-0.5" />
              <div>
                <div className="text-sm font-medium">No, don't notify</div>
                <p className="text-xs text-muted-foreground">The schedule will be activated silently.</p>
              </div>
            </label>
          </RadioGroup>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => onConfirm(notify === "yes")}>Activate</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
