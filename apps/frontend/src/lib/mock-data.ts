import type { Student } from "@/types/student"
import type { ScheduleResponse } from "@/types/schedule"
import type { ShiftTemplate } from "@/types/shift-template"
import type { TimeLog } from "@/types/time-log"

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

// --- Shift Templates (Mon-Fri, 1-hour slots from 8 AM to 4 PM) ---

function generateShiftTemplates(): ShiftTemplate[] {
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"]
  const templates: ShiftTemplate[] = []
  let idx = 1

  for (let day = 0; day < 5; day++) {
    for (let hour = 8; hour < 16; hour++) {
      const h = String(hour).padStart(2, "0")
      const hEnd = String(hour + 1).padStart(2, "0")
      templates.push({
        id: `st-${String(idx).padStart(3, "0")}`,
        name: `${DAYS[day]} ${h}:00`,
        day_of_week: day,
        start_time: `${h}:00`,
        end_time: `${hEnd}:00`,
        min_staff: hour >= 10 && hour < 14 ? 2 : 1, // busier mid-day
        max_staff: hour >= 10 && hour < 14 ? 4 : 3,
        is_active: true,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: null,
      })
      idx++
    }
  }
  return templates
}

export const MOCK_SHIFT_TEMPLATES: ShiftTemplate[] = generateShiftTemplates()

// Helper to find shift ID by day + hour
function shiftId(day: number, hour: number): string {
  const idx = day * 8 + (hour - 8) + 1
  return `st-${String(idx).padStart(3, "0")}`
}

// --- Active Schedule (references accepted students by mock "assistant_id") ---

