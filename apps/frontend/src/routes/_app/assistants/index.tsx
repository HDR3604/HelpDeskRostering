import { createFileRoute } from '@tanstack/react-router'
import { AssistantRoster } from '@/features/admin/student-management/active-students'
import { useStudents } from '@/features/admin/student-management/student-context'

export const Route = createFileRoute('/_app/assistants/')({
    component: TeamPage,
})

function TeamPage() {
    const {
        activeStudents,
        deactivatedStudents,
        handleDeactivate,
        handleActivate,
    } = useStudents()

    return (
        <AssistantRoster
            activeStudents={activeStudents}
            deactivatedStudents={deactivatedStudents}
            onDeactivate={handleDeactivate}
            onActivate={handleActivate}
        />
    )
}
