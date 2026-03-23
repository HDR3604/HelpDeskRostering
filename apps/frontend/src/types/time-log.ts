export interface TimeLog {
    id: string
    student_id: number
    entry_at: string
    exit_at: string | null
    created_at: string
    longitude: number
    latitude: number
    distance_meters: number
    is_flagged: boolean
    flag_reason: string | null
}

export interface ShiftInfo {
    shift_id: string
    name: string
    start_time: string
    end_time: string
}

export interface ClockInStatus {
    is_clocked_in: boolean
    current_log: TimeLog | null
    current_shift: ShiftInfo | null
}

export interface ClockInCode {
    id: string
    code: string
    expires_at: string
    created_at: string
}
