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
import type { VerifyData, ContactData } from '@/features/sign-up/lib/sign-up-schemas'
import { AvailabilitySummary } from './availability-summary'

interface StepReviewProps {
    verify: VerifyData
    contact: ContactData
    availability: Record<string, number[]>
    transcriptName: string
    onGoToStep: (step: number) => void
    onBack: () => void
    onSubmit: () => void
    isSubmitting: boolean
}

export function StepReview({
    verify,
    contact,
    availability,
    transcriptName,
    onGoToStep,
    onBack,
    onSubmit,
    isSubmitting,
}: StepReviewProps) {
    return (
        <div className="space-y-8">
            {/* Personal & Contact */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-base">Personal Information</h3>
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
                        <span className="text-muted-foreground">Student ID</span>
                        <p className="font-medium">{verify.studentId}</p>
                    </div>
                    <div>
                        <span className="text-muted-foreground">Name</span>
                        <p className="font-medium">{verify.firstName} {verify.lastName}</p>
                    </div>
                    <div>
                        <span className="text-muted-foreground">Email</span>
                        <p className="font-medium">{contact.email}</p>
                    </div>
                    <div>
                        <span className="text-muted-foreground">Phone Number</span>
                        <p className="font-medium">{contact.phoneNumber}</p>
                    </div>
                    <div>
                        <span className="text-muted-foreground">Transcript</span>
                        <p className="font-medium">{transcriptName}</p>
                    </div>
                </div>
            </section>

            {/* Academic */}
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
                        <p className="font-medium">{verify.degreeProgramme}</p>
                    </div>
                    <div>
                        <span className="text-muted-foreground">Current Year</span>
                        <p className="font-medium">{verify.currentYear}</p>
                    </div>
                    <div>
                        <span className="text-muted-foreground">Overall GPA</span>
                        <p className="font-medium">{verify.overallGpa}</p>
                    </div>
                    <div>
                        <span className="text-muted-foreground">Degree GPA</span>
                        <p className="font-medium">{verify.degreeGpa}</p>
                    </div>
                </div>

                <div className="border rounded-lg overflow-hidden mt-3">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead className="w-12">#</TableHead>
                                <TableHead className="w-[120px]">Code</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead className="w-[70px]">Grade</TableHead>
                            </TableRow>
                        </TableHeader>
                    </Table>
                    <div className="max-h-[280px] overflow-y-auto">
                        <Table>
                            <TableBody>
                                {verify.courses.map((course, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="w-12 text-muted-foreground font-mono text-xs">
                                            {i + 1}
                                        </TableCell>
                                        <TableCell className="w-[120px] font-medium">{course.courseCode}</TableCell>
                                        <TableCell className="text-muted-foreground">{course.courseName}</TableCell>
                                        <TableCell className="w-[70px]">{course.grade}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </section>

            {/* Availability */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-base">Available Times</h3>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onGoToStep(4)}
                        className="text-primary text-xs"
                    >
                        Edit
                    </Button>
                </div>
                <Separator />

                <AvailabilitySummary availability={availability} />
            </section>

            {/* Navigation */}
            <div className="flex items-center gap-3 pt-2">
                <Button type="button" variant="outline" onClick={onBack}>
                    <ArrowLeft className="size-4" />
                    Back
                </Button>
                <div className="flex-1" />
                <Button type="button" onClick={onSubmit} disabled={isSubmitting}>
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
