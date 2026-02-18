import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { CourseResult } from "@/types/student"

interface CourseFilterProps {
  courses: CourseResult[]
  scrollHeight?: string
}

const GRADE_OPTIONS = [
  "All",
  // Standard letter grades
  "A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-",
  // Failure grades
  "F", "F1", "F2", "F3",
  // Special grades
  "HD", "P", "W", "MC", "AB", "DEF", "NC", "EX", "NP", "INC",
  // In-progress (null grade)
  "In Progress",
]

export function CourseFilter({ courses, scrollHeight = "h-48" }: CourseFilterProps) {
  const [search, setSearch] = useState("")
  const [gradeFilter, setGradeFilter] = useState("All")

  const filtered = useMemo(() => {
    return courses.filter((c) => {
      const matchesSearch =
        search === "" ||
        c.code.toLowerCase().includes(search.toLowerCase()) ||
        c.name.toLowerCase().includes(search.toLowerCase())

      const matchesGrade =
        gradeFilter === "All" ||
        (gradeFilter === "In Progress" ? c.grade === null : c.grade === gradeFilter)

      return matchesSearch && matchesGrade
    })
  }, [courses, search, gradeFilter])

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="Search courses..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-sm"
        />
        <Select value={gradeFilter} onValueChange={setGradeFilter}>
          <SelectTrigger className="h-8 w-32 text-sm">
            <SelectValue placeholder="Grade" />
          </SelectTrigger>
          <SelectContent>
            {GRADE_OPTIONS.map((g) => (
              <SelectItem key={g} value={g}>
                {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ScrollArea className={scrollHeight}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead className="text-right">Credits</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                  No courses found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((course) => (
                <TableRow key={course.code}>
                  <TableCell className="font-mono text-xs">{course.code}</TableCell>
                  <TableCell className="text-sm">{course.name}</TableCell>
                  <TableCell>
                    {course.grade ? (
                      <Badge variant="secondary">{course.grade}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">In Progress</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{course.credits}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  )
}
