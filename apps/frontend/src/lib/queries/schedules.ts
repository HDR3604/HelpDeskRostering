import {
    useQuery,
    useMutation,
    useQueryClient,
    type QueryClient,
} from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import type { ScheduleResponse, Assignment } from '@/types/schedule'
import {
    listSchedules,
    listArchivedSchedules,
    getSchedule,
    createSchedule,
    archiveSchedule,
    unarchiveSchedule,
    activateSchedule,
    deactivateSchedule,
    updateSchedule,
    notifyScheduleStudents,
} from '@/lib/api/schedules'

// ── Key Factory ──────────────────────────────────────────────────────

export const scheduleKeys = {
    all: () => ['schedules'] as const,
    lists: () => [...scheduleKeys.all(), 'list'] as const,
    list: (filter: 'active' | 'archived' | 'all') =>
        [...scheduleKeys.lists(), filter] as const,
    details: () => [...scheduleKeys.all(), 'detail'] as const,
    detail: (id: string) => [...scheduleKeys.details(), id] as const,
}

// ── Helpers ──────────────────────────────────────────────────────────

function invalidateLists(queryClient: QueryClient) {
    return queryClient.invalidateQueries({ queryKey: scheduleKeys.lists() })
}

function getErrorMessage(error: unknown, fallback: string): string {
    if (isAxiosError(error) && error.response?.data?.error) {
        return error.response.data.error
    }
    return fallback
}

function handleTransitionError(
    error: unknown,
    queryClient: QueryClient,
    action: string,
) {
    if (isAxiosError(error) && error.response?.status === 409) {
        toast.error(`Cannot ${action}`, {
            description: getErrorMessage(error, 'Invalid state transition.'),
        })
        invalidateLists(queryClient)
    } else {
        toast.error(`Failed to ${action}`, {
            description: 'Something went wrong. Please try again.',
        })
    }
}

// ── Query Hooks ──────────────────────────────────────────────────────

export function useSchedules() {
    const queryClient = useQueryClient()

    return useQuery({
        queryKey: scheduleKeys.list('all'),
        queryFn: async () => {
            const [active, archived] = await Promise.all([
                listSchedules(),
                listArchivedSchedules(),
            ])
            const all = [...active, ...archived]

            for (const schedule of all) {
                queryClient.setQueryData<ScheduleResponse>(
                    scheduleKeys.detail(schedule.schedule_id),
                    (existing) => existing ?? schedule,
                )
            }

            return all
        },
        staleTime: 30_000,
    })
}

export function useSchedule(id: string) {
    const queryClient = useQueryClient()

    return useQuery({
        queryKey: scheduleKeys.detail(id),
        queryFn: () => getSchedule(id),
        staleTime: 30_000,
        initialData: () => {
            return queryClient
                .getQueryData<ScheduleResponse[]>(scheduleKeys.list('all'))
                ?.find((s) => s.schedule_id === id)
        },
        initialDataUpdatedAt: () => {
            return queryClient.getQueryState(scheduleKeys.list('all'))
                ?.dataUpdatedAt
        },
    })
}

// ── Mutation Hooks ───────────────────────────────────────────────────

export function useCreateSchedule() {
    return useMutation({
        mutationFn: createSchedule,
        onError: () =>
            toast.error('Failed to create schedule', {
                description: 'Something went wrong. Please try again.',
            }),
    })
}

export function useRenameSchedule() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ id, title }: { id: string; title: string }) =>
            updateSchedule(id, { title }),
        onSuccess: (_, { id, title }) => {
            queryClient.setQueryData<ScheduleResponse[]>(
                scheduleKeys.list('all'),
                (old) =>
                    old?.map((s) =>
                        s.schedule_id === id ? { ...s, title } : s,
                    ),
            )
            queryClient.setQueryData<ScheduleResponse>(
                scheduleKeys.detail(id),
                (old) => (old ? { ...old, title } : old),
            )
            toast.success('Schedule renamed', {
                description: `Renamed to "${title}".`,
            })
        },
        onError: () =>
            toast.error('Failed to rename', {
                description: 'Something went wrong. Please try again.',
            }),
    })
}

export function useArchiveSchedule() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: archiveSchedule,
        onSuccess: () => {
            invalidateLists(queryClient)
        },
        onError: (error) =>
            handleTransitionError(error, queryClient, 'archive'),
    })
}

export function useUnarchiveSchedule() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: unarchiveSchedule,
        onSuccess: () => {
            invalidateLists(queryClient)
        },
        onError: (error) =>
            handleTransitionError(error, queryClient, 'unarchive'),
    })
}

export function useActivateSchedule() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: activateSchedule,
        onSuccess: () => {
            invalidateLists(queryClient)
        },
        onError: (error) =>
            handleTransitionError(error, queryClient, 'activate'),
    })
}

export function useDeactivateSchedule() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: deactivateSchedule,
        onSuccess: () => {
            invalidateLists(queryClient)
        },
        onError: (error) =>
            handleTransitionError(error, queryClient, 'deactivate'),
    })
}

export function useNotifyStudents() {
    return useMutation({
        mutationFn: notifyScheduleStudents,
        onError: () =>
            toast.error('Failed to send notifications', {
                description: 'Something went wrong. Please try again.',
            }),
    })
}

export function useSaveScheduleAssignments(scheduleId: string) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (assignments: Assignment[]) =>
            updateSchedule(scheduleId, { assignments }),
        onSuccess: (updated) => {
            queryClient.setQueryData<ScheduleResponse>(
                scheduleKeys.detail(scheduleId),
                updated,
            )
            invalidateLists(queryClient)
            toast.success('Schedule saved')
        },
        onError: () =>
            toast.error('Failed to save', {
                description: 'Something went wrong. Please try again.',
            }),
    })
}
