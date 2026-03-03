import { apiClient } from '@/lib/api-client'
import type { Student } from '@/types/student'

export interface ApplyStudentRequest {
    student_id: string
    first_name: string
    last_name: string
    email: string
    phone_number: string
    degree_programme: string
    major?: string
    current_year: number
    overall_gpa: number
    degree_gpa: number
    courses: { code: string; title: string; grade: string }[]
    availability: Record<string, number[]>
}

export async function applyAsStudent(
    req: ApplyStudentRequest,
): Promise<Student> {
    const { data } = await apiClient.post<Student>('/students', req)
    return data
}

export async function listStudents(status?: string): Promise<Student[]> {
    const params = status ? `?status=${status}` : ''
    const { data } = await apiClient.get<Student[]>(`/students${params}`)
    return data ?? []
}

export async function getStudent(id: number): Promise<Student> {
    const { data } = await apiClient.get<Student>(`/students/${id}`)
    return data
}

export async function acceptStudent(id: number): Promise<Student> {
    const { data } = await apiClient.patch<Student>(`/students/${id}/accept`)
    return data
}

export async function rejectStudent(id: number): Promise<Student> {
    const { data } = await apiClient.patch<Student>(`/students/${id}/reject`)
    return data
}

export async function getMyStudentProfile(): Promise<Student> {
    const { data } = await apiClient.get<Student>('/students/me')
    return data
}
