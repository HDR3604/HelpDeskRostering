import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { contactSchema, type ContactData } from '@/features/sign-up/lib/sign-up-schemas'
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { PhoneNumberInput } from './phone-input'
import { ArrowLeft, ArrowRight, Mail, Info } from 'lucide-react'

interface StepContactInfoProps {
    defaultValues?: Partial<ContactData>
    onNext: (data: ContactData) => void
    onBack: () => void
}

export function StepContactInfo({ defaultValues, onNext, onBack }: StepContactInfoProps) {
    const form = useForm<ContactData>({
        resolver: zodResolver(contactSchema),
        defaultValues: {
            email: defaultValues?.email ?? '',
            phoneNumber: defaultValues?.phoneNumber ?? '',
        },
    })

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onNext)} className="space-y-8">
                {/* Info banner */}
                <div className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50/50 px-4 py-3 dark:border-blue-900/50 dark:bg-blue-950/20">
                    <Info className="mt-0.5 size-4 shrink-0 text-blue-600 dark:text-blue-400" />
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                        This information can&apos;t be extracted from your transcript. We&apos;ll use it to send you shift notifications and updates.
                    </p>
                </div>

                {/* Email */}
                <section className="space-y-4 rounded-lg border bg-card p-5">
                    <h3 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wide">
                        Email Address
                    </h3>
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Student Email</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            type="email"
                                            placeholder="name@my.uwi.edu"
                                            className="pl-9"
                                            {...field}
                                        />
                                    </div>
                                </FormControl>
                                <FormDescription>
                                    Must be your UWI student email ending in @my.uwi.edu
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </section>

                {/* Phone */}
                <section className="space-y-4 rounded-lg border bg-card p-5">
                    <h3 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wide">
                        Phone Number
                    </h3>
                    <FormField
                        control={form.control}
                        name="phoneNumber"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Mobile Number</FormLabel>
                                <FormControl>
                                    <PhoneNumberInput
                                        value={field.value}
                                        onChange={field.onChange}
                                    />
                                </FormControl>
                                <FormDescription>
                                    Include your country code. Used for urgent shift changes only.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
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
