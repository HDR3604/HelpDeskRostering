import { useState, useMemo } from "react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { MOCK_HOURS_WORKED, MOCK_SEMESTERS } from "@/lib/mock-data"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Student } from "@/types/student"

const YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020]

function getTotalHours(student: Student): number {
  const record = MOCK_HOURS_WORKED.find((s) => 
    s.name === `${student.first_name} ${student.last_name}`
  )
  return record ? record.hours : 0
}

function getSemester(student: Student): string {
  const record = MOCK_SEMESTERS.find((s) => s.name === `${student.first_name} ${student.last_name}`)
  return record ? String(record.semester) : "1"
}

interface DeactivatedStudentsProps {
  students: Student[]
  onActivate: (student: Student) => void
  onDeactivate: (student: Student) => void
}

export function DeactivatedStudents({ students, onActivate, onDeactivate }: DeactivatedStudentsProps) {
  const [search, setSearch] = useState("")
  const [yearFilter, setYearFilter] = useState("all")
  const [semesterFilter, setSemesterFilter] = useState("all")

const filtered = useMemo(() => {
  return students.filter((student) => {
    const studentName = `${student.first_name} ${student.last_name}`.toLowerCase()
    const nameAndID = studentName.includes(search.toLowerCase()) ||
      String(student.student_id).includes(search)
    const year = yearFilter === "all" ||
      String(student.transcript_metadata.current_level) === yearFilter
    const semester = semesterFilter === "all" ||  
      getSemester(student) === semesterFilter
    return nameAndID && year && semester
  })
}, [students, search, yearFilter, semesterFilter])


  function handleActivate(student: Student) {
    onActivate(student)
    toast.success(`${student.first_name} ${student.last_name} reactivated`, {
      action: { label: "Undo", onClick: () => onDeactivate(student) },
    })
  }

  return (
    <div className="space-y-4 pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder="Search name or ID" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Year" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {YEARS.map((year, index) => (
                <SelectItem key={year} value={String(index + 1)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
        </Select>
        <Select value={semesterFilter} onValueChange={setSemesterFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Semester" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Semesters</SelectItem>
            <SelectItem value="1">Semester 1</SelectItem>
            <SelectItem value="2">Semester 2</SelectItem>
            <SelectItem value="3">Semester 3</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table className="table-fixed w-full">
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Total Hours</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-4">No students found</TableCell>
              </TableRow>
            ) : (
              filtered.map((student) => (
                <TableRow key={student.student_id}>
                  <TableCell className="text-sm">
                    {student.student_id}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{student.first_name} {student.last_name}</p>
                    <p className="text-xs text-muted-foreground">Level {student.transcript_metadata.current_level}</p>
                  </TableCell>
                  <TableCell className="text-sm">
                    {student.email_address}
                  </TableCell>
                  <TableCell>
                    {getTotalHours(student)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => handleActivate(student)}>Activate</Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}