import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Check, ChevronsUpDown, X } from "lucide-react"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import type { SchedulerConfig } from "@/types/scheduler-config"
import { getApplicationStatus } from "@/types/student"

const createScheduleSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(100),
    effectiveFrom: z.string().min(1, "Start date is required"),
    effectiveTo: z.string().min(1, "End date is required"),
    configId: z.string().min(1, "Select a scheduler config"),
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
  configs: SchedulerConfig[]
  onCreated: (schedule: ScheduleResponse) => void
}

export function CreateScheduleDialog({ open, onOpenChange, students, configs, onCreated }: CreateScheduleDialogProps) {
  const [studentPickerOpen, setStudentPickerOpen] = useState(false)

  const acceptedStudents = students.filter((s) => getApplicationStatus(s) === "accepted")
  const defaultConfig = configs.find((c) => c.is_default)

  const form = useForm<CreateScheduleValues>({
    resolver: zodResolver(createScheduleSchema),
    defaultValues: {
      title: "",
      effectiveFrom: "",
      effectiveTo: "",
      configId: defaultConfig?.id ?? "",
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

  function removeStudent(studentId: string) {
    const current = form.getValues("studentIds")
    form.setValue("studentIds", current.filter((id) => id !== studentId), { shouldValidate: true })
  }

  function toggleAll() {
    const allIds = acceptedStudents.map((s) => String(s.student_id))
    if (selectedIds.length === acceptedStudents.length) {
      form.setValue("studentIds", [], { shouldValidate: true })
    } else {
      form.setValue("studentIds", allIds, { shouldValidate: true })
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
      config_id: values.configId,
    }
    onCreated(newSchedule)
    form.reset()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
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
              name="configId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scheduler Config</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a config..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {configs.map((config) => (
                        <SelectItem key={config.id} value={config.id}>
                          <span className="flex items-center gap-2">
                            {config.name}
                            {config.is_default && (
                              <Badge className="bg-muted text-muted-foreground hover:bg-muted text-[10px] px-1.5 py-0">
                                Default
                              </Badge>
                            )}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="studentIds"
              render={() => (
                <FormItem className="flex flex-col">
                  <div className="flex items-center justify-between">
                    <FormLabel>Students</FormLabel>
                    {acceptedStudents.length > 0 && (
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs"
                        onClick={toggleAll}
                      >
                        {selectedIds.length === acceptedStudents.length ? "Deselect all" : "Select all"}
                      </Button>
                    )}
                  </div>
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
                          <Badge
                            key={sid}
                            className="bg-muted text-muted-foreground hover:bg-muted text-xs gap-1 pr-1"
                          >
                            {student ? `${student.first_name} ${student.last_name}` : sid}
                            <button
                              type="button"
                              className="ml-0.5 rounded-full p-0.5 hover:bg-foreground/10"
                              onClick={() => removeStudent(sid)}
                            >
                              <X className="h-3 w-3" />
                            </button>
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
