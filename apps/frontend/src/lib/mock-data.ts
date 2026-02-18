import type { Student } from "@/types/student"
import type { ScheduleResponse } from "@/types/schedule"
import type { ShiftTemplate } from "@/types/shift-template"

// --- Students (2 accepted, 3 pending, 1 rejected) ---

export const MOCK_STUDENTS: Student[] = [
  {
    student_id: 816012345,
    email_address: "jane.doe@my.uwi.edu",
    first_name: "Jane",
    last_name: "Doe",
    transcript_metadata: {
      overall_gpa: 3.72,
      degree_gpa: 3.85,
      degree_programme: "BSc Computer Science",
      courses: [
        { code: "COMP2611", name: "Data Structures", grade: "A", credits: 3 },
        { code: "COMP2605", name: "Enterprise Database Systems", grade: "A-", credits: 3 },
        { code: "COMP3610", name: "Big Data Analytics", grade: "B+", credits: 3 },
        { code: "INFO3604", name: "Project", grade: null, credits: 6 },
      ],
      current_level: 3,
    },
    availability: { 0: [8, 9, 10, 11], 1: [10, 11, 12, 13, 14], 2: [8, 9, 10], 3: [12, 13, 14, 15], 4: [8, 9, 10, 11, 12] },
    created_at: "2026-01-15T09:30:00Z",
    updated_at: null,
    accepted_at: "2026-01-20T14:00:00Z",
    rejected_at: null,
    min_weekly_hours: 6,
    max_weekly_hours: 12,
  },
  {
    student_id: 816023456,
    email_address: "mark.smith@my.uwi.edu",
    first_name: "Mark",
    last_name: "Smith",
    transcript_metadata: {
      overall_gpa: 3.45,
      degree_gpa: 3.50,
      degree_programme: "BSc Information Technology",
      courses: [
        { code: "COMP2611", name: "Data Structures", grade: "B+", credits: 3 },
        { code: "INFO2604", name: "Information Systems", grade: "A-", credits: 3 },
        { code: "COMP2605", name: "Enterprise Database Systems", grade: "B", credits: 3 },
      ],
      current_level: 2,
    },
    availability: { 0: [12, 13, 14, 15], 1: [8, 9, 10, 11], 2: [12, 13, 14, 15, 16], 3: [8, 9, 10], 4: [10, 11, 12, 13] },
    created_at: "2026-02-01T11:00:00Z",
    updated_at: null,
    accepted_at: null,
    rejected_at: null,
    min_weekly_hours: 4,
    max_weekly_hours: 10,
  },
  {
    student_id: 816034567,
    email_address: "aisha.kumar@my.uwi.edu",
    first_name: "Aisha",
    last_name: "Kumar",
    transcript_metadata: {
      overall_gpa: 3.91,
      degree_gpa: 3.95,
      degree_programme: "BSc Computer Science (Special)",
      courses: [
        { code: "COMP2611", name: "Data Structures", grade: "A+", credits: 3 },
        { code: "COMP3603", name: "Human-Computer Interaction", grade: "A", credits: 3 },
        { code: "COMP3610", name: "Big Data Analytics", grade: "A", credits: 3 },
        { code: "COMP3613", name: "Software Engineering II", grade: "A-", credits: 3 },
      ],
      current_level: 3,
    },
    availability: { 0: [8, 9, 10, 11, 12], 1: [8, 9, 10, 11, 12], 2: [14, 15, 16], 3: [8, 9, 10, 11], 4: [12, 13, 14, 15, 16] },
    created_at: "2026-02-05T08:45:00Z",
    updated_at: null,
    accepted_at: null,
    rejected_at: null,
    min_weekly_hours: 8,
    max_weekly_hours: 15,
  },
  {
    student_id: 816045678,
    email_address: "carlos.perez@my.uwi.edu",
    first_name: "Carlos",
    last_name: "Perez",
    transcript_metadata: {
      overall_gpa: 2.89,
      degree_gpa: 2.95,
      degree_programme: "BSc Information Technology",
      courses: [
        { code: "COMP2611", name: "Data Structures", grade: "B-", credits: 3 },
        { code: "INFO2604", name: "Information Systems", grade: "C+", credits: 3 },
        { code: "COMP1601", name: "Computer Programming I", grade: "F1", credits: 3 },
        { code: "COMP1602", name: "Computer Programming II", grade: "W", credits: 3 },
        { code: "INFO1600", name: "Introduction to IT", grade: "DEF", credits: 3 },
      ],
      current_level: 2,
    },
    availability: { 0: [10, 11, 12], 1: [10, 11, 12], 2: [10, 11, 12], 3: [10, 11, 12], 4: [10, 11, 12] },
    created_at: "2026-02-10T10:15:00Z",
    updated_at: null,
    accepted_at: null,
    rejected_at: "2026-02-12T16:30:00Z",
    min_weekly_hours: 4,
    max_weekly_hours: 8,
  },
  {
    student_id: 816056789,
    email_address: "tanya.williams@my.uwi.edu",
    first_name: "Tanya",
    last_name: "Williams",
    transcript_metadata: {
      overall_gpa: 3.60,
      degree_gpa: 3.70,
      degree_programme: "BSc Computer Science",
      courses: [
        { code: "COMP2611", name: "Data Structures", grade: "A-", credits: 3 },
        { code: "COMP2605", name: "Enterprise Database Systems", grade: "B+", credits: 3 },
        { code: "COMP3606", name: "Computer Networks", grade: "A", credits: 3 },
      ],
      current_level: 3,
    },
    availability: { 0: [8, 9, 14, 15, 16], 1: [8, 9, 10, 14, 15], 2: [8, 9, 10, 11], 3: [14, 15, 16], 4: [8, 9, 10, 11, 12, 13] },
    created_at: "2026-02-12T14:20:00Z",
    updated_at: null,
    accepted_at: "2026-02-14T09:00:00Z",
    rejected_at: null,
    min_weekly_hours: 6,
    max_weekly_hours: 12,
  },
  {
    student_id: 816067890,
    email_address: "devon.baptiste@my.uwi.edu",
    first_name: "Devon",
    last_name: "Baptiste",
    transcript_metadata: {
      overall_gpa: 3.20,
      degree_gpa: 3.30,
      degree_programme: "BSc Computer Science",
      courses: [
        { code: "COMP2611", name: "Data Structures", grade: "B", credits: 3 },
        { code: "COMP2605", name: "Enterprise Database Systems", grade: "B+", credits: 3 },
        { code: "COMP3603", name: "Human-Computer Interaction", grade: "B-", credits: 3 },
        { code: "COMP1600", name: "Introduction to Computing", grade: "MC", credits: 3 },
        { code: "INFO2605", name: "Professional Ethics", grade: null, credits: 3 },
      ],
      current_level: 3,
    },
    availability: { 0: [10, 11, 12, 13], 1: [10, 11, 12, 13], 2: [10, 11, 12, 13], 3: [10, 11, 12, 13], 4: [10, 11, 12, 13] },
    created_at: "2026-02-15T09:00:00Z",
    updated_at: null,
    accepted_at: null,
    rejected_at: null,
    min_weekly_hours: 4,
    max_weekly_hours: 10,
  },
]

