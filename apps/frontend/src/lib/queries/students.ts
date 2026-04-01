import {
    useQuery,
    useMutation,
    useQueryClient,
    type QueryClient,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Student } from '@/types/student'
import {
    applyAsStudent,
    listStudents,
    getStudent,
    acceptStudent,
    rejectStudent,
    deactivateStudent,
    activateStudent,
    bulkDeactivateStudents,
    bulkActivateStudents,
    getMyStudentProfile,
    updateMyStudentProfile,
    getMyBankingDetails,
    upsertMyBankingDetails,
    type ApplyStudentRequest,
    type UpdateMyStudentProfileRequest,
    type BankingDetailsRequest,
} from '@/lib/api/students'
import { getApiErrorMessage } from '@/lib/error-messages'

// ── Key Factory ──────────────────────────────────────────────────────

export const studentKeys = {
    all: () => ['students'] as const,
    lists: () => [...studentKeys.all(), 'list'] as const,
    list: (status?: string) => [...studentKeys.lists(), status] as const,
    details: () => [...studentKeys.all(), 'detail'] as const,
    detail: (id: number) => [...studentKeys.details(), id] as const,
    me: () => [...studentKeys.all(), 'me'] as const,
    bankingDetails: () => [...studentKeys.all(), 'banking-details'] as const,
}

// ── Helpers ──────────────────────────────────────────────────────────

function invalidateLists(queryClient: QueryClient) {
    return queryClient.invalidateQueries({ queryKey: studentKeys.lists() })
}

// ── Query Hooks ──────────────────────────────────────────────────────

export function useStudents(status?: string) {
    return useQuery({
        queryKey: studentKeys.list(status),
        queryFn: () => listStudents(status),
        staleTime: 30_000,
    })
}

export function useStudent(id: number) {
    return useQuery({
        queryKey: studentKeys.detail(id),
        queryFn: () => getStudent(id),
        staleTime: 30_000,
    })
}

export function useMyStudentProfile() {
    return useQuery({
        queryKey: studentKeys.me(),
        queryFn: getMyStudentProfile,
        staleTime: 30_000,
    })
}

// ── Mutation Hooks ───────────────────────────────────────────────────

export function useApplyAsStudent() {
    return useMutation({
        mutationFn: (req: ApplyStudentRequest) => applyAsStudent(req),
        onError: (error) => {
            toast.error('Application failed', {
                description: getApiErrorMessage(error),
            })
        },
    })
}

export function useAcceptStudent() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: acceptStudent,
        onSuccess: (updated) => {
            queryClient.setQueryData<Student>(
                studentKeys.detail(updated.student_id),
                updated,
            )
        },
        onError: (error) => {
            toast.error('Accept failed', {
                description: getApiErrorMessage(error),
            })
        },
    })
}

export function useRejectStudent() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: rejectStudent,
        onSuccess: (updated) => {
            queryClient.setQueryData<Student>(
                studentKeys.detail(updated.student_id),
                updated,
            )
        },
        onError: (error) => {
            toast.error('Reject failed', {
                description: getApiErrorMessage(error),
            })
        },
    })
}

export function useDeactivateStudent() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: deactivateStudent,
        onSuccess: (updated) => {
            queryClient.setQueryData<Student>(
                studentKeys.detail(updated.student_id),
                updated,
            )
            invalidateLists(queryClient)
            toast.success(
                `Deactivated ${updated.first_name} ${updated.last_name}`,
            )
        },
        onError: (error) => {
            invalidateLists(queryClient)
            toast.error('Deactivate failed', {
                description: getApiErrorMessage(error),
            })
        },
    })
}

export function useActivateStudent() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: activateStudent,
        onSuccess: (updated) => {
            queryClient.setQueryData<Student>(
                studentKeys.detail(updated.student_id),
                updated,
            )
            invalidateLists(queryClient)
            toast.success(
                `Activated ${updated.first_name} ${updated.last_name}`,
            )
        },
        onError: (error) => {
            invalidateLists(queryClient)
            toast.error('Activate failed', {
                description: getApiErrorMessage(error),
            })
        },
    })
}

export function useBulkDeactivateStudents() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: bulkDeactivateStudents,
        onSuccess: (updated) => {
            invalidateLists(queryClient)
            toast.success(
                `Deactivated ${updated.length} student${updated.length > 1 ? 's' : ''}`,
            )
        },
        onError: (error) => {
            invalidateLists(queryClient)
            toast.error('Bulk deactivate failed', {
                description: getApiErrorMessage(error),
            })
        },
    })
}

export function useBulkActivateStudents() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: bulkActivateStudents,
        onSuccess: (updated) => {
            invalidateLists(queryClient)
            toast.success(
                `Activated ${updated.length} student${updated.length > 1 ? 's' : ''}`,
            )
        },
        onError: (error) => {
            invalidateLists(queryClient)
            toast.error('Bulk activate failed', {
                description: getApiErrorMessage(error),
            })
        },
    })
}

// ── Student Self-Service Hooks ───────────────────────────────────────

export function useUpdateMyStudentProfile() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (data: UpdateMyStudentProfileRequest) =>
            updateMyStudentProfile(data),
        onSuccess: (updated) => {
            queryClient.setQueryData<Student>(studentKeys.me(), updated)
            toast.success('Profile updated.')
        },
        onError: (error) => {
            toast.error('Failed to update profile', {
                description: getApiErrorMessage(error),
            })
        },
    })
}

export function useMyBankingDetails() {
    return useQuery({
        queryKey: studentKeys.bankingDetails(),
        queryFn: getMyBankingDetails,
        staleTime: 5 * 60_000,
    })
}

export function useUpsertMyBankingDetails() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (data: BankingDetailsRequest) =>
            upsertMyBankingDetails(data),
        onSuccess: (updated) => {
            queryClient.setQueryData(studentKeys.bankingDetails(), updated)
            toast.success('Banking details updated.')
        },
        onError: (error) => {
            toast.error('Failed to update banking details', {
                description: getApiErrorMessage(error),
            })
        },
    })
}
