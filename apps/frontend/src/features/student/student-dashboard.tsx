import { CalendarDays, Clock, Loader2 } from 'lucide-react'
import { useMyStudentProfile } from '@/lib/queries/students'
import { getApplicationStatus } from '@/types/student'
import { ApplicationStatusBanner } from './components/application-status-banner'

export function StudentDashboard() {
    const profileQuery = useMyStudentProfile()
    const student = profileQuery.data

    if (profileQuery.isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!student) {
        return null
    }

    const status = getApplicationStatus(student)

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            {/* Page header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    My Dashboard
                </h1>
                <p className="mt-1 text-muted-foreground">
                    Welcome back, {student.first_name}.
                </p>
            </div>

            <ApplicationStatusBanner student={student} />

            {status === 'accepted' && (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-24 text-center">
                    <div className="relative">
                        <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10">
                            <CalendarDays className="size-8 text-primary" />
                        </div>
                        <div className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full border-2 border-background bg-muted">
                            <Clock className="size-3.5 text-muted-foreground" />
                        </div>
                    </div>
                    <h2 className="mt-6 text-lg font-semibold">
                        No schedule assigned yet
                    </h2>
                    <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                        Your shifts, schedules, and time logs will appear here
                        once an administrator assigns you to a roster.
                    </p>
                </div>
            )}
        </div>
    )
}
