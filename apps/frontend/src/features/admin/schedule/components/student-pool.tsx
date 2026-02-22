import { useState } from "react"
import { useDroppable } from "@dnd-kit/core"
import { Search, Users, X, PanelRightClose, PanelRightOpen } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { Student } from "@/types/student"
import type { EditorAction } from "../types"
import { StudentChip } from "./student-chip"

interface StudentPoolProps {
  students: Student[]
  assignedStudentIds: Set<string>
  studentColorIndex: Record<string, number>
  studentHours: Record<string, number>
  dispatch: React.Dispatch<EditorAction>
  onHoverStudent?: (id: string | null) => void
}

export function StudentPool({ students, assignedStudentIds, studentColorIndex, studentHours, dispatch, onHoverStudent }: StudentPoolProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [search, setSearch] = useState("")
  const { setNodeRef, isOver } = useDroppable({ id: "pool" })

  const assignedCount = assignedStudentIds.size
  const allStudentCount = students.length

  const filtered = search
    ? students.filter((s) =>
        `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase()),
      )
    : students

  if (collapsed) {
    return (
      <div
        ref={setNodeRef}
        className={cn(
          "sticky top-6 self-start flex w-12 shrink-0 flex-col items-center rounded-xl border bg-card py-3 gap-3 transition-colors",
          isOver && "ring-2 ring-primary/20 ring-inset bg-accent/50",
        )}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCollapsed(false)}>
              <PanelRightOpen className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Show students</TooltipContent>
        </Tooltip>

        <div className="flex flex-col items-center gap-1">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
            {assignedCount}/{allStudentCount}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "sticky top-6 self-start flex w-64 shrink-0 flex-col rounded-xl border bg-card overflow-hidden transition-colors",
        isOver && "ring-2 ring-primary/20 ring-inset bg-accent/50",
      )}
    >
      {/* Header */}
      <div className="shrink-0 border-b px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <h3 className="text-sm font-semibold flex-1">Students</h3>
          <span className="text-[10px] tabular-nums text-muted-foreground shrink-0">
            {assignedCount}/{allStudentCount}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 -mr-1" onClick={() => setCollapsed(true)}>
                <PanelRightClose className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Hide panel</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Search */}
      <div className="shrink-0 px-3 pt-2.5 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search students..."
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

      {/* Student list */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-1.5 pb-2">
          {filtered.length > 0 ? (
            filtered.map((student) => {
              const sid = String(student.student_id)
              return (
                <StudentChip
                  key={sid}
                  studentId={sid}
                  name={`${student.first_name} ${student.last_name}`}
                  colorIndex={studentColorIndex[sid] ?? 0}
                  context="pool"
                  hours={studentHours[sid] ?? 0}
                  maxHours={student.max_weekly_hours}
                  dispatch={dispatch}
                  onHoverStudent={onHoverStudent}
                />
              )
            })
          ) : (
            <div className="flex flex-col items-center py-8 text-center">
              <Users className="h-5 w-5 text-muted-foreground/30" />
              <p className="mt-1.5 text-xs text-muted-foreground">
                {search ? "No matches" : "No students"}
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
