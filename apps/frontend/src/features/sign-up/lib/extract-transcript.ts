import { apiClient } from "@/lib/api-client"
import type { VerifyData } from "./sign-up-schemas"

interface CourseResponse {
  code: string
  title: string
  grade: string | null
}

interface ExtractTranscriptResponse {
  first_name: string
  middle_name: string
  last_name: string
  student_id: string
  current_programme: string
  major: string
  current_term: string
  current_year: number
  degree_gpa: number | null
  overall_gpa: number | null
  courses: CourseResponse[]
}

export async function extractTranscript(file: File): Promise<VerifyData> {
  const formData = new FormData()
  formData.append("file", file)

  const { data } = await apiClient.post<ExtractTranscriptResponse>(
    "/transcripts/extract",
    formData,
  )

  return {
    studentId: data.student_id,
    firstName: data.first_name,
    lastName: data.last_name,
    degreeProgramme: data.current_programme,
    currentYear: `Year ${data.current_year}`,
    overallGpa: data.overall_gpa ?? 0,
    degreeGpa: data.degree_gpa ?? 0,
    courses: data.courses.map((c) => ({
      courseCode: c.code.replace(/\s+/g, ""),
      courseName: c.title,
      grade: c.grade ?? "",
    })),
  }
}
