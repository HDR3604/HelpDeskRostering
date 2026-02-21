import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { step2Schema, type Step2Data } from '@/features/sign-up/lib/sign-up-schemas'
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
import { ArrowLeft, ArrowRight, Plus, Trash2 } from 'lucide-react'

interface Step2Props {
    defaultValues: Step2Data
    onNext: (data: Step2Data) => void
    onBack: () => void
}

export function Step2TranscriptVerify({
    defaultValues,
    onNext,
    onBack,
}: Step2Props) {
    const form = useForm<Step2Data>({
        resolver: zodResolver(step2Schema),
        defaultValues,
    })

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'courses',
    })

    function onSubmit(data: Step2Data) {
        onNext(data)
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Degree Programme */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="degreeProgramme"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Degree Programme</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="e.g. BSc Computer Science (Special)"
                                        {...field}
                                    />
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
                                <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                >
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

                {/* GPA Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                        placeholder="e.g. 3.42"
                                        {...field}
                                        onChange={(e) =>
                                            field.onChange(
                                                e.target.value === '' ? NaN : parseFloat(e.target.value)
                                            )
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
                                        placeholder="e.g. 3.56"
                                        {...field}
                                        onChange={(e) =>
                                            field.onChange(
                                                e.target.value === '' ? NaN : parseFloat(e.target.value)
                                            )
                                        }
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* Courses Table */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <FormLabel className="text-base">Courses</FormLabel>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => append({ courseCode: '', grade: '' })}
                        >
                            <Plus className="size-4 mr-1" />
                            Add Course
                        </Button>
                    </div>

                    {form.formState.errors.courses?.root && (
                        <p className="text-destructive text-sm">
                            {form.formState.errors.courses.root.message}
                        </p>
                    )}

                    <div className="border rounded-lg overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead className="w-16">#</TableHead>
                                    <TableHead>Course Code</TableHead>
                                    <TableHead>Grade</TableHead>
                                    <TableHead className="w-16" />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fields.length === 0 && (
                                    <TableRow>
                                        <TableCell
                                            colSpan={4}
                                            className="text-center text-muted-foreground py-8"
                                        >
                                            No courses added. Click "Add Course" to begin.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {fields.map((field, index) => (
                                    <TableRow key={field.id}>
                                        <TableCell className="text-muted-foreground font-mono text-xs">
                                            {index + 1}
                                        </TableCell>
                                        <TableCell>
                                            <FormField
                                                control={form.control}
                                                name={`courses.${index}.courseCode`}
                                                render={({ field }) => (
                                                    <FormItem className="space-y-0">
                                                        <FormControl>
                                                            <Input
                                                                placeholder="e.g. COMP1600"
                                                                className="h-8"
                                                                {...field}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <FormField
                                                control={form.control}
                                                name={`courses.${index}.grade`}
                                                render={({ field }) => (
                                                    <FormItem className="space-y-0">
                                                        <FormControl>
                                                            <Input
                                                                placeholder="e.g. A+"
                                                                className="h-8"
                                                                {...field}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon-xs"
                                                onClick={() => remove(index)}
                                                className="text-muted-foreground hover:text-destructive"
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

                {/* Navigation */}
                <div className="flex justify-between pt-4">
                    <Button type="button" variant="outline" size="lg" onClick={onBack}>
                        <ArrowLeft className="size-4" />
                        Back
                    </Button>
                    <Button type="submit" size="lg">
                        Continue
                        <ArrowRight className="size-4" />
                    </Button>
                </div>
            </form>
        </Form>
    )
}
