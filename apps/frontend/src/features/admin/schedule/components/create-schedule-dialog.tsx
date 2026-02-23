import { useState, useEffect, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { CalendarDays, Check, CheckCircle2, ChevronsUpDown, Loader2, Sparkles, TriangleAlert, X, XCircle } from "lucide-react"
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
import { Progress } from "@/components/ui/progress"
import type { Student } from "@/types/student"
import { toDateString, addDays } from "@/lib/format"
import type { ScheduleResponse, GenerationStatusUpdate } from "@/types/schedule"
import type { SchedulerConfig } from "@/types/scheduler-config"
import { getApplicationStatus } from "@/types/student"
import { useGenerationStatus } from "../hooks/use-generation-status"

const createScheduleSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  effectiveFrom: z.string().min(1, "Start date is required"),
  effectiveTo: z.string().min(1, "End date is required"),
  configId: z.string().min(1, "Select a scheduler config"),
  studentIds: z.array(z.string()).min(1, "Select at least one student"),
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
  const [generationId, setGenerationId] = useState<string | null>(null)
  const [formValues, setFormValues] = useState<CreateScheduleValues | null>(null)

  const acceptedStudents = students.filter((s) => getApplicationStatus(s) === "accepted")
  const defaultConfig = configs.find((c) => c.is_default)

  const today = toDateString(new Date())
  const nextWeek = addDays(today, 7)

  const form = useForm<CreateScheduleValues>({
    resolver: zodResolver(createScheduleSchema),
    defaultValues: {
      title: "",
      effectiveFrom: today,
      effectiveTo: nextWeek,
      configId: defaultConfig?.id ?? "",
      studentIds: [],
    },
  })

  const selectedIds = form.watch("studentIds")
  const configId = form.watch("configId")

  const selectedConfig = configs.find((c) => c.id === configId)

  const { status, schedule } = useGenerationStatus(generationId, students, formValues)

  const isLocked = status !== null && status.status !== "failed" && status.status !== "infeasible"

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
    setFormValues(values)
    setGenerationId(`gen-${Date.now()}`)
  }

  function handleOpenSchedule() {
    if (!schedule) return
    onCreated(schedule)
    resetDialog()
  }

  function handleTryAgain() {
    setGenerationId(null)
    setFormValues(null)
  }

  function resetDialog() {
    setGenerationId(null)
    setFormValues(null)
    form.reset()
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && isLocked) return
    if (!nextOpen) resetDialog()
    onOpenChange(nextOpen)
  }

  // Student picker trigger text
  function getTriggerText() {
    if (selectedIds.length === 0) return "Select students..."
    if (selectedIds.length <= 3) {
      return selectedIds
        .map((sid) => {
          const s = students.find((st) => String(st.student_id) === sid)
          return s?.first_name ?? sid
        })
        .join(", ")
    }
    return `${selectedIds.length} students selected`
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl" showCloseButton={!isLocked} onInteractOutside={(e) => { if (isLocked) e.preventDefault() }} onEscapeKeyDown={(e) => { if (isLocked) e.preventDefault() }}>
        {generationId ? (
          <GeneratingView
            status={status}
            onOpenSchedule={handleOpenSchedule}
            onTryAgain={handleTryAgain}
            onClose={() => handleOpenChange(false)}
          />
        ) : (
          <>
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
                            <div className="relative">
                              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                type="date"
                                className="pl-9"
                                value={field.value}
                                onChange={(e) => {
                                  field.onChange(e.target.value)
                                  if (e.target.value) {
                                    form.setValue("effectiveTo", addDays(e.target.value, 7), { shouldValidate: true })
                                  }
                                }}
                              />
                            </div>
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
                            <div className="relative">
                              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                type="date"
                                className="pl-9"
                                value={field.value}
                                onChange={(e) => field.onChange(e.target.value)}
                              />
                            </div>
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
                        {selectedConfig && (
                          <p className="text-xs text-muted-foreground">
                            Targets {selectedConfig.baseline_hours_target}h/student
                            {selectedConfig.solver_time_limit != null && ` · ${selectedConfig.solver_time_limit}s time limit`}
                          </p>
                        )}
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
                                {getTriggerText()}
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
                          <div className="flex flex-wrap gap-1.5 pt-1.5">
                            {selectedIds.map((sid) => {
                              const student = students.find((s) => String(s.student_id) === sid)
                              const initial = student?.first_name?.[0] ?? "?"
                              return (
                                <Badge
                                  key={sid}
                                  className="rounded-full bg-muted text-muted-foreground hover:bg-muted text-xs gap-1.5 pl-1 pr-1"
                                >
                                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
                                    {initial}
                                  </span>
                                  {student ? `${student.first_name} ${student.last_name}` : sid}
                                  <button
                                    type="button"
                                    className="rounded-full p-0.5 hover:bg-foreground/10"
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
                  <Button type="submit" variant="outline" className="gap-2">
                    <Sparkles className="h-3.5 w-3.5" />
                    Generate
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

// --- Generation status view ---

const STEP_LABELS = [
  "Analyzing availability...",
  "Optimizing assignments...",
  "Checking constraints...",
  "Finalizing schedule...",
]

function getStepLabel(progress: number): string {
  if (progress < 25) return STEP_LABELS[0]
  if (progress < 55) return STEP_LABELS[1]
  if (progress < 85) return STEP_LABELS[2]
  return STEP_LABELS[3]
}

interface GeneratingViewProps {
  status: GenerationStatusUpdate | null
  onOpenSchedule: () => void
  onTryAgain: () => void
  onClose: () => void
}

const REDIRECT_DELAY = 1500

function GeneratingView({ status, onOpenSchedule, onTryAgain, onClose }: GeneratingViewProps) {
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef(Date.now())
  const redirectedRef = useRef(false)

  useEffect(() => {
    if (!status || status.status === "completed" || status.status === "failed" || status.status === "infeasible") return
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [status?.status])

  // Auto-redirect after a brief delay on completion
  useEffect(() => {
    if (status?.status !== "completed" || redirectedRef.current) return
    const timer = setTimeout(() => {
      redirectedRef.current = true
      onOpenSchedule()
    }, REDIRECT_DELAY)
    return () => clearTimeout(timer)
  }, [status?.status, onOpenSchedule])

  const isFailed = status?.status === "failed" || status?.status === "infeasible"
  const isCompleted = status?.status === "completed"
  const isActive = status?.status === "pending" || status?.status === "running"

  return (
    <>
      <DialogHeader>
        <DialogTitle>Create Schedule</DialogTitle>
        <DialogDescription>
          {isActive && "Your schedule is being generated."}
          {isCompleted && "Your schedule is ready to use."}
          {isFailed && "Something went wrong during generation."}
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col items-center gap-4 py-8">
        {isActive && (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        {isCompleted && (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 animate-in zoom-in-50 duration-300">
            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
          </div>
        )}
        {isFailed && (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <XCircle className="h-6 w-6 text-destructive" />
          </div>
        )}

        {/* Progress bar */}
        {isActive && (
          <Progress value={status?.progress ?? 0} className="h-1.5 w-48" />
        )}

        <div className="flex flex-col items-center gap-1">
          {isActive && (
            <>
              <span className="text-sm font-medium">
                {status?.status === "pending" ? "Queued..." : getStepLabel(status?.progress ?? 0)}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">Elapsed: {elapsed}s</span>
            </>
          )}
          {isCompleted && (
            <>
              <span className="text-sm font-medium">Schedule generated!</span>
              <span className="text-xs text-muted-foreground">Redirecting to editor...</span>
            </>
          )}
          {isFailed && (
            <span className="text-sm font-medium">
              {status?.status === "infeasible" ? "No feasible solution" : "Generation failed"}
            </span>
          )}
        </div>

        {isFailed && status?.error_message && (
          <div className="flex w-full flex-col gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5">
            <div className="flex items-start gap-2">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <p className="text-sm text-destructive">{status.error_message}</p>
            </div>
            <p className="text-xs text-muted-foreground pl-6">Try adjusting students or constraints.</p>
          </div>
        )}
      </div>

      {isFailed && (
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={onTryAgain}>Try Again</Button>
        </DialogFooter>
      )}
    </>
  )
}