// --- Shift Templates (Mon-Fri, morning and afternoon) ---

export const MOCK_SHIFT_TEMPLATES: ShiftTemplate[] = [
  { id: "st-001", name: "Mon Morning", day_of_week: 0, start_time: "08:00", end_time: "12:00", min_staff: 2, max_staff: 4, is_active: true, created_at: "2026-01-01T00:00:00Z", updated_at: null },
  { id: "st-002", name: "Mon Afternoon", day_of_week: 0, start_time: "13:00", end_time: "17:00", min_staff: 2, max_staff: 3, is_active: true, created_at: "2026-01-01T00:00:00Z", updated_at: null },
  { id: "st-003", name: "Tue Morning", day_of_week: 1, start_time: "08:00", end_time: "12:00", min_staff: 2, max_staff: 4, is_active: true, created_at: "2026-01-01T00:00:00Z", updated_at: null },
  { id: "st-004", name: "Tue Afternoon", day_of_week: 1, start_time: "13:00", end_time: "17:00", min_staff: 1, max_staff: 3, is_active: true, created_at: "2026-01-01T00:00:00Z", updated_at: null },
  { id: "st-005", name: "Wed Morning", day_of_week: 2, start_time: "08:00", end_time: "12:00", min_staff: 2, max_staff: 4, is_active: true, created_at: "2026-01-01T00:00:00Z", updated_at: null },
  { id: "st-006", name: "Wed Afternoon", day_of_week: 2, start_time: "13:00", end_time: "17:00", min_staff: 1, max_staff: 3, is_active: true, created_at: "2026-01-01T00:00:00Z", updated_at: null },
  { id: "st-007", name: "Thu Morning", day_of_week: 3, start_time: "08:00", end_time: "12:00", min_staff: 2, max_staff: 4, is_active: true, created_at: "2026-01-01T00:00:00Z", updated_at: null },
  { id: "st-008", name: "Thu Afternoon", day_of_week: 3, start_time: "13:00", end_time: "17:00", min_staff: 1, max_staff: 3, is_active: true, created_at: "2026-01-01T00:00:00Z", updated_at: null },
  { id: "st-009", name: "Fri Morning", day_of_week: 4, start_time: "08:00", end_time: "12:00", min_staff: 2, max_staff: 4, is_active: true, created_at: "2026-01-01T00:00:00Z", updated_at: null },
  { id: "st-010", name: "Fri Afternoon", day_of_week: 4, start_time: "13:00", end_time: "17:00", min_staff: 1, max_staff: 2, is_active: true, created_at: "2026-01-01T00:00:00Z", updated_at: null },
]

