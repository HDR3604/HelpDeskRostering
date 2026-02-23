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

interface NotifyStudentsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  scheduleTitle: string
  onConfirm: () => void
}

export function NotifyStudentsDialog({ open, onOpenChange, scheduleTitle, onConfirm }: NotifyStudentsDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Notify Students</AlertDialogTitle>
          <AlertDialogDescription>
            This will send an email to all students assigned to{" "}
            <span className="font-medium text-foreground">{scheduleTitle}</span> with
            their shift details.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Send Notifications</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
