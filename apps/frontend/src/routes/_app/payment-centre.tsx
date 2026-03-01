import { createFileRoute } from "@tanstack/react-router"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { PaymentsCentre } from "@/features/admin/student-management/payment-centre"

export const Route = createFileRoute("/_app/payment-centre")({
  component: PaymentCentrePage,
})

function PaymentCentrePage() {
  useDocumentTitle("Payment Centre")
  return (
    <div className="mx-auto max-w-7xl">
      <h2 className="text-2xl font-bold tracking-tight">Payment Centre</h2>
      <PaymentsCentre/>
    </div>
  )
}