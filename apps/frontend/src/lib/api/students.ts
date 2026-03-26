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

export async function deactivateStudent(id: number): Promise<Student> {
    const { data } = await apiClient.patch<Student>(
        `/students/${id}/deactivate`,
    )
    return data
}

export async function activateStudent(id: number): Promise<Student> {
    const { data } = await apiClient.patch<Student>(`/students/${id}/activate`)
    return data
}

export async function bulkDeactivateStudents(
    ids: number[],
): Promise<Student[]> {
    const { data } = await apiClient.patch<Student[]>(
        '/students/bulk-deactivate',
        { student_ids: ids },
    )
    return data ?? []
}

export async function bulkActivateStudents(ids: number[]): Promise<Student[]> {
    const { data } = await apiClient.patch<Student[]>(
        '/students/bulk-activate',
        { student_ids: ids },
    )
    return data ?? []
}

export async function getMyStudentProfile(): Promise<Student> {
    const { data } = await apiClient.get<Student>('/students/me')
    return data
}

export interface UpdateMyStudentProfileRequest {
    phone_number?: string
    availability?: Record<string, number[]>
    min_weekly_hours?: number
    max_weekly_hours?: number
    courses?: { code: string; title: string; grade: string | null }[]
    overall_gpa?: number | null
    degree_gpa?: number | null
    current_year?: number | null
    current_programme?: string | null
    major?: string | null
    transcript_first_name?: string | null
    transcript_last_name?: string | null
    transcript_student_id?: string | null
}

export async function updateMyStudentProfile(
    req: UpdateMyStudentProfileRequest,
): Promise<Student> {
    const { data } = await apiClient.put<Student>('/students/me', req)
    return data
}

// --- Banking details ---

export interface BankingDetailsRequest {
    bank_name?: string
    branch_name?: string
    account_type?: string
    account_number?: string
}

export interface BankingDetailsResponse {
    student_id: number
    bank_name: string
    branch_name: string
    account_type: string
    account_number: string
    created_at: string
    updated_at?: string
}

export async function getMyBankingDetails(): Promise<BankingDetailsResponse> {
    const { data } = await apiClient.get<BankingDetailsResponse>(
        '/students/me/banking-details',
    )
    return data
}

export async function upsertMyBankingDetails(
    req: BankingDetailsRequest,
): Promise<BankingDetailsResponse> {
    const { data } = await apiClient.put<BankingDetailsResponse>(
        '/students/me/banking-details',
        req,
    )
    return data
}

// --- Consent ---

export interface ConsentResponse {
    version: string
    text: string
}

export async function getCurrentConsent(): Promise<ConsentResponse> {
    const { data } = await apiClient.get<ConsentResponse>('/consent/current')
    return data
}
