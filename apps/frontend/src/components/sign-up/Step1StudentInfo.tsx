import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { step1Schema, type Step1Data } from '@/lib/sign-up-schemas'
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
import { PhoneNumberInput } from './PhoneInput'
import { Upload, FileText, Loader2, ArrowRight } from 'lucide-react'
import { useRef, useState } from 'react'

interface Step1Props {
    defaultValues?: Partial<Step1Data>
    onNext: (data: Step1Data) => void
    isProcessing?: boolean
}

export function Step1StudentInfo({
    defaultValues,
    onNext,
    isProcessing,
}: Step1Props) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [fileName, setFileName] = useState<string>(
        defaultValues?.transcript?.name ?? ''
    )

    const form = useForm<Step1Data>({
        resolver: zodResolver(step1Schema),
        defaultValues: {
            studentId: defaultValues?.studentId ?? '',
            email: defaultValues?.email ?? '',
            firstName: defaultValues?.firstName ?? '',
            lastName: defaultValues?.lastName ?? '',
            phoneNumber: defaultValues?.phoneNumber ?? '',
            transcript: defaultValues?.transcript ?? undefined,
        },
    })

    function onSubmit(data: Step1Data) {
        onNext(data)
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Row 1: Student ID & Email */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="studentId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Student ID</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="e.g. 816012345"
                                        maxLength={9}
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Student Email</FormLabel>
                                <FormControl>
                                    <Input
                                        type="email"
                                        placeholder="name@my.uwi.edu"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* Row 2: First Name & Last Name */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                {/* Row 3: Phone Number */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="phoneNumber"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Phone Number</FormLabel>
                                <FormControl>
                                    <PhoneNumberInput
                                        value={field.value}
                                        onChange={field.onChange}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* Row 4: Transcript Upload */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="transcript"
                        render={({ field: { onChange } }) => (
                            <FormItem>
                                <FormLabel>Student Transcript</FormLabel>
                                <FormControl>
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 flex items-center gap-2 h-9 rounded-md border border-input bg-transparent px-3 text-sm text-muted-foreground overflow-hidden">
                                            {fileName ? (
                                                <>
                                                    <FileText className="size-4 shrink-0 text-primary" />
                                                    <span className="truncate text-foreground">
                                                        {fileName}
                                                    </span>
                                                </>
                                            ) : (
                                                <span>No file selected</span>
                                            )}
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="shrink-0"
                                        >
                                            <Upload className="size-4 mr-1" />
                                            Upload
                                        </Button>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".pdf"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0]
                                                if (file) {
                                                    setFileName(file.name)
                                                    onChange(file)
                                                }
                                            }}
                                        />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* Continue button */}
                <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={isProcessing} size="lg">
                        {isProcessing ? (
                            <>
                                <Loader2 className="size-4 animate-spin" />
                                Processing Transcript…
                            </>
                        ) : (
                            <>
                                Continue
                                <ArrowRight className="size-4" />
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </Form>
    )
}
