import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Clock, GraduationCap, Search } from "lucide-react"
import type { Student } from "@/types/student"
import { getApplicationStatus } from "@/types/student"

interface TranscriptDialogProps {
  student: Student | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"]
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15]

function formatHour(h: number) {
  return h <= 12 ? `${h}am` : `${h - 12}pm`
}

const statusStyle: Record<string, string> = {
  accepted: "bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/15",
  rejected: "bg-red-500/15 text-red-500 hover:bg-red-500/15",
  pending: "bg-amber-500/15 text-amber-500 hover:bg-amber-500/15",
}

function gradeColor(grade: string | null): string {
  if (!grade) return "text-muted-foreground"
  if (grade.startsWith("A")) return "text-emerald-600 dark:text-emerald-400"
  if (grade.startsWith("B")) return "text-blue-600 dark:text-blue-400"
  if (grade.startsWith("C")) return "text-amber-600 dark:text-amber-400"
  if (grade.startsWith("D") || grade.startsWith("F")) return "text-red-600 dark:text-red-400"
  return "text-muted-foreground"
}

export function TranscriptDialog({ student, open, onOpenChange }: TranscriptDialogProps) {
  const [courseSearch, setCourseSearch] = useState("")

  if (!student) return null

  const { transcript_metadata: t } = student
  const status = getApplicationStatus(student)
  const totalCredits = t.courses.reduce((sum, c) => sum + c.credits, 0)
  const completedCourses = t.courses.filter((c) => c.grade !== null).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Student Transcript</DialogTitle>
          <DialogDescription>
            Transcript details for {student.first_name} {student.last_name}
          </DialogDescription>
        </DialogHeader>

        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {student.first_name[0]}{student.last_name[0]}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold leading-none">
                  {student.first_name} {student.last_name}
                </h3>
                <Badge className={cn("capitalize text-[10px]", statusStyle[status])}>
                  {status}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{student.email_address}</p>
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-3.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-lg bg-muted/50 px-3 py-2">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">GPA</p>
              <p className="text-sm font-semibold">{t.overall_gpa.toFixed(2)} <span className="text-xs font-normal text-muted-foreground">/ 4.0</span></p>
            </div>
            <div className="rounded-lg bg-muted/50 px-3 py-2">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Programme</p>
              <p className="truncate text-sm font-semibold">{t.degree_programme.replace("BSc ", "")}</p>
            </div>
            <div className="rounded-lg bg-muted/50 px-3 py-2">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Credits</p>
              <p className="text-sm font-semibold">{totalCredits} <span className="text-xs font-normal text-muted-foreground">({completedCourses}/{t.courses.length} done)</span></p>
            </div>
            <div className="rounded-lg bg-muted/50 px-3 py-2">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Hours / Week</p>
              <p className="text-sm font-semibold">{student.min_weekly_hours}–{student.max_weekly_hours ?? "?"} <span className="text-xs font-normal text-muted-foreground">hrs</span></p>
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto border-t">
          <div className="space-y-5 px-6 pt-4 pb-6">
            {/* Availability heatmap */}
            <div>
              <div className="mb-2 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-sm font-medium">Availability</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr>
                      <th className="pr-1 text-right font-medium text-muted-foreground" />
                      {HOURS.map((h) => (
                        <th key={h} className="px-0.5 text-center font-medium text-muted-foreground">
                          {formatHour(h)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {DAYS.map((day, dayIdx) => (
                      <tr key={day}>
                        <td className="pr-1.5 text-right font-medium text-muted-foreground">{day}</td>
                        {HOURS.map((h) => {
                          const available = student.availability[dayIdx]?.includes(h) ?? false
                          return (
                            <td key={h} className="p-0.5">
                              <div
                                className={cn(
                                  "mx-auto h-4 w-full rounded-sm",
                                  available ? "bg-primary" : "bg-muted"
                                )}
                              />
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-1.5 flex items-center gap-3 text-[10px] text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="h-2.5 w-2.5 rounded-sm bg-primary" />
                  <span>Available</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-2.5 w-2.5 rounded-sm bg-muted" />
                  <span>Unavailable</span>
                </div>
              </div>
            </div>

            {/* Courses */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-sm font-medium">Courses</p>
                </div>
                <span className="text-xs text-muted-foreground">{t.courses.length} courses</span>
              </div>
              <div className="relative mb-2">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search courses..."
                  value={courseSearch}
                  onChange={(e) => setCourseSearch(e.target.value)}
                  className="h-8 pl-8 text-xs"
                />
              </div>
              <div className="max-h-48 overflow-y-auto">
                <div className="space-y-0.5">
                  {t.courses
                    .filter((c) => {
                      if (!courseSearch) return true
                      const q = courseSearch.toLowerCase()
                      return c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
                    })
                    .map((course) => (
                      <div
                        key={course.code}
                        className="flex items-center gap-3 rounded-md px-2.5 py-1.5 text-sm hover:bg-muted/50"
                      >
                        <span className="w-20 shrink-0 font-mono text-xs text-muted-foreground">{course.code}</span>
                        <span className="min-w-0 flex-1 truncate">{course.name}</span>
                        <span className="w-6 text-right text-xs text-muted-foreground">{course.credits}cr</span>
                        <span className={cn("w-8 text-right text-xs font-medium", gradeColor(course.grade))}>
                          {course.grade ?? "—"}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
