import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
    AlertCircle,
    Check,
    ChevronsUpDown,
    Eye,
    EyeOff,
    Loader2,
    ShieldCheck,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'

const TT_BANKS = [
    'Bank of Baroda (Trinidad and Tobago) Limited',
    'Citibank (Trinidad and Tobago) Limited',
    'First Citizens Bank Limited',
    'FirstCaribbean International Bank (Trinidad and Tobago) Limited',
    'Intercommercial Bank Limited',
    'RBC Royal Bank (Trinidad and Tobago) Limited',
    'Republic Bank Limited',
    'Scotiabank Trinidad and Tobago Limited',
] as const

const bankingDetailsSchema = z
    .object({
        bankName: z.string().min(1, 'Please select a bank'),
        branchName: z
            .string()
            .min(1, 'Branch name is required')
            .max(100, 'Branch name is too long'),
        accountType: z.enum(['chequing', 'savings'], {
            required_error: 'Please select an account type',
        }),
        accountNumber: z
            .string()
            .min(1, 'Account number is required')
            .regex(/^\d+$/, 'Account number must contain only digits')
            .min(7, 'Account number must be at least 7 digits')
            .max(16, 'Account number must be at most 16 digits'),
        confirmAccountNumber: z
            .string()
            .min(1, 'Please confirm your account number'),
    })
    .refine((data) => data.accountNumber === data.confirmAccountNumber, {
        message: 'Account numbers do not match',
        path: ['confirmAccountNumber'],
    })

type BankingDetailsValues = z.infer<typeof bankingDetailsSchema>

export type { BankingDetailsValues }

interface ConsentData {
    version: string
    text: string
}

interface BankingDetailsFormProps {
    onSubmit?: (values: BankingDetailsValues) => void | Promise<void>
    isSubmitting?: boolean
    submitLabel?: string
    embedded?: boolean
    /** Pre-fetched consent data. If not provided, a placeholder is shown. */
    consent?: ConsentData
    /** Whether the consent text is still loading */
    consentLoading?: boolean
    /** Error message if consent text failed to load */
    consentError?: string
    /** If true, form is read-only (already submitted) */
    savedAccountNumber?: string
    savedDetails?: Omit<BankingDetailsValues, 'confirmAccountNumber'>
}

