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
import { LogIn } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import type { VerifyData, ContactData } from '@/features/sign-up/lib/sign-up-schemas'
import { AvailabilitySummary } from './availability-summary'

interface ViewApplicationProps {
    verify: VerifyData
    contact: ContactData
    availability: Record<string, number[]>
    transcriptName: string
}

export function ViewApplication({ verify, contact, availability, transcriptName }: ViewApplicationProps) {
    return (
        <div className="space-y-8">
            <div className="text-center space-y-1">
                <h2 className="text-xl font-semibold">Your Submitted Application</h2>
                <p className="text-muted-foreground text-sm">
                    Below is a summary of the information you submitted.
                </p>
            </div>

            {/* Personal Information */}
            <section className="space-y-4">
                <h3 className="font-semibold text-base">Personal Information</h3>
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

            {/* Academic Information */}
            <section className="space-y-4">
                <h3 className="font-semibold text-base">Academic Information</h3>
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
                <h3 className="font-semibold text-base">Available Times</h3>
                <Separator />

                <AvailabilitySummary availability={availability} />
            </section>

            {/* Return to Login */}
            <div className="flex justify-center pt-4 pb-2">
                <Link to="/">
                    <Button size="lg" variant="outline">
                        <LogIn className="size-4" />
                        Return to Login
                    </Button>
                </Link>
            </div>
        </div>
    )
}
