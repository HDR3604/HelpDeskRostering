import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { verifySchema, type VerifyData } from '@/features/sign-up/lib/sign-up-schemas'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { ArrowLeft, ArrowRight, Info, Pencil, Plus, Trash2, Check } from 'lucide-react'

interface StepVerifyDetailsProps {
    defaultValues: VerifyData
    onNext: (data: VerifyData) => void
    onBack: () => void
}

function SectionHeader({
    title,
    editing,
    onToggle,
    badge,
}: {
    title: string
    editing: boolean
    onToggle: () => void
    badge?: number
}) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <h3 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wide">
                    {title}
                </h3>
                {badge !== undefined && badge > 0 && (
                    <Badge variant="secondary" className="text-[11px] px-1.5 py-0">
                        {badge}
                    </Badge>
                )}
            </div>
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onToggle}
                className="text-xs h-7"
            >
                {editing ? (
                    <>
                        <Check className="size-3.5" />
                        Done
                    </>
                ) : (
                    <>
                        <Pencil className="size-3.5" />
                        Edit
                    </>
                )}
            </Button>
        </div>
    )
}

function ReadOnlyField({ label, value }: { label: string; value: string | number }) {
    return (
        <div>
            <span className="text-sm text-muted-foreground">{label}</span>
            <p className="font-medium text-sm">{value}</p>
        </div>
    )
}

