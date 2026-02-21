import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { ArrowLeft, Loader2, Send } from 'lucide-react'
import type { Step1Data, Step2Data, Step3Data } from '@/features/sign-up/lib/sign-up-schemas'
import { cn } from '@/lib/utils'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const
const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16] as const

function formatHour(hour: number): string {
    if (hour === 12) return '12:00 PM'
    if (hour > 12) return `${hour - 12}:00 PM`
    return `${hour}:00 AM`
}

interface Step4Props {
    step1: Step1Data
    step2: Step2Data
    step3: Step3Data
    onBack: () => void
    onGoToStep: (step: number) => void
    onSubmit: () => void
    isSubmitting: boolean
}

export function Step4Review({
    step1,
    step2,
    step3,
    onBack,
    onGoToStep,
    onSubmit,
    isSubmitting,
}: Step4Props) {
    return (
        <div className="space-y-8">
            <div className="text-center space-y-1">
                <h2 className="text-xl font-semibold">Review Your Application</h2>
                <p className="text-muted-foreground text-sm">
                    Please review your information below before submitting.
                </p>
            </div>

            {/* ── Section 1: Personal Information ──────────────────────────── */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-base">Personal Information</h3>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onGoToStep(1)}
                        className="text-primary text-xs"
                    >
                        Edit
                    </Button>
                </div>
                <Separator />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                    <div>
                        <span className="text-muted-foreground">Student ID</span>
                        <p className="font-medium">{step1.studentId}</p>
                    </div>
                    <div>
                        <span className="text-muted-foreground">Email</span>
                        <p className="font-medium">{step1.email}</p>
                    </div>
                    <div>
                        <span className="text-muted-foreground">First Name</span>
                        <p className="font-medium">{step1.firstName}</p>
                    </div>
                    <div>
                        <span className="text-muted-foreground">Last Name</span>
                        <p className="font-medium">{step1.lastName}</p>
                    </div>
                    <div>
                        <span className="text-muted-foreground">Phone Number</span>
                        <p className="font-medium">{step1.phoneNumber}</p>
                    </div>
                    <div>
                        <span className="text-muted-foreground">Transcript</span>
                        <p className="font-medium">{step1.transcript.name}</p>
                    </div>
                </div>
            </section>

            {/* ── Section 2: Academic Data ─────────────────────────────────── */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-base">Academic Information</h3>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onGoToStep(2)}
                        className="text-primary text-xs"
                    >
                        Edit
                    </Button>
                </div>
                <Separator />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                    <div>
                        <span className="text-muted-foreground">Degree Programme</span>
                        <p className="font-medium">{step2.degreeProgramme}</p>
                    </div>
                    <div>
                        <span className="text-muted-foreground">Current Year</span>
                        <p className="font-medium">{step2.currentYear}</p>
                    </div>
                    <div>
                        <span className="text-muted-foreground">Overall GPA</span>
                        <p className="font-medium">{step2.overallGpa}</p>
                    </div>
                    <div>
                        <span className="text-muted-foreground">Degree GPA</span>
                        <p className="font-medium">{step2.degreeGpa}</p>
                    </div>
                </div>

                {/* Courses Table */}
                <div className="border rounded-lg overflow-hidden mt-3">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead className="w-16">#</TableHead>
                                <TableHead>Course Code</TableHead>
                                <TableHead>Grade</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {step2.courses.map((course, i) => (
                                <TableRow key={i}>
                                    <TableCell className="text-muted-foreground font-mono text-xs">
                                        {i + 1}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {course.courseCode}
                                    </TableCell>
                                    <TableCell>{course.grade}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </section>

            {/* ── Section 3: Availability ──────────────────────────────────── */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-base">Available Times</h3>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onGoToStep(3)}
                        className="text-primary text-xs"
                    >
                        Edit
                    </Button>
                </div>
                <Separator />

                {/* Mini availability grid (read-only) */}
                <div className="border rounded-lg overflow-hidden select-none">
                    <div className="grid grid-cols-[80px_repeat(5,1fr)] bg-muted/50">
                        <div className="p-2" />
                        {DAYS.map((day, i) => (
                            <div
                                key={day}
                                className="p-2 text-center font-medium text-xs border-l"
                            >
                                <span className="hidden sm:inline">{day}</span>
                                <span className="sm:hidden">{DAYS_SHORT[i]}</span>
                            </div>
                        ))}
                    </div>
                    {HOURS.map((hour) => (
                        <div
                            key={hour}
                            className="grid grid-cols-[80px_repeat(5,1fr)] border-t"
                        >
                            <div className="p-1.5 text-xs text-muted-foreground flex items-center justify-end pr-3 font-mono">
                                {formatHour(hour)}
                            </div>
                            {DAYS.map((_, dayIndex) => {
                                const active =
                                    step3.availability[String(dayIndex)]?.includes(hour) ?? false
                                return (
                                    <div key={`${dayIndex}-${hour}`} className="border-l p-0.5">
                                        <div
                                            className={cn(
                                                'w-full h-5 rounded-sm',
                                                active ? 'bg-primary' : 'bg-muted/30'
                                            )}
                                        />
                                    </div>
                                )
                            })}
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Navigation ───────────────────────────────────────────────── */}
            <div className="flex justify-between pt-4">
                <Button type="button" variant="outline" size="lg" onClick={onBack}>
                    <ArrowLeft className="size-4" />
                    Back
                </Button>
                <Button
                    type="button"
                    size="lg"
                    onClick={onSubmit}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="size-4 animate-spin" />
                            Submitting…
                        </>
                    ) : (
                        <>
                            <Send className="size-4" />
                            Submit Application
                        </>
                    )}
                </Button>
            </div>
        </div>
    )
}
