import {
    useQuery,
    useMutation,
    useQueryClient,
    type QueryClient,
} from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import type { Student } from '@/types/student'
import {
    applyAsStudent,
    listStudents,
    getStudent,
    acceptStudent,
    rejectStudent,
    getMyStudentProfile,
    type ApplyStudentRequest,
} from '@/lib/api/students'

// ── Key Factory ──────────────────────────────────────────────────────

export const studentKeys = {
    all: () => ['students'] as const,
    lists: () => [...studentKeys.all(), 'list'] as const,
    list: (status?: string) => [...studentKeys.lists(), status] as const,
    details: () => [...studentKeys.all(), 'detail'] as const,
    detail: (id: number) => [...studentKeys.details(), id] as const,
    me: () => [...studentKeys.all(), 'me'] as const,
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
            const message =
                isAxiosError(error) && error.response?.data?.error
                    ? error.response.data.error
                    : 'Something went wrong. Please try again.'
            toast.error('Application failed', { description: message })
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
            invalidateLists(queryClient)
        },
        onError: (error) => {
            invalidateLists(queryClient)
            const message =
                isAxiosError(error) && error.response?.data?.error
                    ? error.response.data.error
                    : 'Failed to accept student.'
            toast.error('Accept failed', { description: message })
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
            invalidateLists(queryClient)
        },
        onError: (error) => {
            invalidateLists(queryClient)
            const message =
                isAxiosError(error) && error.response?.data?.error
                    ? error.response.data.error
                    : 'Failed to reject student.'
            toast.error('Reject failed', { description: message })
        },
    })
}
