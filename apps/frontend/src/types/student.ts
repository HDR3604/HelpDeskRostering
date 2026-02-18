export interface CourseResult {
  code: string
  name: string
  grade: string | null
  credits: number
}

export interface TranscriptMetadata {
  overall_gpa: number
  degree_gpa: number
  degree_programme: string
  courses: CourseResult[]
  current_level: number
}

export interface Student {
  student_id: number
  email_address: string
  first_name: string
  last_name: string
  transcript_metadata: TranscriptMetadata
  availability: Record<number, number[]>
  created_at: string
  updated_at: string | null
  accepted_at: string | null
  rejected_at: string | null
  min_weekly_hours: number
  max_weekly_hours: number | null
}

export type ApplicationStatus = "pending" | "accepted" | "rejected"

export function getApplicationStatus(student: Student): ApplicationStatus {
  if (student.accepted_at) return "accepted"
  if (student.rejected_at) return "rejected"
  return "pending"
}
