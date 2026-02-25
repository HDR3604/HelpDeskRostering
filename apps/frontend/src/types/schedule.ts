export interface Assignment {
    assistant_id: string
    shift_id: string
    day_of_week: number
    start: string
    end: string
}

export type ScheduleStatus = 'draft' | 'active' | 'archived'

export interface ScheduleResponse {
    schedule_id: string
    title: string
    status: ScheduleStatus
    is_active: boolean
    assignments: Assignment[] | null
    availability_metadata?: unknown
    created_at: string
    created_by: string
    updated_at: string | null
    archived_at: string | null
    effective_from: string
    effective_to: string | null
    generation_id: string | null
    config_id: string | null
    scheduler_metadata?: unknown
}

export type GenerationStatus =
    | 'pending'
    | 'running'
    | 'completed'
    | 'failed'
    | 'infeasible'

export interface GenerationStatusUpdate {
    id: string
    status: GenerationStatus
    schedule_id: string | null
    error_message: string | null
    started_at: string | null
    completed_at: string | null
    progress: number
}
