import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogFooter, 
    DialogDescription
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { MOCK_SCHEDULER_CONFIGS } from "@/lib/mock-data"
import type { SchedulerConfig } from "@/types/scheduler-config"
import { useUser } from '@/lib/auth/hooks/use-user'
import { usePasswordReset } from '@/lib/auth/use-password-reset'
import { Trash2, LockOpen } from 'lucide-react'
import { useLocation } from '@tanstack/react-router'

export function AdminSettings() {
  const { firstName: userFirstName, lastName: userLastName, email: userEmail } = useUser()
  const { sendResetEmail, isLoading: resetLoading, resendTimer } = usePasswordReset()

  const { pathname } = useLocation()
  const activeTab = pathname.includes("scheduler")
  ? "scheduler"
  : "profile"

  // Profile
  const [firstName, setFirstName] = useState(userFirstName ?? "")
  const [lastName, setLastName] = useState(userLastName ?? "")
  const [email, setEmail] = useState(userEmail ?? "")
  const [editingName, setEditingName] = useState(false)
  const [editingEmail, setEditingEmail] = useState(false)
  const [draftFirstName, setDraftFirstName] = useState("")
  const [draftLastName, setDraftLastName] = useState("")
  const [draftEmail, setDraftEmail] = useState("")

  // Password dialog
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  
  // Scheduler configuration
  const [configs, setConfigs] = useState<SchedulerConfig[]>(() =>
    MOCK_SCHEDULER_CONFIGS.map((c) => ({ ...c }))
  )
  const [showForm, setShowForm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<SchedulerConfig | null>(null)
  const [newConfig, setNewConfig] = useState({
      name: "",
      baseline_hours_target: 0,
      understaffed_penalty: 0.0,
      solver_time_limit: null as number | null,
      allow_minimum_violation: false,
  })

  // Handlers
  function handleSaveName() {
      if (draftFirstName === "" || draftLastName === "") {
          toast.error("Name cannot be empty.")
          return
      }
      setFirstName(draftFirstName)
      setLastName(draftLastName)
      setEditingName(false)
      toast.success("Name updated.")
      // TODO: call API here
  }

  function handleSaveEmail() {
      if (!draftEmail.includes("@")) {
          toast.error("Please enter a valid email.")
          return
      }
      setEmail(draftEmail)
      setEditingEmail(false)
      toast.success("Email updated.")
      // TODO: call API here
  }

  function handleSetDefault(config: SchedulerConfig) {
      setConfigs((prev) =>
          prev.map((c) => ({ ...c, is_default: c.id === config.id }))
      )
      toast.success(`${config.name} set as default.`)
  }

  function handleCreate() {
      if (newConfig.name === "") {
          toast.error("Please enter a name for the configuration.")
          return
      }
      const created: SchedulerConfig = {
          id: `cfg-${Date.now()}`,
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
          is_default: false,
          created_at: new Date().toISOString(),
          updated_at: null,
      }
      setConfigs((prev) => [...prev, created])
      setNewConfig({
          name: "",
          baseline_hours_target: 0,
          understaffed_penalty: 0.0,
          solver_time_limit: null,
          allow_minimum_violation: false,
      })
      setShowForm(false)
      toast.success(`${created.name} created.`)
  }

  function handleDelete(config: SchedulerConfig) {
      if (config.is_default) {
          toast.error("Cannot delete the default configuration.")
          return
      }
      setConfigs((prev) => prev.filter((c) => c.id !== config.id))
      toast.success(`${config.name} deleted.`)
  }
  
  return (
<div className="pt-6 max-w-4xl space-y-6 mx-auto">
            <Card className="px-20">
        {/* Profile Tab*/}
        {activeTab === "profile" && (
          <div className="space-y-0">

              {/* Names */}
              <div className="flex items-start justify-between py-5">
                  <div className="w-52 shrink-0">
                      <p className="text-sm font-medium">Name</p>
                  </div>
                {editingName ? (
                    <div className="flex flex-1 items-end gap-3">
                        <div className="flex flex-1 gap-3">
                            <div className="flex-1 space-y-1.5">
                                <Label className="text-xs text-muted-foreground">First Name</Label>
                                <Input
                                    value={draftFirstName}
                                    onChange={(e) => setDraftFirstName(e.target.value)}
                                    autoFocus
                                />
                            </div>
                          <div className="flex-1 space-y-1.5">
                              <Label className="text-xs text-muted-foreground">Last Name</Label>
                              <Input
                                  value={draftLastName}
                                  onChange={(e) => setDraftLastName(e.target.value)}
                              />
                          </div>
                        </div>
                        <div className="flex gap-2 pb-0.5">
                            <Button size="sm" variant="outline" onClick={() => setEditingName(false)}>Cancel</Button>
                            <Button size="sm" onClick={handleSaveName}>Save</Button>
                        </div>
                    </div>
                  ) : (
                  <div className="flex flex-1 items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                          {`${firstName} ${lastName}`.trim() || "-"}
                      </p>
                      <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setDraftFirstName(firstName)
                            setDraftLastName(lastName)
                            setEditingName(true)
                        }}
                      >
                          Edit
                      </Button>
                  </div>
                )}
              </div>
              <Separator />

              {/* Email */}
              <div className="flex items-start justify-between py-5">
                  <div className="w-52 shrink-0">
                      <p className="text-sm font-medium">Email address</p>
                  </div>
                {editingEmail ? (
                    <div className="flex flex-1 items-end gap-3">
                        <div className="flex-1 space-y-1.5">
                            <Input
                                type="email"
                                value={draftEmail}
                                onChange={(e) => setDraftEmail(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="flex gap-2 pb-0.5">
                            <Button size="sm" variant="outline" onClick={() => setEditingEmail(false)}>Cancel</Button>
                            <Button size="sm" onClick={handleSaveEmail}>Save</Button>
                        </div>
                    </div>
                  ) : (
                  <div className="flex flex-1 items-center justify-between">
                      <p className="text-sm text-muted-foreground">{email || "-"}</p>
                      <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setDraftEmail(email)
                            setEditingEmail(true)
                          }}
                      >
                          Edit
                      </Button>
                  </div>
                  )}
              </div>
              <Separator />

              {/* Password */}
              <div className="flex items-center justify-between py-5">
                  <div className="w-52 shrink-0">
                      <p className="text-sm font-medium">Password</p>
                  </div>
                  <div className="flex flex-1 items-center justify-between">
                      <p className="text-sm text-muted-foreground">••••••••••</p>
                      <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowPasswordDialog(true)}
                      >
                          Edit
                      </Button>
                  </div>
              </div> 
          </div>
        )}

        {/* Scheduler Tab */}
        {activeTab === "scheduler" && (
            <div className="space-y-0">
                <p className="pb-4 text-sm text-muted-foreground">
                    Manage solver configurations used during schedule generation. Set one as the default to use it automatically.
                </p>

              {configs.map((config, i) => (
                <div key={config.id}>
                    <div className="flex items-center justify-between py-5">
                        <div className="w-52 shrink-0">
                            <p className="text-sm font-medium">{config.name}</p>
                        </div>
                        <div className="flex flex-1 items-center justify-between">
                            <p className="text-sm text-muted-foreground">
                                Baseline {config.baseline_hours_target}h · Understaffed - {config.understaffed_penalty}
                                {config.solver_time_limit ? ` · ${config.solver_time_limit}s limit` : ""}
                            </p>
                            <div className="flex items-center gap-2">
                              {config.is_default && (
                                  <Badge className="bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/15 text-[16px] px-1.5 py-0">
                                      Default
                                  </Badge>
                              )}
                              {!config.is_default && (
                                  <Button size="sm" variant="outline" onClick={() => handleSetDefault(config)}>
                                      Set Default
                                  </Button>
                              )}
                              <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setDeleteTarget(config)}
                                  disabled={config.is_default}
                              >
                                  <Trash2 />
                              </Button>
                            </div>
                        </div>
                    </div>
                  {i < configs.length - 1 && <Separator />}
                </div>
              ))}
              <Separator />

              <div className="flex justify-end pt-4">
                  <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
                      New Configuration
                  </Button>
              </div>
          </div>
        )}
