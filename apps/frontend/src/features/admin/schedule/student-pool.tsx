import { useState, useMemo } from "react"
import { useDroppable } from "@dnd-kit/core"
import { Search, Users, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Student } from "@/types/student"
import type { EditorAction } from "./types"
import { STUDENT_COLORS } from "./types"
import { StudentChip } from "./student-chip"

interface StudentPoolProps {
  unassignedStudents: Student[]
  allStudents: Student[]
  studentColorIndex: Record<string, number>
  studentHours: Record<string, number>
  dispatch: React.Dispatch<EditorAction>
}

export function StudentPool({ unassignedStudents, allStudents, studentColorIndex, studentHours, dispatch }: StudentPoolProps) {
  const [search, setSearch] = useState("")
  const { setNodeRef, isOver } = useDroppable({ id: "pool" })

  const filtered = search
    ? unassignedStudents.filter((s) =>
        `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase()),
      )
    : unassignedStudents

  const assignedStudents = useMemo(
    () => allStudents.filter((s) => !unassignedStudents.some((u) => u.student_id === s.student_id)),
    [allStudents, unassignedStudents],
  )

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-xl border bg-card shadow-sm overflow-hidden transition-colors",
        isOver && "ring-2 ring-primary/20 ring-inset bg-accent/50",
      )}
    >
      {/* Header — matches dashboard CardHeader style */}
      <div className="shrink-0 px-6 pt-6 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
            <Users className="h-4 w-4 text-blue-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold leading-none">Student Pool</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {unassignedStudents.length} available · {assignedStudents.length} assigned
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="shrink-0 px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search students..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {/* Student list */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-2 pb-2">
          {filtered.length > 0 ? (
            filtered.map((student) => {
              const sid = String(student.student_id)
              const hours = studentHours[sid] ?? 0
              const maxH = student.max_weekly_hours
              const color = STUDENT_COLORS[studentColorIndex[sid] % STUDENT_COLORS.length]

              return (
                <div key={sid}>
                  <StudentChip
                    studentId={sid}
                    name={`${student.first_name} ${student.last_name}`}
                    colorIndex={studentColorIndex[sid] ?? 0}
                    context="pool"
                    dispatch={dispatch}
                  />
                  {/* Hours info — indented under the avatar */}
                  <div className="ml-[3.25rem] mr-3 mb-1">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <Clock className="h-2.5 w-2.5" />
                      <span>{hours}h / {maxH ?? "∞"}h</span>
                    </div>
                    <div className="mt-0.5 h-1 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", color.dot)}
                        style={{ width: `${Math.min((hours / (maxH ?? 20)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="flex flex-col items-center py-10 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Users className="h-5 w-5 text-muted-foreground/50" />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {search ? "No matching students" : "All students assigned"}
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Legend — matches dashboard's weekly schedule legend style */}
      {assignedStudents.length > 0 && (
        <div className="shrink-0 border-t px-6 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            On Schedule
          </p>
          <div className="flex flex-wrap gap-x-3 gap-y-1.5">
            {assignedStudents.map((student) => {
              const sid = String(student.student_id)
              const color = STUDENT_COLORS[studentColorIndex[sid] % STUDENT_COLORS.length]
              return (
                <div key={sid} className="flex items-center gap-1.5 text-xs" title={`${student.first_name} ${student.last_name} — ${studentHours[sid] ?? 0}h`}>
                  <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", color.dot)} />
                  <span className="text-muted-foreground">{student.first_name}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