export function StepVerifyDetails({ defaultValues, onNext, onBack }: StepVerifyDetailsProps) {
    const [editingPersonal, setEditingPersonal] = useState(false)
    const [editingAcademic, setEditingAcademic] = useState(false)
    const [editingCourses, setEditingCourses] = useState(false)

    const form = useForm<VerifyData>({
        resolver: zodResolver(verifySchema),
        defaultValues,
    })

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'courses',
    })

    const watched = form.watch()

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onNext)} className="space-y-8">
                {/* Info banner */}
                <div className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50/50 px-4 py-3 dark:border-blue-900/50 dark:bg-blue-950/20">
                    <Info className="mt-0.5 size-4 shrink-0 text-blue-600 dark:text-blue-400" />
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                        These details were extracted from your transcript. Review them below and click Edit if anything needs correcting.
                    </p>
                </div>

                {/* Personal Information */}
                <section className="space-y-4 rounded-lg border bg-card p-5">
                    <SectionHeader
                        title="Personal Information"
                        editing={editingPersonal}
                        onToggle={() => setEditingPersonal(!editingPersonal)}
                    />
                    {editingPersonal ? (
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                            <FormField
                                control={form.control}
                                name="studentId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Student ID</FormLabel>
                                        <FormControl>
                                            <Input placeholder="816012345" maxLength={9} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="firstName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>First Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="John" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="lastName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Last Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Doe" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-3">
                            <ReadOnlyField label="Student ID" value={watched.studentId} />
                            <ReadOnlyField label="First Name" value={watched.firstName} />
                            <ReadOnlyField label="Last Name" value={watched.lastName} />
                        </div>
                    )}
                </section>

                {/* Academic Details */}
                <section className="space-y-4 rounded-lg border bg-card p-5">
                    <SectionHeader
                        title="Academic Details"
                        editing={editingAcademic}
                        onToggle={() => setEditingAcademic(!editingAcademic)}
                    />
                    {editingAcademic ? (
                        <>
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                <FormField
                                    control={form.control}
                                    name="degreeProgramme"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Degree Programme</FormLabel>
                                            <FormControl>
                                                <Input placeholder="BSc Computer Science (Special)" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="currentYear"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Current Year</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="Select year" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="Year 1">Year 1</SelectItem>
                                                    <SelectItem value="Year 2">Year 2</SelectItem>
                                                    <SelectItem value="Year 3">Year 3</SelectItem>
                                                    <SelectItem value="Year 4">Year 4</SelectItem>
                                                    <SelectItem value="Year 5">Year 5</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                <FormField
                                    control={form.control}
                                    name="overallGpa"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Overall GPA</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    max="4.3"
                                                    placeholder="3.42"
                                                    {...field}
                                                    onChange={(e) =>
                                                        field.onChange(e.target.value === '' ? NaN : parseFloat(e.target.value))
                                                    }
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="degreeGpa"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Degree GPA</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    max="4.3"
                                                    placeholder="3.56"
                                                    {...field}
                                                    onChange={(e) =>
                                                        field.onChange(e.target.value === '' ? NaN : parseFloat(e.target.value))
                                                    }
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                            <ReadOnlyField label="Degree Programme" value={watched.degreeProgramme} />
                            <ReadOnlyField label="Current Year" value={watched.currentYear} />
                            <ReadOnlyField label="Overall GPA" value={watched.overallGpa} />
                            <ReadOnlyField label="Degree GPA" value={watched.degreeGpa} />
                        </div>
                    )}
                </section>

                {/* Courses */}
                <section className="space-y-4 rounded-lg border bg-card p-5">
                    <SectionHeader
                        title="Courses"
                        editing={editingCourses}
                        onToggle={() => setEditingCourses(!editingCourses)}
                        badge={fields.length}
                    />

                    {form.formState.errors.courses?.root && (
                        <p className="text-destructive text-sm">
                            {form.formState.errors.courses.root.message}
                        </p>
                    )}

                    {editingCourses ? (
                        /* ── Editable table ── */
                        <div className="space-y-3">
                            <div className="border rounded-lg overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
                                            <TableHead className="w-12">#</TableHead>
                                            <TableHead className="w-[130px]">Code</TableHead>
                                            <TableHead>Name</TableHead>
                                            <TableHead className="w-[80px]">Grade</TableHead>
                                            <TableHead className="w-12" />
                                        </TableRow>
                                    </TableHeader>
                                </Table>
                                <div className="max-h-[360px] overflow-y-auto">
                                    <Table>
                                        <TableBody>
                                            {fields.length === 0 && (
                                                <TableRow>
                                                    <TableCell
                                                        colSpan={5}
                                                        className="text-center text-muted-foreground py-8"
                                                    >
                                                        No courses added. Click &ldquo;Add Course&rdquo; to begin.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                            {fields.map((field, index) => (
                                                <TableRow key={field.id}>
                                                    <TableCell className="w-12 text-muted-foreground font-mono text-xs">
                                                        {index + 1}
                                                    </TableCell>
                                                    <TableCell className="w-[130px]">
                                                        <FormField
                                                            control={form.control}
                                                            name={`courses.${index}.courseCode`}
                                                            render={({ field }) => (
                                                                <FormItem className="space-y-0">
                                                                    <FormControl>
                                                                        <Input placeholder="COMP1600" className="h-8" {...field} />
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <FormField
                                                            control={form.control}
                                                            name={`courses.${index}.courseName`}
                                                            render={({ field }) => (
                                                                <FormItem className="space-y-0">
                                                                    <FormControl>
                                                                        <Input placeholder="Course name" className="h-8" {...field} />
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="w-[80px]">
                                                        <FormField
                                                            control={form.control}
                                                            name={`courses.${index}.grade`}
                                                            render={({ field }) => (
                                                                <FormItem className="space-y-0">
                                                                    <FormControl>
                                                                        <Input placeholder="A+" className="h-8" {...field} />
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="w-12">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-7 text-muted-foreground hover:text-destructive"
                                                            onClick={() => remove(index)}
                                                        >
                                                            <Trash2 className="size-3.5" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => append({ courseCode: '', courseName: '', grade: '' })}
                                >
                                    <Plus className="size-4" />
                                    Add Course
                                </Button>
                            </div>
                        </div>
                    ) : (
                        /* ── Read-only table ── */
                        <div className="border rounded-lg overflow-hidden">
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
                                        {fields.length === 0 ? (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={4}
                                                    className="text-center text-muted-foreground py-8"
                                                >
                                                    No courses found. Click &ldquo;Edit&rdquo; to add courses.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            fields.map((field, i) => (
                                                <TableRow key={field.id}>
                                                    <TableCell className="w-12 text-muted-foreground font-mono text-xs">
                                                        {i + 1}
                                                    </TableCell>
                                                    <TableCell className="w-[120px] font-medium">
                                                        {watched.courses[i]?.courseCode}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground">
                                                        {watched.courses[i]?.courseName}
                                                    </TableCell>
                                                    <TableCell className="w-[70px]">
                                                        {watched.courses[i]?.grade}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}
                </section>

                {/* Navigation */}
                <div className="flex items-center gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={onBack}>
                        <ArrowLeft className="size-4" />
                        Back
                    </Button>
                    <div className="flex-1" />
                    <Button type="submit">
                        Continue
                        <ArrowRight className="size-4" />
                    </Button>
                </div>
            </form>
        </Form>
    )
}