</Card>
        {/* Password Dialog */}
        <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <div className="flex justify-start">
                        <DialogTitle>Reset Password</DialogTitle>
                        <LockOpen className="mb-1 pb-2" />
                    </div>
                    <DialogDescription>
                        We'll send a password reset link to{" "}
                        <span className="font-medium text-foreground">{email}</span>.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button
                        size="sm"
                        onClick={() => { sendResetEmail(email) }}
                        disabled={resetLoading || resendTimer > 0}
                    >
                        {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Send reset link"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* New Config Dialog */}
        <Dialog open={showForm} onOpenChange={(open) => {
            if (!open) {
                setNewConfig({
                    name: "",
                    baseline_hours_target: 0,
                    understaffed_penalty: 0.0,
                    solver_time_limit: null,
                    allow_minimum_violation: false,
                })
            }
            setShowForm(open)
        }}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>New Configuration</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Configuration Name</Label>
                    <Input
                      value={newConfig.name}
                      onChange={(e) => setNewConfig((prev) => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Baseline Hours Target</Label>
                          <Input
                              type="number"
                              value={newConfig.baseline_hours_target}
                              onChange={(e) => setNewConfig((prev) => ({ ...prev, baseline_hours_target: Number(e.target.value) }))}
                          />
                      </div>
                      <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Understaffed Penalty</Label>
                          <Input
                              type="number"
                              value={newConfig.understaffed_penalty}
                              onChange={(e) => setNewConfig((prev) => ({ ...prev, understaffed_penalty: Number(e.target.value) }))}
                          />
                      </div>
                      <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Solver Time Limit (seconds)</Label>
                          <Input
                              type="number"
                              placeholder="No limit"
                              value={newConfig.solver_time_limit ?? ""}
                              onChange={(e) => setNewConfig((prev) => ({ ...prev, solver_time_limit: e.target.value === "" ? null : Number(e.target.value) }))}
                          />
                      </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border p-3">
                      <Checkbox
                          checked={newConfig.allow_minimum_violation}
                          onCheckedChange={(checked) => setNewConfig((prev) => ({ ...prev, allow_minimum_violation: checked === true }))}
                      />
                      <div>
                          <p className="text-sm font-medium">Allow Minimum Violation</p>
                          <p className="text-xs text-muted-foreground">Allow the solver to violate minimum hour constraints</p>
                      </div>
                  </div>
              </div>
                <DialogFooter>
                    <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
                    <Button size="sm" onClick={handleCreate}>Create</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>Delete Configuration</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                    Are you sure you want to delete{" "}
                    <span className="font-medium text-foreground">{deleteTarget?.name}</span>?
                    This cannot be undone.
                </p>
                <DialogFooter>
                    <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>Cancel</Button>
                    <Button
                        size="sm"
                        onClick={() => {
                            if (deleteTarget) handleDelete(deleteTarget)
                            setDeleteTarget(null)
                        }}
                    >
                        Delete
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  )
}