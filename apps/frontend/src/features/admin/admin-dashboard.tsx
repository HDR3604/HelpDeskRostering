import { useRef, useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, X } from "lucide-react"
import { SummaryCards } from "./summary-cards"
import { StudentApplicationsTable } from "./student-applications-table"
import { ActiveScheduleCard } from "./active-schedule-card"
import { MiniWeeklySchedule } from "./mini-weekly-schedule"
import { HoursWorkedChart } from "./hours-worked-chart"
import { MissedShiftsChart } from "./missed-shifts-chart"
import { MOCK_STUDENTS, MOCK_ACTIVE_SCHEDULE, MOCK_SHIFT_TEMPLATES, STUDENT_NAME_MAP, MOCK_HOURS_WORKED, MOCK_MISSED_SHIFTS } from "@/lib/mock-data"
import { getApplicationStatus } from "@/types/student"
import type { Student } from "@/types/student"

const TOAST_DURATION = 5000

export function AdminDashboard() {
  const [students, setStudents] = useState<Student[]>(MOCK_STUDENTS)
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())
  const pendingTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  function toggleStudent(name: string) {
    setSelectedStudents((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const filteredHours = useMemo(
    () => [...(selectedStudents.size === 0 ? MOCK_HOURS_WORKED : MOCK_HOURS_WORKED.filter((s) => selectedStudents.has(s.name)))].sort((a, b) => b.hours - a.hours),
    [selectedStudents],
  )
  const filteredMissed = useMemo(
    () => [...(selectedStudents.size === 0 ? MOCK_MISSED_SHIFTS : MOCK_MISSED_SHIFTS.filter((s) => selectedStudents.has(s.name)))].sort((a, b) => b.total - a.total),
    [selectedStudents],
  )

  const pendingCount = students.filter((s) => getApplicationStatus(s) === "pending").length
  const acceptedCount = students.filter((s) => getApplicationStatus(s) === "accepted").length
  const scheduledThisWeekCount = new Set(
    MOCK_ACTIVE_SCHEDULE.assignments.map((a) => a.assistant_id)
  ).size

  function scheduleCommit(studentId: number, action: "accept" | "reject") {
    const existing = pendingTimers.current.get(studentId)
    if (existing) clearTimeout(existing)

    const timer = setTimeout(() => {
      pendingTimers.current.delete(studentId)
      // TODO: fire API call — PATCH /api/v1/students/:id/{action}
      console.log(`[commit] ${action} student ${studentId}`)
    }, TOAST_DURATION)

    pendingTimers.current.set(studentId, timer)
  }

  function cancelCommit(studentId: number) {
    const timer = pendingTimers.current.get(studentId)
    if (timer) {
      clearTimeout(timer)
      pendingTimers.current.delete(studentId)
    }
  }

  function handleAccept(studentId: number) {
    const prev = students.find((s) => s.student_id === studentId)
    if (!prev) return
    const snapshot = { accepted_at: prev.accepted_at, rejected_at: prev.rejected_at }
    setStudents((s) =>
      s.map((st) =>
        st.student_id === studentId
          ? { ...st, accepted_at: new Date().toISOString(), rejected_at: null }
          : st
      )
    )
    scheduleCommit(studentId, "accept")
    toast.success(`${prev.first_name} ${prev.last_name} accepted`, {
      duration: TOAST_DURATION,
      action: {
        label: "Undo",
        onClick: () => {
          cancelCommit(studentId)
          setStudents((s) =>
            s.map((st) =>
              st.student_id === studentId
                ? { ...st, accepted_at: snapshot.accepted_at, rejected_at: snapshot.rejected_at }
                : st
            )
          )
        },
      },
    })
  }

  function handleReject(studentId: number) {
    const prev = students.find((s) => s.student_id === studentId)
    if (!prev) return
    const snapshot = { accepted_at: prev.accepted_at, rejected_at: prev.rejected_at }
    setStudents((s) =>
      s.map((st) =>
        st.student_id === studentId
          ? { ...st, rejected_at: new Date().toISOString(), accepted_at: null }
          : st
      )
    )
    scheduleCommit(studentId, "reject")
    toast.error(`${prev.first_name} ${prev.last_name} rejected`, {
      duration: TOAST_DURATION,
      action: {
        label: "Undo",
        onClick: () => {
          cancelCommit(studentId)
          setStudents((s) =>
            s.map((st) =>
              st.student_id === studentId
                ? { ...st, accepted_at: snapshot.accepted_at, rejected_at: snapshot.rejected_at }
                : st
            )
          )
        },
      },
    })
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Overview of student applications, scheduling, and helpdesk operations.
        </p>
      </div>

      {/* Summary stats */}
      <SummaryCards
        pendingCount={pendingCount}
        acceptedCount={acceptedCount}
        scheduledThisWeekCount={scheduledThisWeekCount}
        totalCount={students.length}
      />

      {/* Applications table — full width */}
      <StudentApplicationsTable
        students={students}
        onAccept={handleAccept}
        onReject={handleReject}
        onSync={async () => {
          await new Promise((r) => setTimeout(r, 800))
          setStudents([...MOCK_STUDENTS])
        }}
      />

      {/* Charts — side by side */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Weekly Analytics</h2>
            <p className="text-sm text-muted-foreground">Hours worked and attendance for the current schedule period.</p>
          </div>
          <div className="flex items-center gap-2">
            {selectedStudents.size > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedStudents(new Set())}>
                <X className="mr-1 h-3.5 w-3.5" />
                Clear
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  {selectedStudents.size === 0
                    ? "All students"
                    : `${selectedStudents.size} selected`}
                  <ChevronDown className="ml-1 h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {MOCK_HOURS_WORKED.map((s) => (
                  <DropdownMenuCheckboxItem
                    key={s.name}
                    checked={selectedStudents.has(s.name)}
                    onCheckedChange={() => toggleStudent(s.name)}
                    onSelect={(e) => e.preventDefault()}
                  >
                    {s.name}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <HoursWorkedChart data={filteredHours} />
          <MissedShiftsChart data={filteredMissed} />
        </div>
      </div>

      {/* Schedule section — side by side */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ActiveScheduleCard schedule={MOCK_ACTIVE_SCHEDULE} />
        <MiniWeeklySchedule
          schedule={MOCK_ACTIVE_SCHEDULE}
          shiftTemplates={MOCK_SHIFT_TEMPLATES}
          studentNames={STUDENT_NAME_MAP}
        />
      </div>
    </div>
  )
}
