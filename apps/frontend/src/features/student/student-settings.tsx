import * as React from 'react'
import { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Upload,
    FileText,
    LockOpen,
    Pencil,
    Check,
    X,
    Loader2,
} from 'lucide-react'
import { useLocation } from '@tanstack/react-router'
import { useUser } from '@/lib/auth/hooks/use-user'
import { apiClient } from '@/lib/api-client'
import { useMyStudentProfile } from '@/lib/queries/students'
import {
    useUpdateMyStudentProfile,
    useMyBankingDetails,
    useUpsertMyBankingDetails,
} from '@/lib/queries/students'
import { usePasswordReset } from '@/lib/auth/use-password-reset'
import { StepAvailability } from '@/features/sign-up/components/step-availability'
import { PhoneNumberInput } from '@/features/sign-up/components/phone-input'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TT_BANKS = [
    'Republic Bank Ltd.',
    'Scotiabank (T&T) Ltd.',
    'First Citizens Bank',
    'RBC Royal Bank (T&T) Ltd.',
    'JMMB Bank (T&T) Ltd.',
    'ANSA Bank Limited',
    'Central Bank',
    'First Caribbean International Bank',
    'Citibank Trinidad Ltd.',
]

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** A row in a settings card — label on the left, value/form on the right. */
function SettingsRow({
    label,
    description,
    children,
}: {
    label: string
    description?: string
    children: React.ReactNode
}) {
    return (
        <div className="flex flex-col gap-1.5 py-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="shrink-0 sm:w-40">
                <p className="text-sm font-medium">{label}</p>
                {description && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        {description}
                    </p>
                )}
            </div>
            <div className="flex flex-1 items-start">{children}</div>
        </div>
    )
}

/** A read-only value that becomes editable on click (pencil icon on hover). */
function EditableValue({
    display,
    onEdit,
}: {
    display: string
    onEdit: () => void
}) {
    return (
        <button
            type="button"
            className="group flex flex-1 items-center justify-start text-left rounded-md px-2 py-1.5 -mx-2 hover:bg-muted/60 transition-colors"
            onClick={onEdit}
        >
            <span className="pr-2 text-sm text-foreground">
                {display || (
                    <span className="text-muted-foreground">{'\u2014'}</span>
                )}
            </span>
            <Pencil className="h-3 w-3 shrink-0 text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100" />
        </button>
    )
}

/** A read-only value that is not editable. */
function ReadOnlyValue({ children }: { children: React.ReactNode }) {
    return (
        <p className="px-2 py-1.5 -mx-2 text-sm text-muted-foreground">
            {children}
        </p>
    )
}

/** Wraps editable fields in a `<form>` with Save/Cancel — for critical fields. */
function InlineForm({
    onSubmit,
    onCancel,
    children,
}: {
    onSubmit: () => void
    onCancel: () => void
    children: React.ReactNode
}) {
    return (
        <form
            className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-end"
            onSubmit={(e) => {
                e.preventDefault()
                onSubmit()
            }}
        >
            <div className="flex-1">{children}</div>
            <div className="flex gap-2 shrink-0 pb-0.5">
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={onCancel}
                >
                    Cancel
                </Button>
                <Button type="submit" size="sm" variant="outline">
                    Save
                </Button>
            </div>
        </form>
    )
}