export const MOCK_ACTIVE_SCHEDULE: ScheduleResponse = {
  schedule_id: "sched-001",
  title: "Week 5 — Feb 17-21 Schedule",
  is_active: true,
  assignments: [
    // Jane Doe — Mon 8-11, Wed 8-10, Fri 8-10
    ...[8, 9, 10].map((h) => ({ assistant_id: "816012345", shift_id: shiftId(0, h), day_of_week: 0, start: `${String(h).padStart(2, "0")}:00:00`, end: `${String(h + 1).padStart(2, "0")}:00:00` })),
    ...[8, 9].map((h) => ({ assistant_id: "816012345", shift_id: shiftId(2, h), day_of_week: 2, start: `${String(h).padStart(2, "0")}:00:00`, end: `${String(h + 1).padStart(2, "0")}:00:00` })),
    ...[8, 9].map((h) => ({ assistant_id: "816012345", shift_id: shiftId(4, h), day_of_week: 4, start: `${String(h).padStart(2, "0")}:00:00`, end: `${String(h + 1).padStart(2, "0")}:00:00` })),
    // Tanya Williams — Mon 14-16, Tue 8-10, Thu 14-16
    ...[14, 15].map((h) => ({ assistant_id: "816056789", shift_id: shiftId(0, h), day_of_week: 0, start: `${String(h).padStart(2, "0")}:00:00`, end: `${String(h + 1).padStart(2, "0")}:00:00` })),
    ...[8, 9].map((h) => ({ assistant_id: "816056789", shift_id: shiftId(1, h), day_of_week: 1, start: `${String(h).padStart(2, "0")}:00:00`, end: `${String(h + 1).padStart(2, "0")}:00:00` })),
    ...[14, 15].map((h) => ({ assistant_id: "816056789", shift_id: shiftId(3, h), day_of_week: 3, start: `${String(h).padStart(2, "0")}:00:00`, end: `${String(h + 1).padStart(2, "0")}:00:00` })),
    // Aisha Kumar — Mon 8-10, Tue 10-12, Wed 14-16, Fri 12-14
    ...[8, 9].map((h) => ({ assistant_id: "816034567", shift_id: shiftId(0, h), day_of_week: 0, start: `${String(h).padStart(2, "0")}:00:00`, end: `${String(h + 1).padStart(2, "0")}:00:00` })),
    ...[10, 11].map((h) => ({ assistant_id: "816034567", shift_id: shiftId(1, h), day_of_week: 1, start: `${String(h).padStart(2, "0")}:00:00`, end: `${String(h + 1).padStart(2, "0")}:00:00` })),
    ...[14, 15].map((h) => ({ assistant_id: "816034567", shift_id: shiftId(2, h), day_of_week: 2, start: `${String(h).padStart(2, "0")}:00:00`, end: `${String(h + 1).padStart(2, "0")}:00:00` })),
    ...[12, 13].map((h) => ({ assistant_id: "816034567", shift_id: shiftId(4, h), day_of_week: 4, start: `${String(h).padStart(2, "0")}:00:00`, end: `${String(h + 1).padStart(2, "0")}:00:00` })),
    // Keisha Moore — Mon 12-14, Tue 12-14, Thu 12-14
    ...[12, 13].map((h) => ({ assistant_id: "816078901", shift_id: shiftId(0, h), day_of_week: 0, start: `${String(h).padStart(2, "0")}:00:00`, end: `${String(h + 1).padStart(2, "0")}:00:00` })),
    ...[12, 13].map((h) => ({ assistant_id: "816078901", shift_id: shiftId(1, h), day_of_week: 1, start: `${String(h).padStart(2, "0")}:00:00`, end: `${String(h + 1).padStart(2, "0")}:00:00` })),
    ...[12, 13].map((h) => ({ assistant_id: "816078901", shift_id: shiftId(3, h), day_of_week: 3, start: `${String(h).padStart(2, "0")}:00:00`, end: `${String(h + 1).padStart(2, "0")}:00:00` })),
    // Ryan Charles — Tue 13-15, Wed 12-14, Fri 10-12
    ...[13, 14].map((h) => ({ assistant_id: "816089012", shift_id: shiftId(1, h), day_of_week: 1, start: `${String(h).padStart(2, "0")}:00:00`, end: `${String(h + 1).padStart(2, "0")}:00:00` })),
    ...[12, 13].map((h) => ({ assistant_id: "816089012", shift_id: shiftId(2, h), day_of_week: 2, start: `${String(h).padStart(2, "0")}:00:00`, end: `${String(h + 1).padStart(2, "0")}:00:00` })),
    ...[10, 11].map((h) => ({ assistant_id: "816089012", shift_id: shiftId(4, h), day_of_week: 4, start: `${String(h).padStart(2, "0")}:00:00`, end: `${String(h + 1).padStart(2, "0")}:00:00` })),
    // Priya Rampersad — Wed 8-10, Thu 14-16
    ...[8, 9].map((h) => ({ assistant_id: "816090123", shift_id: shiftId(2, h), day_of_week: 2, start: `${String(h).padStart(2, "0")}:00:00`, end: `${String(h + 1).padStart(2, "0")}:00:00` })),
    ...[14, 15].map((h) => ({ assistant_id: "816090123", shift_id: shiftId(3, h), day_of_week: 3, start: `${String(h).padStart(2, "0")}:00:00`, end: `${String(h + 1).padStart(2, "0")}:00:00` })),
    // Jordan Lee — Mon 10-12, Wed 10-12, Fri 14-16
    ...[10, 11].map((h) => ({ assistant_id: "816001234", shift_id: shiftId(0, h), day_of_week: 0, start: `${String(h).padStart(2, "0")}:00:00`, end: `${String(h + 1).padStart(2, "0")}:00:00` })),
    ...[10, 11].map((h) => ({ assistant_id: "816001234", shift_id: shiftId(2, h), day_of_week: 2, start: `${String(h).padStart(2, "0")}:00:00`, end: `${String(h + 1).padStart(2, "0")}:00:00` })),
    ...[14, 15].map((h) => ({ assistant_id: "816001234", shift_id: shiftId(4, h), day_of_week: 4, start: `${String(h).padStart(2, "0")}:00:00`, end: `${String(h + 1).padStart(2, "0")}:00:00` })),
    // Natasha Briggs — Tue 8-10, Thu 10-12
    ...[8, 9].map((h) => ({ assistant_id: "816002345", shift_id: shiftId(1, h), day_of_week: 1, start: `${String(h).padStart(2, "0")}:00:00`, end: `${String(h + 1).padStart(2, "0")}:00:00` })),
    ...[10, 11].map((h) => ({ assistant_id: "816002345", shift_id: shiftId(3, h), day_of_week: 3, start: `${String(h).padStart(2, "0")}:00:00`, end: `${String(h + 1).padStart(2, "0")}:00:00` })),
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
  "816034567": "Aisha Kumar",
  "816078901": "Keisha Moore",
  "816089012": "Ryan Charles",
  "816090123": "Priya Rampersad",
  "816001234": "Jordan Lee",
  "816002345": "Natasha Briggs",
}

// List of all schedules for the schedule management page
export const MOCK_SCHEDULES: ScheduleResponse[] = [
  MOCK_ACTIVE_SCHEDULE,
  {
    schedule_id: "sched-002",
    title: "Week 4 — Feb 10-14 Schedule",
    is_active: false,
    assignments: [
      { assistant_id: "816012345", shift_id: "st-001", day_of_week: 0, start: "08:00:00", end: "09:00:00" },
      { assistant_id: "816012345", shift_id: "st-002", day_of_week: 0, start: "09:00:00", end: "10:00:00" },
      { assistant_id: "816056789", shift_id: "st-009", day_of_week: 1, start: "08:00:00", end: "09:00:00" },
      { assistant_id: "816034567", shift_id: "st-017", day_of_week: 2, start: "08:00:00", end: "09:00:00" },
      { assistant_id: "816056789", shift_id: "st-033", day_of_week: 4, start: "08:00:00", end: "09:00:00" },
    ],
    created_at: "2026-02-08T10:00:00Z",
    created_by: "admin-001",
    updated_at: null,
    archived_at: "2026-02-15T00:00:00Z",
    effective_from: "2026-02-10",
    effective_to: "2026-02-14",
    generation_id: null,
  },
]

// Build a student name map from Student[] + existing STUDENT_NAME_MAP
export function buildStudentNameMap(students: Student[]): Record<string, string> {
  const map: Record<string, string> = { ...STUDENT_NAME_MAP }
  for (const s of students) {
    map[String(s.student_id)] = `${s.first_name} ${s.last_name}`
  }
  return map
}

// Colors for schedule legend (uses chart CSS variables)
export const SCHEDULE_COLORS: string[] = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

// --- Chart Data (derived from time_logs + assignments in production) ---

// Hours worked this week per accepted student (from time_logs: entry_at → exit_at)
export const MOCK_HOURS_WORKED = [
  { name: "Jane Doe", hours: 11.5, fill: "var(--chart-1)" },
  { name: "Tanya Williams", hours: 12, fill: "var(--chart-2)" },
  { name: "Aisha Kumar", hours: 14, fill: "var(--chart-3)" },
  { name: "Mark Smith", hours: 8, fill: "var(--chart-4)" },
  { name: "Devon Baptiste", hours: 6.5, fill: "var(--chart-5)" },
  { name: "Keisha Moore", hours: 10, fill: "var(--chart-1)" },
  { name: "Ryan Charles", hours: 9.5, fill: "var(--chart-2)" },
  { name: "Priya Rampersad", hours: 7, fill: "var(--chart-3)" },
  { name: "Jordan Lee", hours: 13, fill: "var(--chart-4)" },
  { name: "Natasha Briggs", hours: 4.5, fill: "var(--chart-5)" },
]

// Missed shifts this week per accepted student (3 shifts/day, ~15/week max)
export const MOCK_MISSED_SHIFTS = [
  { name: "Jane Doe", missed: 0, total: 9, fill: "var(--chart-1)" },
  { name: "Tanya Williams", missed: 1, total: 12, fill: "var(--chart-2)" },
  { name: "Aisha Kumar", missed: 0, total: 12, fill: "var(--chart-3)" },
  { name: "Mark Smith", missed: 3, total: 6, fill: "var(--chart-4)" },
  { name: "Devon Baptiste", missed: 1, total: 6, fill: "var(--chart-5)" },
  { name: "Keisha Moore", missed: 0, total: 9, fill: "var(--chart-1)" },
  { name: "Ryan Charles", missed: 2, total: 9, fill: "var(--chart-2)" },
  { name: "Priya Rampersad", missed: 0, total: 6, fill: "var(--chart-3)" },
  { name: "Jordan Lee", missed: 0, total: 12, fill: "var(--chart-4)" },
  { name: "Natasha Briggs", missed: 4, total: 6, fill: "var(--chart-5)" },
]

// --- Time Logs (clock in / clock out records for the current schedule week) ---

// Jane Doe: completed Mon 8-12, currently off clock (Tue has no shift)
// Tanya Williams: completed Mon 13-17, currently clocked in for Tue 8-12
export const MOCK_TIME_LOGS: TimeLog[] = [
  // Jane Doe — Mon morning shift (completed)
  {
    id: "tl-001",
    student_id: 816012345,
    entry_at: "2026-02-17T08:02:00Z",
    exit_at: "2026-02-17T11:58:00Z",
    created_at: "2026-02-17T08:02:00Z",
    longitude: -61.402,
    latitude: 10.643,
    distance_meters: 12.5,
  },
  // Tanya Williams — Mon afternoon shift (completed)
  {
    id: "tl-002",
    student_id: 816056789,
    entry_at: "2026-02-17T12:05:00Z",
    exit_at: "2026-02-17T15:55:00Z",
    created_at: "2026-02-17T12:05:00Z",
    longitude: -61.402,
    latitude: 10.643,
    distance_meters: 8.3,
  },
  // Tanya Williams — Tue morning shift (currently clocked in)
  {
    id: "tl-003",
    student_id: 816056789,
    entry_at: "2026-02-18T08:01:00Z",
    exit_at: null,
    created_at: "2026-02-18T08:01:00Z",
    longitude: -61.402,
    latitude: 10.643,
    distance_meters: 10.1,
  },
]