export function BankingDetailsForm({
    onSubmit: externalOnSubmit,
    isSubmitting,
    submitLabel,
    embedded,
    consent,
    consentLoading,
    consentError,
    savedAccountNumber,
    savedDetails,
}: BankingDetailsFormProps) {
    const [bankOpen, setBankOpen] = React.useState(false)
    const [showAccount, setShowAccount] = React.useState(false)
    const [showConfirmAccount, setShowConfirmAccount] = React.useState(false)
    const [consentChecked, setConsentChecked] = React.useState(false)
    const [submitted, setSubmitted] = React.useState(false)

    const isReadOnly = !!savedDetails || submitted

    const form = useForm<BankingDetailsValues>({
        resolver: zodResolver(bankingDetailsSchema),
        defaultValues: {
            bankName: savedDetails?.bankName ?? '',
            branchName: savedDetails?.branchName ?? '',
            accountType: savedDetails?.accountType ?? undefined,
            accountNumber: savedDetails?.accountNumber ?? '',
            confirmAccountNumber: '',
        },
        mode: 'onBlur',
    })

    const canSubmit =
        consentChecked && !consentLoading && !consentError && !isSubmitting

    async function onSubmit(values: BankingDetailsValues) {
        if (externalOnSubmit) {
            await externalOnSubmit(values)
        }
        setSubmitted(true)
    }

    function maskAccountNumber(num: string) {
        if (num.length <= 4) return num
        return '****' + num.slice(-4)
    }

    // Read-only state: show saved details
    if (isReadOnly) {
        const details = savedDetails ?? form.getValues()
        const maskedAccount = savedAccountNumber
            ? savedAccountNumber
            : maskAccountNumber(details.accountNumber)

        return (
            <div className="space-y-6">
                <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50/50 px-4 py-3 dark:border-green-800 dark:bg-green-950/30">
                    <ShieldCheck className="mt-0.5 size-5 shrink-0 text-green-600 dark:text-green-400" />
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-green-800 dark:text-green-200">
                            Banking details saved
                        </p>
                        <p className="text-sm text-green-700 dark:text-green-300">
                            Your banking information has been securely saved and
                            will be used for payroll disbursement.
                        </p>
                    </div>
                </div>

                <div className="space-y-3 rounded-lg border bg-card p-5">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                            <p className="text-sm text-muted-foreground">
                                Bank
                            </p>
                            <p className="text-sm font-medium">
                                {details.bankName}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">
                                Branch
                            </p>
                            <p className="text-sm font-medium">
                                {details.branchName}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">
                                Account Type
                            </p>
                            <p className="text-sm font-medium capitalize">
                                {details.accountType}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">
                                Account Number
                            </p>
                            <p className="text-sm font-medium font-mono">
                                {maskedAccount}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {/* Bank & Branch */}
                <section className="space-y-5">
                    <div className="space-y-1">
                        <h3 className="text-sm font-medium">
                            Bank Information
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            Select your bank and branch for payment routing.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <FormField
                            control={form.control}
                            name="bankName"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Bank</FormLabel>
                                    <Popover
                                        open={bankOpen}
                                        onOpenChange={setBankOpen}
                                    >
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={bankOpen}
                                                    className={cn(
                                                        'w-full justify-between font-normal',
                                                        !field.value &&
                                                            'text-muted-foreground',
                                                    )}
                                                >
                                                    {field.value
                                                        ? (TT_BANKS.find(
                                                              (b) =>
                                                                  b ===
                                                                  field.value,
                                                          ) ?? field.value)
                                                        : 'Select a bank...'}
                                                    <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent
                                            className="w-[--radix-popover-trigger-width] p-0"
                                            align="start"
                                        >
                                            <Command>
                                                <CommandInput placeholder="Search banks..." />
                                                <CommandList>
                                                    <CommandEmpty>
                                                        No bank found.
                                                    </CommandEmpty>
                                                    <CommandGroup>
                                                        {TT_BANKS.map(
                                                            (bank) => (
                                                                <CommandItem
                                                                    key={bank}
                                                                    value={bank}
                                                                    onSelect={() => {
                                                                        field.onChange(
                                                                            bank,
                                                                        )
                                                                        setBankOpen(
                                                                            false,
                                                                        )
                                                                    }}
                                                                >
                                                                    <Check
                                                                        className={cn(
                                                                            'mr-2 size-4',
                                                                            field.value ===
                                                                                bank
                                                                                ? 'opacity-100'
                                                                                : 'opacity-0',
                                                                        )}
                                                                    />
                                                                    {bank}
                                                                </CommandItem>
                                                            ),
                                                        )}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="branchName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Branch</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="e.g. St. Augustine"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </section>

                {/* Account Type */}
                <section className="space-y-5">
                    <FormField
                        control={form.control}
                        name="accountType"
                        render={({ field }) => (
                            <FormItem className="space-y-3">
                                <FormLabel>Account Type</FormLabel>
                                <FormControl>
                                    <RadioGroup
                                        onValueChange={field.onChange}
                                        value={field.value}
                                        className="flex gap-4"
                                    >
                                        <div className="flex items-center gap-2">
                                            <RadioGroupItem
                                                value="chequing"
                                                id="chequing"
                                            />
                                            <Label
                                                htmlFor="chequing"
                                                className="font-normal"
                                            >
                                                Chequing
                                            </Label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <RadioGroupItem
                                                value="savings"
                                                id="savings"
                                            />
                                            <Label
                                                htmlFor="savings"
                                                className="font-normal"
                                            >
                                                Savings
                                            </Label>
                                        </div>
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </section>

                {/* Account Number */}
                <section className="space-y-5">
                    <div className="space-y-1">
                        <h3 className="text-sm font-medium">Account Number</h3>
                        <p className="text-sm text-muted-foreground">
                            Enter the account number where your salary will be
                            deposited.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <FormField
                            control={form.control}
                            name="accountNumber"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Account Number</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input
                                                type={
                                                    showAccount
                                                        ? 'text'
                                                        : 'password'
                                                }
                                                placeholder="Enter account number"
                                                inputMode="numeric"
                                                className="pr-10"
                                                autoComplete="off"
                                                {...field}
                                            />
                                            <button
                                                type="button"
                                                tabIndex={-1}
                                                onClick={() =>
                                                    setShowAccount((v) => !v)
                                                }
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                aria-label={
                                                    showAccount
                                                        ? 'Hide account number'
                                                        : 'Show account number'
                                                }
                                            >
                                                {showAccount ? (
                                                    <EyeOff className="size-4" />
                                                ) : (
                                                    <Eye className="size-4" />
                                                )}
                                            </button>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="confirmAccountNumber"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        Confirm Account Number
                                    </FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input
                                                type={
                                                    showConfirmAccount
                                                        ? 'text'
                                                        : 'password'
                                                }
                                                placeholder="Re-enter account number"
                                                inputMode="numeric"
                                                className="pr-10"
                                                autoComplete="off"
                                                {...field}
                                            />
                                            <button
                                                type="button"
                                                tabIndex={-1}
                                                onClick={() =>
                                                    setShowConfirmAccount(
                                                        (v) => !v,
                                                    )
                                                }
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                aria-label={
                                                    showConfirmAccount
                                                        ? 'Hide account number'
                                                        : 'Show account number'
                                                }
                                            >
                                                {showConfirmAccount ? (
                                                    <EyeOff className="size-4" />
                                                ) : (
                                                    <Eye className="size-4" />
                                                )}
                                            </button>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </section>

                {/* Consent Card */}
                <section className="space-y-4 rounded-lg border bg-card p-5">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="size-4 text-muted-foreground" />
                        <h3 className="text-sm font-medium">
                            Data Protection Consent
                        </h3>
                    </div>

                    {consentLoading && (
                        <div className="flex items-center gap-2 py-4">
                            <Loader2 className="size-4 animate-spin text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                                Loading consent information...
                            </p>
                        </div>
                    )}

                    {consentError && (
                        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5">
                            <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                            <p className="text-sm text-destructive">
                                {consentError}
                            </p>
                        </div>
                    )}

                    {consent && !consentLoading && (
                        <>
                            <div className="max-h-48 overflow-y-auto rounded-md border bg-muted/30 px-4 py-3">
                                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                                    {consent.text}
                                </p>
                            </div>

                            <div className="flex items-start gap-3 pt-1">
                                <Checkbox
                                    id="consent"
                                    checked={consentChecked}
                                    onCheckedChange={(checked) =>
                                        setConsentChecked(checked === true)
                                    }
                                />
                                <Label
                                    htmlFor="consent"
                                    className="text-sm font-normal leading-snug"
                                >
                                    I have read and agree to the above
                                </Label>
                            </div>
                        </>
                    )}

                    {!consent && !consentLoading && !consentError && (
                        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5">
                            <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                            <p className="text-sm text-destructive">
                                Unable to load consent information. Please
                                refresh the page and try again.
                            </p>
                        </div>
                    )}
                </section>

                {/* Submit */}
                <div className="flex items-center gap-3 pt-2">
                    <div className="flex-1" />
                    <Button type="submit" disabled={!canSubmit}>
                        {isSubmitting ? (
                            <>
                                <Loader2 className="size-4 animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            <>
                                <Check className="size-4" />
                                {submitLabel ?? 'Submit'}
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </Form>
    )
}
