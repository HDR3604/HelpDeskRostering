import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import {
    Card,
    CardContent,
    CardHeader,
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
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Badge } from '@/components/ui/badge'
import type { SchedulerConfig } from '@/types/scheduler-config'
import { useUser } from '@/lib/auth/hooks/use-user'
import { usePasswordReset } from '@/lib/auth/use-password-reset'
import { useUpdateMyProfile } from '@/lib/queries/users'
import {
    useSchedulerConfigs,
    useCreateSchedulerConfig,
    useDeleteSchedulerConfig,
    useSetDefaultSchedulerConfig,
} from '@/lib/queries/scheduler-configs'
import { Trash2, Pencil, LockOpen, Loader2 } from 'lucide-react'
import { useLocation } from '@tanstack/react-router'

// ---------------------------------------------------------------------------
// Sub-components (matching student-settings patterns)
// ---------------------------------------------------------------------------

function SettingsRow({
    label,
    children,
}: {
    label: string
    children: React.ReactNode
}) {
    return (
        <div className="flex flex-col gap-1.5 py-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="shrink-0 sm:w-40">
                <p className="text-sm font-medium">{label}</p>
            </div>
            <div className="flex flex-1 items-start">{children}</div>
        </div>
    )
}

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

function InlineForm({
    onSubmit,
    onCancel,
    isPending,
    children,
}: {
    onSubmit: () => void
    onCancel: () => void
    isPending?: boolean
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
                <Button
                    type="submit"
                    size="sm"
                    variant="outline"
                    disabled={isPending}
                >
                    {isPending ? 'Saving…' : 'Save'}
                </Button>
            </div>
        </form>
    )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AdminSettings() {
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
    const updateProfile = useUpdateMyProfile()

    const { pathname } = useLocation()
    const activeTab = pathname.includes('scheduler') ? 'scheduler' : 'profile'

    // Display values from JWT (updated via forceRefreshToken after mutation)
    const firstName = userFirstName ?? ''
    const lastName = userLastName ?? ''
    const email = userEmail ?? ''

    // Profile editing state
    const [editingName, setEditingName] = useState(false)
    const [editingEmail, setEditingEmail] = useState(false)
    const [draftFirstName, setDraftFirstName] = useState('')
    const [draftLastName, setDraftLastName] = useState('')
    const [draftEmail, setDraftEmail] = useState('')

    // Password dialog
    const [showPasswordDialog, setShowPasswordDialog] = useState(false)

    // Escape key to close any open editor
    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                setEditingName(false)
                setEditingEmail(false)
            }
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [])

    // Scheduler configuration
    const { data: configs = [], isLoading: configsLoading } =
        useSchedulerConfigs()
    const createConfig = useCreateSchedulerConfig()
    const deleteConfig = useDeleteSchedulerConfig()
    const setDefault = useSetDefaultSchedulerConfig()

    const [showForm, setShowForm] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<SchedulerConfig | null>(
        null,
    )
    const [newConfig, setNewConfig] = useState({
        name: '',
        baseline_hours_target: 0,
        understaffed_penalty: 0.0,
        solver_time_limit: null as number | null,
        allow_minimum_violation: false,
    })

    // Handlers
    function handleSaveName() {
        if (draftFirstName === '' || draftLastName === '') {
            toast.error('Name cannot be empty.')
            return
        }
        updateProfile.mutate(
            {
                first_name: draftFirstName,
                last_name: draftLastName,
            },
            { onSuccess: () => setEditingName(false) },
        )
    }

    function handleSaveEmail() {
        if (!draftEmail.includes('@')) {
            toast.error('Please enter a valid email.')
            return
        }
        updateProfile.mutate(
            { email: draftEmail },
            { onSuccess: () => setEditingEmail(false) },
        )
    }

    function handleSetDefault(config: SchedulerConfig) {
        setDefault.mutate(config.id)
    }

    function handleCreate() {
        if (newConfig.name === '') {
            toast.error('Please enter a name for the configuration.')
            return
        }
        createConfig.mutate(
            {
                name: newConfig.name,
                baseline_hours_target: newConfig.baseline_hours_target,
                understaffed_penalty: newConfig.understaffed_penalty,
                solver_time_limit: newConfig.solver_time_limit,
                course_shortfall_penalty: 1.0,
                min_hours_penalty: 1.0,
                max_hours_penalty: 1.0,
                extra_hours_penalty: 1.0,
                max_extra_penalty: 1.5,
                solver_gap: null,
                log_solver_output: false,
            },
            {
                onSuccess: () => {
                    setNewConfig({
                        name: '',
                        baseline_hours_target: 0,
                        understaffed_penalty: 0.0,
                        solver_time_limit: null,
                        allow_minimum_violation: false,
                    })
                    setShowForm(false)
                },
            },
        )
    }

    function handleDelete(config: SchedulerConfig) {
        deleteConfig.mutate(config.id)
    }

    return (
        <div className="max-w-5xl space-y-6">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
                <Card>
                    <CardContent>
                        {/* Name */}
                        <SettingsRow label="Name">
                            {editingName ? (
                                <InlineForm
                                    onSubmit={handleSaveName}
                                    onCancel={() => setEditingName(false)}
                                    isPending={updateProfile.isPending}
                                >
                                    <div className="flex flex-1 gap-3">
                                        <div className="flex-1 space-y-1.5">
                                            <Label className="text-xs text-muted-foreground">
                                                First name
                                            </Label>
                                            <Input
                                                value={draftFirstName}
                                                onChange={(e) =>
                                                    setDraftFirstName(
                                                        e.target.value,
                                                    )
                                                }
                                                autoFocus
                                            />
                                        </div>
                                        <div className="flex-1 space-y-1.5">
                                            <Label className="text-xs text-muted-foreground">
                                                Last name
                                            </Label>
                                            <Input
                                                value={draftLastName}
                                                onChange={(e) =>
                                                    setDraftLastName(
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </div>
                                    </div>
                                </InlineForm>
                            ) : (
                                <EditableValue
                                    display={`${firstName} ${lastName}`.trim()}
                                    onEdit={() => {
                                        setDraftFirstName(firstName)
                                        setDraftLastName(lastName)
                                        setEditingName(true)
                                    }}
                                />
                            )}
                        </SettingsRow>
                        <Separator />

                        {/* Email */}
                        <SettingsRow label="Email address">
                            {editingEmail ? (
                                <InlineForm
                                    onSubmit={handleSaveEmail}
                                    onCancel={() => setEditingEmail(false)}
                                    isPending={updateProfile.isPending}
                                >
                                    <Input
                                        type="email"
                                        value={draftEmail}
                                        onChange={(e) =>
                                            setDraftEmail(e.target.value)
                                        }
                                        autoFocus
                                    />
                                </InlineForm>
                            ) : (
                                <EditableValue
                                    display={email}
                                    onEdit={() => {
                                        setDraftEmail(email)
                                        setEditingEmail(true)
                                    }}
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
                    </CardContent>
                </Card>
            )}

            {/* Scheduler Tab */}
            {activeTab === 'scheduler' && (
                <Card>
                    <CardHeader>
                        <CardDescription>
                            Manage solver configurations used during schedule
                            generation. Set one as the default to use it
                            automatically.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-0">
                        {configsLoading ? (
                            <div className="flex items-center justify-center py-8 text-muted-foreground">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Loading configurations…
                            </div>
                        ) : (
                            <>
                                {configs.map((config, i) => (
                                    <div key={config.id}>
                                        <div className="flex items-center justify-between py-4">
                                            <div className="w-40 shrink-0">
                                                <p className="text-sm font-medium">
                                                    {config.name}
                                                </p>
                                            </div>
                                            <div className="flex flex-1 items-center justify-between">
                                                <p className="text-sm text-muted-foreground">
                                                    Baseline{' '}
                                                    {
                                                        config.baseline_hours_target
                                                    }
                                                    h · Understaffed{' '}
                                                    {
                                                        config.understaffed_penalty
                                                    }
                                                    {config.solver_time_limit
                                                        ? ` · ${config.solver_time_limit}s limit`
                                                        : ''}
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    {config.is_default ? (
                                                        <Badge className="bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/15">
                                                            Default
                                                        </Badge>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() =>
                                                                handleSetDefault(
                                                                    config,
                                                                )
                                                            }
                                                        >
                                                            Set Default
                                                        </Button>
                                                    )}
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                        onClick={() =>
                                                            setDeleteTarget(
                                                                config,
                                                            )
                                                        }
                                                        disabled={
                                                            config.is_default
                                                        }
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                        {i < configs.length - 1 && (
                                            <Separator />
                                        )}
                                    </div>
                                ))}
                                <Separator />

                                <div className="flex justify-end pt-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowForm(true)}
                                    >
                                        New Configuration
                                    </Button>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Password Dialog */}
            <Dialog
                open={showPasswordDialog}
                onOpenChange={setShowPasswordDialog}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reset Password</DialogTitle>
                        <DialogDescription>
                            We'll send a password reset link to{' '}
                            <span className="font-medium text-foreground">
                                {email}
                            </span>
                            .
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowPasswordDialog(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => {
                                sendResetEmail(email)
                            }}
                            disabled={resetLoading || resendTimer > 0}
                        >
                            <LockOpen className="h-3.5 w-3.5" />
                            {resendTimer > 0
                                ? `Resend in ${resendTimer}s`
                                : 'Send reset link'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* New Config Dialog */}
            <Dialog
                open={showForm}
                onOpenChange={(open) => {
                    if (!open) {
                        setNewConfig({
                            name: '',
                            baseline_hours_target: 0,
                            understaffed_penalty: 0.0,
                            solver_time_limit: null,
                            allow_minimum_violation: false,
                        })
                    }
                    setShowForm(open)
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>New Configuration</DialogTitle>
                        <DialogDescription>
                            Create a new solver configuration for schedule
                            generation.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">
                                Configuration Name
                            </Label>
                            <Input
                                value={newConfig.name}
                                onChange={(e) =>
                                    setNewConfig((prev) => ({
                                        ...prev,
                                        name: e.target.value,
                                    }))
                                }
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">
                                    Baseline Hours Target
                                </Label>
                                <Input
                                    type="number"
                                    value={newConfig.baseline_hours_target}
                                    onChange={(e) =>
                                        setNewConfig((prev) => ({
                                            ...prev,
                                            baseline_hours_target: Number(
                                                e.target.value,
                                            ),
                                        }))
                                    }
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">
                                    Understaffed Penalty
                                </Label>
                                <Input
                                    type="number"
                                    value={newConfig.understaffed_penalty}
                                    onChange={(e) =>
                                        setNewConfig((prev) => ({
                                            ...prev,
                                            understaffed_penalty: Number(
                                                e.target.value,
                                            ),
                                        }))
                                    }
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">
                                    Solver Time Limit (seconds)
                                </Label>
                                <Input
                                    type="number"
                                    placeholder="No limit"
                                    value={newConfig.solver_time_limit ?? ''}
                                    onChange={(e) =>
                                        setNewConfig((prev) => ({
                                            ...prev,
                                            solver_time_limit:
                                                e.target.value === ''
                                                    ? null
                                                    : Number(e.target.value),
                                        }))
                                    }
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-3 rounded-lg border p-3">
                            <Checkbox
                                checked={newConfig.allow_minimum_violation}
                                onCheckedChange={(checked) =>
                                    setNewConfig((prev) => ({
                                        ...prev,
                                        allow_minimum_violation:
                                            checked === true,
                                    }))
                                }
                            />
                            <div>
                                <p className="text-sm font-medium">
                                    Allow Minimum Violation
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Allow the solver to violate minimum hour
                                    constraints
                                </p>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowForm(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleCreate}
                            disabled={createConfig.isPending}
                        >
                            {createConfig.isPending ? 'Creating…' : 'Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                open={deleteTarget !== null}
                onOpenChange={(open) => {
                    if (!open) setDeleteTarget(null)
                }}
                title="Delete Configuration"
                description={
                    <>
                        Are you sure you want to delete{' '}
                        <span className="font-medium text-foreground">
                            {deleteTarget?.name}
                        </span>
                        ? This cannot be undone.
                    </>
                }
                confirmLabel="Delete"
                onConfirm={() => {
                    if (deleteTarget) handleDelete(deleteTarget)
                    setDeleteTarget(null)
                }}
                destructive
            />
        </div>
    )
}
