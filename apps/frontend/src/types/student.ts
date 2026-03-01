export interface CourseResult {
    code: string
    title: string
    grade: string | null
}

export interface TranscriptMetadata {
    first_name: string
    last_name: string
    student_id: string
    current_programme: string
    major: string
    current_term: string
    current_year: number
    overall_gpa: number | null
    degree_gpa: number | null
    courses: CourseResult[]
}

export interface Student {
    student_id: number
    email_address: string
    first_name: string
    last_name: string
    phone_number: string
    transcript_metadata: TranscriptMetadata
    availability: Record<string, number[]>
    created_at: string
    updated_at: string | null
    accepted_at: string | null
    rejected_at: string | null
    min_weekly_hours: number
    max_weekly_hours: number | null
    status: string
}

export type ApplicationStatus = 'pending' | 'accepted' | 'rejected'

export function getApplicationStatus(student: Student): ApplicationStatus {
    if (student.accepted_at) return 'accepted'
    if (student.rejected_at) return 'rejected'
    return 'pending'
}
