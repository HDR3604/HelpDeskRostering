export interface CourseDemand {
    course_code: string
    tutors_required: number
    weight: number
}

export interface ShiftTemplate {
    id: string
    name: string
    day_of_week: number
    start_time: string
    end_time: string
    min_staff: number
    max_staff: number | null
    course_demands?: CourseDemand[]
    is_active: boolean
    created_at: string
    updated_at: string | null
}