/** Auto-save input — debounces changes and saves only if validation passes. */
function AutoSaveInput({
    value,
    onSave,
    validate,
    placeholder,
    type = 'text',
    ...props
}: {
    value: string
    onSave: (value: string) => void
    validate?: (value: string) => boolean
    placeholder?: string
    type?: string
} & Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange' | 'onSave'>) {
    const [draft, setDraft] = useState(value)
    const [invalid, setInvalid] = useState(false)
    const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
    const savedRef = useRef(value)

    useEffect(() => {
        setDraft(value)
        savedRef.current = value
    }, [value])

    const debounceSave = useCallback(
        (val: string) => {
            if (timerRef.current) clearTimeout(timerRef.current)
            timerRef.current = setTimeout(() => {
                const trimmed = val.trim()
                if (!trimmed || trimmed === savedRef.current) {
                    setInvalid(false)
                    return
                }
                if (validate && !validate(trimmed)) {
                    setInvalid(true)
                    return
                }
                setInvalid(false)
                savedRef.current = trimmed
                onSave(trimmed)
            }, 800)
        },
        [onSave, validate],
    )

    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current)
        }
    }, [])

    return (
        <Input
            type={type}
            value={draft}
            placeholder={placeholder}
            className={cn(
                invalid && 'border-red-500 focus-visible:ring-red-500',
            )}
            onChange={(e) => {
                setDraft(e.target.value)
                setInvalid(false)
                debounceSave(e.target.value)
            }}
            onBlur={() => {
                if (timerRef.current) clearTimeout(timerRef.current)
                const trimmed = draft.trim()
                if (!trimmed || trimmed === savedRef.current) return
                if (validate && !validate(trimmed)) {
                    setInvalid(true)
                    return
                }
                setInvalid(false)
                savedRef.current = trimmed
                onSave(trimmed)
            }}
            {...props}
        />
    )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function StudentSettings() {
    const {
        firstName: userFirstName,
        lastName: userLastName,
        email: userEmail,
    } = useUser()
    const {
        sendResetEmail,
        isLoading: resetLoading,
        resendTimer,
    } = usePasswordReset()

    const { pathname } = useLocation()
    const activeTab = pathname.includes('availability')
        ? 'availability'
        : pathname.includes('payment')
          ? 'payment'
          : 'profile'

    // -- Student profile data ------------------------------------------------

    const profileQuery = useMyStudentProfile()
    const student = profileQuery.data
    const transcript = student?.transcript_metadata

    const updateStudentProfile = useUpdateMyStudentProfile()

    const firstName = userFirstName ?? ''
    const lastName = userLastName ?? ''
    const [phone, setPhone] = useState('')
    const [savedIndicator, setSavedIndicator] = useState(false)

    // Load phone from student profile
    useEffect(() => {
        if (student?.phone_number) setPhone(student.phone_number)
    }, [student?.phone_number])

    function flashSaved() {
        setSavedIndicator(true)
        setTimeout(() => setSavedIndicator(false), 2000)
    }

    // Profile auto-save handlers (debounced)
    const handleAutoSavePhone = useCallback(
        (val: string) => {
            setPhone(val)
            updateStudentProfile.mutate(
                { phone_number: val },
                { onSuccess: () => flashSaved() },
            )
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    )

    // Click-to-edit states for profile fields
    const [editingPhone, setEditingPhone] = useState(false)

    // Escape key to close any open editor
    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                setEditingPhone(false)
                setEditingBankName(false)
                setEditingBranch(false)
                setEditingAccountType(false)
                setEditingAccountNumber(false)
            }
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [])

    // -- Availability state -------------------------------------------------

    const [availability, setAvailability] = useState<Record<string, number[]>>(
        {},
    )
    const availabilityFormRef = useRef<HTMLDivElement>(null)
    const [availabilityDirty, setAvailabilityDirty] = useState(false)
    const [availabilitySaving, setAvailabilitySaving] = useState(false)
    const [availabilitySaveStatus, setAvailabilitySaveStatus] = useState<
        'success' | 'error' | null
    >(null)

    // Load availability from student profile
    useEffect(() => {
        if (student?.availability) setAvailability(student.availability)
    }, [student?.availability])

    // -- Transcript upload --------------------------------------------------

    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [transcriptUrl, setTranscriptUrl] = useState<string | null>(null)

    // -- Payment state -------------------------------------------------------

    const bankingQuery = useMyBankingDetails()
    const upsertBanking = useUpsertMyBankingDetails()

    const [bankName, setBankName] = useState('')
    const [branchName, setBranchName] = useState('')
    const [accountType, setAccountType] = useState('')
    const [accountNumber, setAccountNumber] = useState('')

    // Sync banking details from API
    useEffect(() => {
        if (bankingQuery.data) {
            setBankName(bankingQuery.data.bank_name ?? '')
            setBranchName(bankingQuery.data.branch_name ?? '')
            setAccountType(bankingQuery.data.account_type ?? '')
            setAccountNumber(bankingQuery.data.account_number ?? '')
        }
    }, [bankingQuery.data])

    const [editingBankName, setEditingBankName] = useState(false)
    const [editingBranch, setEditingBranch] = useState(false)
    const [editingAccountType, setEditingAccountType] = useState(false)
    const [editingAccountNumber, setEditingAccountNumber] = useState(false)

    const [draftBankName, setDraftBankName] = useState('')
    const [draftBranch, setDraftBranch] = useState('')
    const [draftAccountType, setDraftAccountType] = useState('')
    const [draftAccountNumber, setDraftAccountNumber] = useState('')

    // -- Password dialog ----------------------------------------------------

    const [showPasswordDialog, setShowPasswordDialog] = useState(false)

    // -- Handlers -----------------------------------------------------------

    function handleSaveBankName() {
        if (!draftBankName) {
            toast.error('Please select a bank.')
            return
        }
        setBankName(draftBankName)
        setEditingBankName(false)
        upsertBanking.mutate({ bank_name: draftBankName })
    }

    function handleSaveBranch() {
        if (!draftBranch.trim()) {
            toast.error('Branch cannot be empty.')
            return
        }
        setBranchName(draftBranch)
        setEditingBranch(false)
        upsertBanking.mutate({ branch_name: draftBranch })
    }

    function handleSaveAccountType() {
        if (!draftAccountType) {
            toast.error('Please select an account type.')
            return
        }
        setAccountType(draftAccountType)
        setEditingAccountType(false)
        upsertBanking.mutate({ account_type: draftAccountType })
    }

    function handleSaveAccountNumber() {
        if (!draftAccountNumber.trim()) {
            toast.error('Account number cannot be empty.')
            return
        }
        setAccountNumber(draftAccountNumber)
        setEditingAccountNumber(false)
        upsertBanking.mutate({ account_number: draftAccountNumber })
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        if (file.type !== 'application/pdf') {
            toast.error('Please upload a PDF file.')
            return
        }
        setSelectedFile(file)
    }

    async function handleUpload() {
        if (!selectedFile) return
        setIsUploading(true)
        try {
            const formData = new FormData()
            formData.append('file', selectedFile)
            const { data: extracted } = await apiClient.post<{
                courses: { code: string; title: string; grade: string | null }[]
                overall_gpa: number | null
                degree_gpa: number | null
                current_year: number
                current_programme: string
                major: string
                first_name: string
                last_name: string
                student_id: string
            }>('/transcripts/extract', formData)

            await updateStudentProfile.mutateAsync({
                courses: extracted.courses,
                overall_gpa: extracted.overall_gpa,
                degree_gpa: extracted.degree_gpa,
                current_year: extracted.current_year || null,
                current_programme: extracted.current_programme || null,
                major: extracted.major || null,
                transcript_first_name: extracted.first_name || null,
                transcript_last_name: extracted.last_name || null,
                transcript_student_id: extracted.student_id || null,
            })

            setSelectedFile(null)
            toast.success('Transcript updated — courses and GPA refreshed.')
        } catch {
            toast.error('Failed to update transcript.')
        } finally {
            setIsUploading(false)
        }
    }

    const handleSaveAvailability = useCallback(() => {
        availabilityFormRef.current
            ?.querySelector<HTMLButtonElement>("button[type='submit']")
            ?.click()
    }, [])

    // Track dirty state for availability form
    useEffect(() => {
        if (activeTab !== 'availability') return
        const el = availabilityFormRef.current
        if (!el) return
        const markDirty = () => setAvailabilityDirty(true)
        el.addEventListener('change', markDirty)
        el.addEventListener('click', markDirty)
        return () => {
            el.removeEventListener('change', markDirty)
            el.removeEventListener('click', markDirty)
        }
    }, [activeTab])

    // Keyboard shortcut for availability save (Cmd+S / Ctrl+S)
    useEffect(() => {
        if (activeTab !== 'availability' || !availabilityDirty) return
        function onKeyDown(e: KeyboardEvent) {
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault()
                handleSaveAvailability()
            }
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [activeTab, availabilityDirty, handleSaveAvailability])

    // Clear save status after a delay
    useEffect(() => {
        if (!availabilitySaveStatus) return
        const id = setTimeout(() => setAvailabilitySaveStatus(null), 2500)
        return () => clearTimeout(id)
    }, [availabilitySaveStatus])

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------

    return (
        <div className="max-w-5xl space-y-6">
            {/* ============================================================= */}
            {/* Profile Tab                                                    */}
            {/* ============================================================= */}
            {activeTab === 'profile' && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Profile</CardTitle>
                                <CardDescription>
                                    Your personal information and documents.
                                </CardDescription>
                            </div>
                            {savedIndicator && (
                                <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 animate-in fade-in duration-150">
                                    <Check className="h-3.5 w-3.5" /> Saved
                                </span>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-0">
                            {/* Student ID */}
                            <SettingsRow label="Student ID">
                                <ReadOnlyValue>
                                    {student?.student_id || '\u2014'}
                                </ReadOnlyValue>
                            </SettingsRow>
                            <Separator />

                            {/* Email */}
                            <SettingsRow label="Email">
                                <ReadOnlyValue>
                                    {userEmail || '\u2014'}
                                </ReadOnlyValue>
                            </SettingsRow>
                            <Separator />

                            {/* Programme */}
                            <SettingsRow label="Programme">
                                <ReadOnlyValue>
                                    {transcript?.current_programme || '\u2014'}
                                    {transcript?.major && (
                                        <span className="text-muted-foreground/60">
                                            {' \u2014 '}
                                            {transcript.major}
                                        </span>
                                    )}
                                </ReadOnlyValue>
                            </SettingsRow>
                            <Separator />

                            {/* Name — read-only for students */}
                            <SettingsRow label="Name">
                                <p className="text-sm text-muted-foreground">
                                    {`${firstName} ${lastName}`.trim() || '—'}
                                </p>
                            </SettingsRow>
                            <Separator />

                            {/* Phone — click to edit, auto-saves */}
                            <SettingsRow label="Phone number">
                                {editingPhone ? (
                                    <div className="flex-1">
                                        <PhoneNumberInput
                                            value={phone}
                                            onChange={(val) => {
                                                const v = val ?? ''
                                                setPhone(v)
                                                if (v.length >= 7) {
                                                    handleAutoSavePhone(v)
                                                }
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <EditableValue
                                        display={phone}
                                        onEdit={() => setEditingPhone(true)}
                                    />
                                )}
                            </SettingsRow>
                            <Separator />

                            {/* Password */}
                            <SettingsRow label="Password">
                                <EditableValue
                                    display="••••••••••"
                                    onEdit={() => setShowPasswordDialog(true)}
                                />
                            </SettingsRow>
                            <Separator />

                            {/* Transcript */}
                            <SettingsRow
                                label="Transcript"
                                description="PDF only"
                            >
                                <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        {selectedFile ? (
                                            <>
                                                <FileText className="h-4 w-4" />
                                                <span className="truncate max-w-48">
                                                    {selectedFile.name}
                                                </span>
                                                <span className="text-xs">
                                                    (
                                                    {(
                                                        selectedFile.size / 1024
                                                    ).toFixed(1)}{' '}
                                                    KB)
                                                </span>
                                            </>
                                        ) : transcriptUrl ? (
                                            <a
                                                href={transcriptUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1.5 text-primary hover:underline underline-offset-4"
                                            >
                                                <FileText className="h-4 w-4" />
                                                View uploaded transcript
                                            </a>
                                        ) : (
                                            <span>No file uploaded</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {selectedFile && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={handleUpload}
                                                disabled={isUploading}
                                            >
                                                {isUploading
                                                    ? 'Uploading...'
                                                    : 'Upload'}
                                            </Button>
                                        )}
                                        <label>
                                            <input
                                                type="file"
                                                accept=".pdf"
                                                className="hidden"
                                                onChange={handleFileChange}
                                            />
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                asChild
                                            >
                                                <span className="flex items-center gap-1.5">
                                                    <Upload className="h-3.5 w-3.5" />
                                                    {transcriptUrl
                                                        ? 'Replace'
                                                        : 'Browse'}
                                                </span>
                                            </Button>
                                        </label>
                                    </div>
                                </div>
                            </SettingsRow>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Transcript details — only on profile tab if data exists */}
            {activeTab === 'profile' &&
                transcript &&
                transcript.courses.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Transcript</CardTitle>
                            <CardDescription>
                                Academic information from your uploaded
                                transcript.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-0">
                                <SettingsRow label="GPA">
                                    <div className="flex gap-4 text-sm">
                                        <span>
                                            Overall:{' '}
                                            <span className="font-medium">
                                                {transcript.overall_gpa?.toFixed(
                                                    2,
                                                ) ?? '-'}
                                            </span>
                                        </span>
                                        <span>
                                            Degree:{' '}
                                            <span className="font-medium">
                                                {transcript.degree_gpa?.toFixed(
                                                    2,
                                                ) ?? '-'}
                                            </span>
                                        </span>
                                    </div>
                                </SettingsRow>
                                <Separator />
                                <SettingsRow label="Year / Term">
                                    <p className="text-sm text-muted-foreground">
                                        Year {transcript.current_year}
                                        {transcript.current_term &&
                                            `, ${transcript.current_term}`}
                                    </p>
                                </SettingsRow>
                                <Separator />
                                <SettingsRow label="Courses">
                                    <div className="flex-1 space-y-1">
                                        {transcript.courses.map((c) => (
                                            <div
                                                key={c.code}
                                                className="flex items-center justify-between text-sm"
                                            >
                                                <span className="text-muted-foreground">
                                                    <span className="font-mono text-xs">
                                                        {c.code}
                                                    </span>{' '}
                                                    {c.title}
                                                </span>
                                                <span className="shrink-0 font-medium">
                                                    {c.grade || '-'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </SettingsRow>
                            </div>
                        </CardContent>
                    </Card>
                )}

            {/* ============================================================= */}
            {/* Availability Tab                                               */}
            {/* ============================================================= */}
            {activeTab === 'availability' && (
                <Card>
                    <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <CardTitle>Availability</CardTitle>
                                <CardDescription className="mt-2">
                                    Set the hours you are available to work each
                                    week.
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                {availabilitySaveStatus && (
                                    <span
                                        className={cn(
                                            'flex items-center gap-1 text-xs font-medium animate-in fade-in duration-150',
                                            availabilitySaveStatus ===
                                                'success' &&
                                                'text-emerald-600 dark:text-emerald-400',
                                            availabilitySaveStatus ===
                                                'error' &&
                                                'text-red-600 dark:text-red-400',
                                        )}
                                    >
                                        {availabilitySaveStatus ===
                                        'success' ? (
                                            <>
                                                <Check className="h-3.5 w-3.5" />{' '}
                                                Saved
                                            </>
                                        ) : (
                                            <>
                                                <X className="h-3.5 w-3.5" />{' '}
                                                Failed
                                            </>
                                        )}
                                    </span>
                                )}
                                {availabilityDirty && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={availabilitySaving}
                                        className="h-8 gap-2 pl-3 pr-2.5"
                                        onClick={handleSaveAvailability}
                                    >
                                        {availabilitySaving ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <Check className="h-3.5 w-3.5" />
                                        )}
                                        Save
                                        <kbd className="pointer-events-none select-none rounded border bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground/60">
                                            ⌘S
                                        </kbd>
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div
                            ref={availabilityFormRef}
                            className="[&_form>button[type='button']]:hidden [&_form>button[type='submit']]:hidden"
                        >
                            <StepAvailability
                                defaultValues={availability}
                                onNext={(updated) => {
                                    setAvailabilitySaving(true)
                                    updateStudentProfile.mutate(
                                        { availability: updated },
                                        {
                                            onSuccess: () => {
                                                setAvailability(updated)
                                                setAvailabilitySaving(false)
                                                setAvailabilityDirty(false)
                                                setAvailabilitySaveStatus(
                                                    'success',
                                                )
                                            },
                                            onError: () => {
                                                setAvailabilitySaving(false)
                                                setAvailabilitySaveStatus(
                                                    'error',
                                                )
                                            },
                                        },
                                    )
                                }}
                                onBack={() => {}}
                            />
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ============================================================= */}
            {/* Payment Tab                                                    */}
            {/* ============================================================= */}
            {activeTab === 'payment' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Payment</CardTitle>
                        <CardDescription>
                            Your bank account details for receiving payment.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-0">
                            {/* Bank */}
                            <SettingsRow label="Bank">
                                {editingBankName ? (
                                    <InlineForm
                                        onSubmit={handleSaveBankName}
                                        onCancel={() =>
                                            setEditingBankName(false)
                                        }
                                    >
                                        <div className="flex-1 space-y-1.5">
                                            <Select
                                                value={draftBankName}
                                                onValueChange={setDraftBankName}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select bank..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {TT_BANKS.map((b) => (
                                                        <SelectItem
                                                            key={b}
                                                            value={b}
                                                        >
                                                            {b}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </InlineForm>
                                ) : (
                                    <EditableValue
                                        display={bankName}
                                        onEdit={() => {
                                            setDraftBankName(bankName)
                                            setEditingBankName(true)
                                        }}
                                    />
                                )}
                            </SettingsRow>
                            <Separator />

                            {/* Branch */}
                            <SettingsRow label="Branch">
                                {editingBranch ? (
                                    <InlineForm
                                        onSubmit={handleSaveBranch}
                                        onCancel={() => setEditingBranch(false)}
                                    >
                                        <div className="flex-1 space-y-1.5">
                                            <Input
                                                placeholder="e.g. St. Augustine"
                                                value={draftBranch}
                                                onChange={(e) =>
                                                    setDraftBranch(
                                                        e.target.value,
                                                    )
                                                }
                                                autoFocus
                                            />
                                        </div>
                                    </InlineForm>
                                ) : (
                                    <EditableValue
                                        display={branchName}
                                        onEdit={() => {
                                            setDraftBranch(branchName)
                                            setEditingBranch(true)
                                        }}
                                    />
                                )}
                            </SettingsRow>
                            <Separator />

                            {/* Account type */}
                            <SettingsRow label="Account type">
                                {editingAccountType ? (
                                    <InlineForm
                                        onSubmit={handleSaveAccountType}
                                        onCancel={() =>
                                            setEditingAccountType(false)
                                        }
                                    >
                                        <div className="flex-1 space-y-1.5">
                                            <Select
                                                value={draftAccountType}
                                                onValueChange={
                                                    setDraftAccountType
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select type..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="chequeing">
                                                        Chequing
                                                    </SelectItem>
                                                    <SelectItem value="savings">
                                                        Savings
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </InlineForm>
                                ) : (
                                    <EditableValue
                                        display={accountType}
                                        onEdit={() => {
                                            setDraftAccountType(accountType)
                                            setEditingAccountType(true)
                                        }}
                                    />
                                )}
                            </SettingsRow>
                            <Separator />

                            {/* Account number */}
                            <SettingsRow label="Account number">
                                {editingAccountNumber ? (
                                    <InlineForm
                                        onSubmit={handleSaveAccountNumber}
                                        onCancel={() =>
                                            setEditingAccountNumber(false)
                                        }
                                    >
                                        <div className="flex-1 space-y-1.5">
                                            <Input
                                                value={draftAccountNumber}
                                                onChange={(e) =>
                                                    setDraftAccountNumber(
                                                        e.target.value.replace(
                                                            /\D/g,
                                                            '',
                                                        ),
                                                    )
                                                }
                                                placeholder={
                                                    accountNumber
                                                        ? `Previous: ••••${accountNumber.slice(-4)}`
                                                        : '7–16 digit account number'
                                                }
                                                inputMode="numeric"
                                                maxLength={16}
                                                autoFocus
                                            />
                                        </div>
                                    </InlineForm>
                                ) : (
                                    <EditableValue
                                        display={
                                            accountNumber
                                                ? `${'•'.repeat(Math.max(0, accountNumber.length - 4))}${accountNumber.slice(-4)}`
                                                : ''
                                        }
                                        onEdit={() => {
                                            setDraftAccountNumber('')
                                            setEditingAccountNumber(true)
                                        }}
                                    />
                                )}
                            </SettingsRow>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ============================================================= */}
            {/* Password Reset Dialog                                          */}
            {/* ============================================================= */}
            <Dialog
                open={showPasswordDialog}
                onOpenChange={setShowPasswordDialog}
            >
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader className="space-y-2">
                        <DialogTitle className="flex items-center gap-2">
                            <LockOpen className="h-4 w-4" />
                            Reset Password
                        </DialogTitle>
                        <DialogDescription>
                            We'll send a password reset link to{' '}
                            <span className="font-medium text-foreground">
                                {userEmail}
                            </span>
                            .
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4 gap-2 sm:gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowPasswordDialog(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => sendResetEmail(userEmail ?? '')}
                            disabled={resetLoading || resendTimer > 0}
                        >
                            {resetLoading && (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            )}
                            {resendTimer > 0
                                ? `Resend in ${resendTimer}s`
                                : 'Send reset link'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
