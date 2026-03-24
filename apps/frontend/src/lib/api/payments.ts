import { apiClient } from '@/lib/api-client'

export interface PaymentResponse {
    payment_id: string
    student_id: number
    period_start: string
    period_end: string
    hours_worked: number
    gross_amount: number
    processed_at: string | null
    created_at: string
    updated_at: string | null
}

export async function listPayments(
    periodStart: string,
    periodEnd: string,
): Promise<PaymentResponse[]> {
    const { data } = await apiClient.get<PaymentResponse[]>(
        `/payments?period_start=${periodStart}&period_end=${periodEnd}`,
    )
    return data ?? []
}

export async function generatePayments(
    periodStart: string,
    periodEnd: string,
): Promise<PaymentResponse[]> {
    const { data } = await apiClient.post<PaymentResponse[]>(
        '/payments/generate',
        { period_start: periodStart, period_end: periodEnd },
    )
    return data ?? []
}

export async function processPayment(
    paymentId: string,
): Promise<PaymentResponse> {
    const { data } = await apiClient.post<PaymentResponse>(
        `/payments/${paymentId}/process`,
    )
    return data
}

export async function revertPayment(
    paymentId: string,
): Promise<PaymentResponse> {
    const { data } = await apiClient.post<PaymentResponse>(
        `/payments/${paymentId}/revert`,
    )
    return data
}

export async function bulkProcessPayments(
    paymentIds: string[],
): Promise<PaymentResponse[]> {
    const { data } = await apiClient.post<PaymentResponse[]>(
        '/payments/bulk-process',
        { payment_ids: paymentIds },
    )
    return data ?? []
}

export async function exportPaymentsCsv(
    periodStart: string,
    periodEnd: string,
): Promise<void> {
    // Regenerate payments first so the export includes the latest hours
    await generatePayments(periodStart, periodEnd)

    const response = await apiClient.get<Blob>(
        `/payments/export?period_start=${periodStart}&period_end=${periodEnd}`,
    )

    const blob = new Blob([response.data], {
        type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `payroll_${periodStart}_${periodEnd}.csv`
    a.click()
    URL.revokeObjectURL(url)
}
