import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Student } from "@/types/student"

interface TranscriptDialogProps {
  student: Student | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TranscriptDialog({ student, open, onOpenChange }: TranscriptDialogProps) {
  if (!student) return null

  const { transcript_metadata: t } = student

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {student.first_name} {student.last_name}
          </DialogTitle>
          <DialogDescription>{student.email_address}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-2">
          <div>
            <p className="text-sm text-muted-foreground">Programme</p>
            <p className="text-sm font-medium">{t.degree_programme}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Level</p>
            <p className="text-sm font-medium">{t.current_level}</p>
          </div>
        </div>

        <div className="flex gap-4">
          <Badge variant="outline">Overall GPA: {t.overall_gpa.toFixed(2)}</Badge>
          <Badge variant="outline">Degree GPA: {t.degree_gpa.toFixed(2)}</Badge>
        </div>

        <Separator />

        <div>
          <p className="mb-2 text-sm font-medium">Courses</p>
          <ScrollArea className="h-48">
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
                {t.courses.map((course) => (
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
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}
