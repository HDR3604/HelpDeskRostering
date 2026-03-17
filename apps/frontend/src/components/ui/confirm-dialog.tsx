import { useRef } from 'react'
import { LoaderCircle } from 'lucide-react'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface ConfirmDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    description: React.ReactNode
    confirmLabel: string
    onConfirm: () => void
    destructive?: boolean
    loading?: boolean
}

export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel,
    onConfirm,
    destructive,
    loading,
}: ConfirmDialogProps) {
    const lastProps = useRef({ title, description, confirmLabel, destructive })

    if (open) {
        lastProps.current = { title, description, confirmLabel, destructive }
    }

    const display = open
        ? { title, description, confirmLabel, destructive }
        : lastProps.current

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{display.title}</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div>{display.description}</div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        variant={
                            display.destructive ? 'destructive' : 'outline'
                        }
                        onClick={onConfirm}
                        disabled={loading}
                    >
                        {loading && (
                            <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        )}
                        {display.confirmLabel}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
