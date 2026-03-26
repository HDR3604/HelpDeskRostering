import { useState } from 'react'
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

    // Profile editing state
    const [editingName, setEditingName] = useState(false)
    const [editingEmail, setEditingEmail] = useState(false)
    const [draftFirstName, setDraftFirstName] = useState('')
    const [draftLastName, setDraftLastName] = useState('')
    const [draftEmail, setDraftEmail] = useState('')

    // Password dialog
    const [showPasswordDialog, setShowPasswordDialog] = useState(false)

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

    // Display values from JWT (updated via forceRefreshToken after mutation)
    const firstName = userFirstName ?? ''
    const lastName = userLastName ?? ''
    const email = userEmail ?? ''

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
                        <div className="flex items-start py-4">
                            <div className="w-40 shrink-0 pt-1">
                                <p className="text-sm font-medium">Name</p>
                            </div>
                            {editingName ? (
                                <div className="flex flex-1 items-end gap-3">
                                    <div className="flex flex-1 gap-3">
                                        <div className="flex-1 space-y-1.5">
                                            <Label className="text-xs text-muted-foreground">
                                                First Name
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
                                                Last Name
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
                                    <div className="flex gap-2 pb-0.5">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() =>
                                                setEditingName(false)
                                            }
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={handleSaveName}
                                            disabled={updateProfile.isPending}
                                        >
                                            {updateProfile.isPending
                                                ? 'Saving…'
                                                : 'Save'}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    className="group flex flex-1 items-center gap-2 text-left rounded-md px-2 py-1 -mx-2 text-sm text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                                    onClick={() => {
                                        setDraftFirstName(firstName)
                                        setDraftLastName(lastName)
                                        setEditingName(true)
                                    }}
                                >
                                    {`${firstName} ${lastName}`.trim() || '-'}
                                    <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                            )}
                        </div>
                        <Separator />

                        {/* Email */}
                        <div className="flex items-start py-4">
                            <div className="w-40 shrink-0 pt-1">
                                <p className="text-sm font-medium">
                                    Email address
                                </p>
                            </div>
                            {editingEmail ? (
                                <div className="flex flex-1 items-end gap-3">
                                    <div className="flex-1 space-y-1.5">
                                        <Input
                                            type="email"
                                            value={draftEmail}
                                            onChange={(e) =>
                                                setDraftEmail(e.target.value)
                                            }
                                            autoFocus
                                        />
                                    </div>
                                    <div className="flex gap-2 pb-0.5">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() =>
                                                setEditingEmail(false)
                                            }
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={handleSaveEmail}
                                            disabled={updateProfile.isPending}
                                        >
                                            {updateProfile.isPending
                                                ? 'Saving…'
                                                : 'Save'}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    className="group flex flex-1 items-center gap-2 text-left rounded-md px-2 py-1 -mx-2 text-sm text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                                    onClick={() => {
                                        setDraftEmail(email)
                                        setEditingEmail(true)
                                    }}
                                >
                                    {email || '-'}
                                    <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                            )}
                        </div>
                        <Separator />

                        {/* Password */}
                        <div className="flex items-start py-4">
                            <div className="w-40 shrink-0 pt-1">
                                <p className="text-sm font-medium">Password</p>
                            </div>
                            <button
                                className="group flex flex-1 items-center gap-2 text-left rounded-md px-2 py-1 -mx-2 text-sm text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                                onClick={() => setShowPasswordDialog(true)}
                            >
                                ••••••••••
                                <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                        </div>
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
