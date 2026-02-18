import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { Clock, BookOpen } from "lucide-react"
import { CourseFilter } from "@/components/course-filter"
import type { Student } from "@/types/student"
import { getApplicationStatus } from "@/types/student"

interface TranscriptDialogProps {
  student: Student | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"]
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16]

function formatHour(h: number) {
  return h <= 12 ? `${h}am` : `${h - 12}pm`
}

function GpaRing({ value, label }: { value: number; label: string }) {
  const pct = Math.min((value / 4.0) * 100, 100)
  const color =
    value >= 3.5 ? "text-emerald-500" : value >= 3.0 ? "text-blue-500" : value >= 2.5 ? "text-amber-500" : "text-red-500"
  const fill =
    value >= 3.5 ? "fill-emerald-500/10" : value >= 3.0 ? "fill-blue-500/10" : value >= 2.5 ? "fill-amber-500/10" : "fill-red-500/10"

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="15.5" strokeWidth="3" className={cn("stroke-muted fill-muted/40")} />
          <circle
            cx="18"
            cy="18"
            r="15.5"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${pct} ${100 - pct}`}
            className={cn("transition-all duration-500", fill, color.replace("text-", "stroke-"))}
          />
        </svg>
        <span className={cn("absolute text-sm font-bold", color)}>{value.toFixed(2)}</span>
      </div>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

export function TranscriptDialog({ student, open, onOpenChange }: TranscriptDialogProps) {
  if (!student) return null

  const { transcript_metadata: t } = student
  const status = getApplicationStatus(student)
  const totalCredits = t.courses.reduce((sum, c) => sum + c.credits, 0)
  const completedCourses = t.courses.filter((c) => c.grade !== null).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] gap-0 overflow-y-auto p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Student Transcript</DialogTitle>
          <DialogDescription>
            Transcript details for {student.first_name} {student.last_name}
          </DialogDescription>
        </DialogHeader>

        {/* Student profile hero */}
        <div className="flex flex-col gap-4 px-6 pt-6 pb-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Left: identity */}
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {student.first_name[0]}{student.last_name[0]}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold leading-none">
                  {student.first_name} {student.last_name}
                </h3>
                <Badge
                  variant={status === "accepted" ? "default" : status === "rejected" ? "destructive" : "outline"}
                  className="capitalize"
                >
                  {status}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{student.email_address}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{t.degree_programme}</span>
                <Separator orientation="vertical" className="!h-3" />
                <span>Level {t.current_level}</span>
                <Separator orientation="vertical" className="!h-3" />
                <span className="flex items-center gap-1">
                  <BookOpen className="h-3 w-3" />
                  {totalCredits} cr ({completedCourses}/{t.courses.length})
                </span>
                <Separator orientation="vertical" className="!h-3" />
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {student.min_weekly_hours}–{student.max_weekly_hours ?? "?"} hrs/wk
                </span>
              </div>
            </div>
          </div>

          {/* Right: GPA rings */}
          <div className="flex shrink-0 items-center gap-5 pl-14 sm:pl-0">
            <GpaRing value={t.overall_gpa} label="Overall" />
            <GpaRing value={t.degree_gpa} label="Degree" />
          </div>
        </div>

        <Separator />

        {/* Scrollable body */}
        <div className="space-y-5 px-6 pt-4 pb-6">
          {/* Availability heatmap */}
          <div>
            <p className="mb-2 text-sm font-medium">Weekly Availability</p>
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

          <Separator />

          {/* Courses */}
          <div>
            <p className="mb-2 text-sm font-medium">Courses</p>
            <CourseFilter courses={t.courses} scrollHeight="h-52" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
