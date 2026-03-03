import { createFileRoute } from '@tanstack/react-router'
import { PaymentsCentre } from '@/features/admin/student-management/payment-centre'

export const Route = createFileRoute('/_app/assistants/payments')({
    component: PaymentsPage,
})

function PaymentsPage() {
    return <PaymentsCentre />
}
