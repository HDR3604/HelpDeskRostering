import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"
import type { Student } from "@/types/student"
import type { ScheduleResponse } from "@/types/schedule"
import { getApplicationStatus } from "@/types/student"

const createScheduleSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(100),
    effectiveFrom: z.string().min(1, "Start date is required"),
    effectiveTo: z.string().min(1, "End date is required"),
    studentIds: z.array(z.string()).min(1, "Select at least one student"),
  })
  .refine((d) => new Date(d.effectiveTo) >= new Date(d.effectiveFrom), {
    message: "End date must be on or after start date",
    path: ["effectiveTo"],
  })

type CreateScheduleValues = z.infer<typeof createScheduleSchema>

interface CreateScheduleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  students: Student[]
  onCreated: (schedule: ScheduleResponse) => void
}

export function CreateScheduleDialog({ open, onOpenChange, students, onCreated }: CreateScheduleDialogProps) {
  const [studentPickerOpen, setStudentPickerOpen] = useState(false)

  const acceptedStudents = students.filter((s) => getApplicationStatus(s) === "accepted")

  const form = useForm<CreateScheduleValues>({
    resolver: zodResolver(createScheduleSchema),
    defaultValues: {
      title: "",
      effectiveFrom: "",
      effectiveTo: "",
      studentIds: [],
    },
  })

  const selectedIds = form.watch("studentIds")

  function toggleStudent(studentId: string) {
    const current = form.getValues("studentIds")
    if (current.includes(studentId)) {
      form.setValue("studentIds", current.filter((id) => id !== studentId), { shouldValidate: true })
    } else {
      form.setValue("studentIds", [...current, studentId], { shouldValidate: true })
    }
  }

  function onSubmit(values: CreateScheduleValues) {
    const newSchedule: ScheduleResponse = {
      schedule_id: `sched-${Date.now()}`,
      title: values.title,
      is_active: false,
      assignments: [],
      created_at: new Date().toISOString(),
      created_by: "admin-001",
      updated_at: null,
      archived_at: null,
      effective_from: values.effectiveFrom,
      effective_to: values.effectiveTo,
      generation_id: null,
    }
    onCreated(newSchedule)
    form.reset()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Schedule</DialogTitle>
          <DialogDescription>Set up a new weekly schedule with selected students.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Week 6 — Feb 24-28 Schedule" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="effectiveFrom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="effectiveTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="studentIds"
              render={() => (
                <FormItem className="flex flex-col">
                  <FormLabel>Students</FormLabel>
                  <Popover open={studentPickerOpen} onOpenChange={setStudentPickerOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn("w-full justify-between font-normal", selectedIds.length === 0 && "text-muted-foreground")}
                        >
                          {selectedIds.length === 0
                            ? "Select students..."
                            : `${selectedIds.length} student${selectedIds.length > 1 ? "s" : ""} selected`}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search students..." />
                        <CommandList>
                          <CommandEmpty>No students found.</CommandEmpty>
                          <CommandGroup>
                            {acceptedStudents.map((student) => {
                              const sid = String(student.student_id)
                              const isSelected = selectedIds.includes(sid)
                              return (
                                <CommandItem
                                  key={sid}
                                  value={`${student.first_name} ${student.last_name}`}
                                  onSelect={() => toggleStudent(sid)}
                                >
                                  <Check className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")} />
                                  {student.first_name} {student.last_name}
                                  <span className="ml-auto text-xs text-muted-foreground">{sid}</span>
                                </CommandItem>
                              )
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  {/* Selected tags */}
                  {selectedIds.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {selectedIds.map((sid) => {
                        const student = students.find((s) => String(s.student_id) === sid)
                        return (
                          <Badge key={sid} variant="secondary" className="text-xs">
                            {student ? `${student.first_name} ${student.last_name}` : sid}
                          </Badge>
                        )
                      })}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Create</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