// --- Active Schedule (references accepted students by mock "assistant_id") ---

export const MOCK_ACTIVE_SCHEDULE: ScheduleResponse = {
  schedule_id: "sched-001",
  title: "Week 5 — Feb 17-21 Schedule",
  is_active: true,
  assignments: [
    // Jane Doe (accepted) — student_id 816012345
    { assistant_id: "816012345", shift_id: "st-001", day_of_week: 0, start: "08:00:00", end: "12:00:00" },
    { assistant_id: "816012345", shift_id: "st-005", day_of_week: 2, start: "08:00:00", end: "12:00:00" },
    { assistant_id: "816012345", shift_id: "st-009", day_of_week: 4, start: "08:00:00", end: "12:00:00" },
    // Tanya Williams (accepted) — student_id 816056789
    { assistant_id: "816056789", shift_id: "st-002", day_of_week: 0, start: "13:00:00", end: "17:00:00" },
    { assistant_id: "816056789", shift_id: "st-003", day_of_week: 1, start: "08:00:00", end: "12:00:00" },
    { assistant_id: "816056789", shift_id: "st-007", day_of_week: 3, start: "08:00:00", end: "12:00:00" },
    { assistant_id: "816056789", shift_id: "st-009", day_of_week: 4, start: "08:00:00", end: "12:00:00" },
  ],
  created_at: "2026-02-15T10:00:00Z",
  created_by: "admin-001",
  updated_at: null,
  archived_at: null,
  effective_from: "2026-02-17",
  effective_to: "2026-02-21",
  generation_id: "gen-001",
}

// Helper: map student_id to name for schedule display
export const STUDENT_NAME_MAP: Record<string, string> = {
  "816012345": "Jane Doe",
  "816056789": "Tanya Williams",
}

// Colors for schedule legend (uses chart CSS variables)
export const SCHEDULE_COLORS: string[] = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]
