import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { Button } from '@/components/ui/button'
import { ActiveStudents } from '@/features/admin/student-management/active-students'
import { DeactivatedStudents } from '@/features/admin/student-management/deactivated-students'
import { PaymentsCentre } from '@/features/admin/student-management/payment-centre'
import { useStudents } from '@/features/admin/student-management/student-context'

const searchSchema = z.object({
    tab: z.enum(['active', 'deactivated', 'payments']).catch('active'),
})

export const Route = createFileRoute('/_app/student-centre')({
    validateSearch: searchSchema,
    component: StudentManagementPage,
})

function StudentManagementPage() {
    useDocumentTitle('Student Centre')
    const { tab } = Route.useSearch()
    const navigate = useNavigate()
    const {
        activeStudents,
        deactivatedStudents,
        handleDeactivate,
        handleActivate,
    } = useStudents()

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    Student Centre
                </h1>
                <p className="mt-1 text-muted-foreground">
                    Manage student accounts, applications, and payments.
                </p>
            </div>
            <div className="flex gap-2">
                <Button
                    variant={tab === 'active' ? 'default' : 'outline'}
                    onClick={() =>
                        navigate({
                            to: '/student-centre',
                            search: { tab: 'active' },
                        })
                    }
                >
                    Active Students
                </Button>
                <Button
                    variant={tab === 'deactivated' ? 'default' : 'outline'}
                    onClick={() =>
                        navigate({
                            to: '/student-centre',
                            search: { tab: 'deactivated' },
                        })
                    }
                >
                    Deactivated Students
                </Button>
                <Button
                    variant={tab === 'payments' ? 'default' : 'outline'}
                    onClick={() =>
                        navigate({
                            to: '/student-centre',
                            search: { tab: 'payments' },
                        })
                    }
                >
                    Payments Centre
                </Button>
            </div>
            {tab === 'active' && (
                <ActiveStudents
                    students={activeStudents}
                    onDeactivate={handleDeactivate}
                    onActivate={handleActivate}
                />
            )}
            {tab === 'deactivated' && (
                <DeactivatedStudents
                    students={deactivatedStudents}
                    onDeactivate={handleDeactivate}
                    onActivate={handleActivate}
                />
            )}
            {tab === 'payments' && <PaymentsCentre />}
        </div>
    )
}
