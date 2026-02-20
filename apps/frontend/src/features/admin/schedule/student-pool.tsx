import { useState } from "react"
import { useDroppable } from "@dnd-kit/core"
import { Search, Users, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Student } from "@/types/student"
import type { EditorAction } from "./types"
import { StudentChip } from "./student-chip"

interface StudentPoolProps {
  unassignedStudents: Student[]
  studentColorIndex: Record<string, number>
  studentHours: Record<string, number>
  dispatch: React.Dispatch<EditorAction>
}

export function StudentPool({ unassignedStudents, studentColorIndex, studentHours, dispatch }: StudentPoolProps) {
  const [search, setSearch] = useState("")
  const { setNodeRef, isOver } = useDroppable({ id: "pool" })

  const filtered = search
    ? unassignedStudents.filter((s) =>
        `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase()),
      )
    : unassignedStudents

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-64 shrink-0 flex-col rounded-xl border bg-card shadow-sm overflow-hidden transition-colors",
        isOver && "ring-2 ring-primary/20 ring-inset bg-accent/50",
      )}
    >
      {/* Header */}
      <div className="shrink-0 border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Students</h3>
          <span className="text-xs text-muted-foreground">
            {unassignedStudents.length} available
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="shrink-0 px-3 pt-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 pr-7 text-xs"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Unassigned list */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-1.5 pb-2">
          {filtered.length > 0 ? (
            filtered.map((student) => {
              const sid = String(student.student_id)
              const hours = studentHours[sid] ?? 0
              const maxH = student.max_weekly_hours

              return (
                <div key={sid} className="flex items-center">
                  <div className="flex-1 min-w-0">
                    <StudentChip
                      studentId={sid}
                      name={`${student.first_name} ${student.last_name}`}
                      colorIndex={studentColorIndex[sid] ?? 0}
                      context="pool"
                      dispatch={dispatch}
                    />
                  </div>
                  <span className="shrink-0 pr-2.5 text-[10px] tabular-nums text-muted-foreground">
                    {hours}/{maxH ?? "∞"}h
                  </span>
                </div>
              )
            })
          ) : (
            <div className="flex flex-col items-center py-8 text-center">
              <Users className="h-5 w-5 text-muted-foreground/30" />
              <p className="mt-1.5 text-xs text-muted-foreground">
                {search ? "No matches" : "All assigned"}
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

    </div>
  )
}
