import * as React from 'react'
import { useState, useEffect } from 'react'
import { toast } from "sonner"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
    Card,
    CardContent
} from '@/components/ui/card'
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogFooter, 
    DialogDescription
} from '@/components/ui/dialog'
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from '@/components/ui/select'
import { 
    Upload, 
    FileText, 
    LockOpen,
    Pencil,
    Save
} from 'lucide-react'
import { useLocation } from '@tanstack/react-router'
import { useUser } from '@/lib/auth/hooks/use-user'
import { usePasswordReset } from '@/lib/auth/use-password-reset'
import { StepAvailability } from '@/features/sign-up/components/step-availability'


//List of local banks
const TT_BANKS = [
    "Republic Bank Ltd.",
    "Scotiabank (T&T) Ltd.",
    "First Citizens Bank", 
    "RBC Royal Bank (T&T) Ltd.",
    "JMMB Bank (T&T) Ltd.",
    "ANSA Bank Limited",
    "Central Bank",
    "First Caribbean International Bank",
    "Citibank Trinidad Ltd.",
]

export function StudentSettings() {
    const { firstName: userFirstName, lastName: userLastName, email: userEmail } = useUser()
    const { sendResetEmail, isLoading: resetLoading, resendTimer } = usePasswordReset()

    const { pathname } = useLocation()
    const activeTab = pathname.includes("availability")
    ? "availability"
    : pathname.includes("payment")
    ? "payment"
    : "profile"

    // Profile (add api call)
    const [studentId] = useState<number | null>(null)
    const [firstName, setFirstName] = useState(userFirstName ?? "")
    const [lastName, setLastName] = useState(userLastName ?? "")
    const [email, setEmail] = useState(userEmail ?? "")
    const [phone, setPhone] = useState("")
    const [degree] = useState<string | null>(null)
    useEffect(() => {
        if (userFirstName) setFirstName(userFirstName)
        if (userLastName) setLastName(userLastName)
        if (userEmail) setEmail(userEmail)
    }, [userFirstName, userLastName, userEmail])

    const [editingName, setEditingName] = useState(false)
    const [editingPhone, setEditingPhone] = useState(false)
    const [draftFirstName, setDraftFirstName] = useState("")
    const [draftLastName, setDraftLastName] = useState("")
    const [draftPhone, setDraftPhone] = useState("")

    // Availability
    const [availability, setAvailability] = React.useState<Record<string, number[]>>({})
    const availabilityFormRef = React.useRef<HTMLDivElement>(null)
    
    // Transcript upload
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [transcriptUrl, setTranscriptUrl] = useState<string | null>(null)

    // Payment states
    const [bankName, setBankName]       = useState("")
    const [accountType, setAccountType] = useState("")
    const [accountNumber, setAccountNumber] = useState("")

    // Payment edit modes
    const [editingBankName, setEditingBankName]         = useState(false)
    const [editingAccountType, setEditingAccountType]   = useState(false)
    const [editingAccountNumber, setEditingAccountNumber] = useState(false)

    // Payment draft values
    const [draftBankName, setDraftBankName]         = useState("")
    const [draftAccountType, setDraftAccountType]   = useState("")
    const [draftAccountNumber, setDraftAccountNumber] = useState("")

    // Password dialog
    const [showPasswordDialog, setShowPasswordDialog] = useState(false)

    // Handlers also api call
    function handleSaveName() {
        if (draftFirstName === "" || draftLastName === "") {
          toast.error("Name cannot be empty.")
          return
        }
        setFirstName(draftFirstName)
        setLastName(draftLastName)
        setEditingName(false)
        toast.success("Name updated.")
    }

    function handleSavePhone() {
        setPhone(draftPhone)
        setEditingPhone(false)
        toast.success("Phone number updated.")
    }

    function handleSaveBankName() {
        if (!draftBankName) { toast.error("Please select a bank."); return }
        setBankName(draftBankName)
        setEditingBankName(false)
        toast.success("Bank updated.")
    }

    function handleSaveAccountType() {
        if (!draftAccountType) { toast.error("Please select an account type."); return }
        setAccountType(draftAccountType)
        setEditingAccountType(false)
        toast.success("Account type updated.")
    }

    function handleSaveAccountNumber() {
        if (!draftAccountNumber) { toast.error("Account number cannot be empty."); return }
        setAccountNumber(draftAccountNumber)
        setEditingAccountNumber(false)
        toast.success("Account number updated.")
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        if (file.type !== "application/pdf") {
            toast.error("Please upload a PDF file.")
            return
        }
        setSelectedFile(file)
    }

    // Update handleUpload to create a local object URL
    async function handleUpload() {
        if (!selectedFile) 
            return
        setIsUploading(true)
        const url = URL.createObjectURL(selectedFile)
        await new Promise((r) => setTimeout(r, 1000))
        setIsUploading(false)
        setTranscriptUrl(url)
        setSelectedFile(null)
        toast.success("Transcript uploaded successfully.")
        // replace url with the URL returned from the API
    }

    return (
        <div className="max-w-5xl space-y-6">
            {/* Profile Tab */}
            {activeTab === "profile" && (
                <Card>
                    <CardContent>
                        <div className="space-y-0">

                            {/* Student ID */}
                            <div className="flex items-center justify-between py-5">
                                <div className="w-40 shrink-0">
                                    <p className="text-sm font-medium">Student ID</p>
                                </div>
                                <div className="flex flex-1 items-center">
                                    <p className="text-sm text-muted-foreground">{studentId || "-"}</p>
                                </div>
                            </div>
                            <Separator />
                            
                            {/* Email */}
                            <div className="flex items-center justify-between py-5">
                                <div className="w-40 shrink-0">
                                    <p className="text-sm font-medium">Email</p>
                                </div>
                                <div className="flex flex-1 items-center">
                                    <p className="text-sm text-muted-foreground">{userEmail || "-"}</p>
                                </div>
                            </div>
                            <Separator />
                            
                            {/* Degree */}
                            <div className="flex items-center justify-between py-5">
                                <div className="w-40 shrink-0">
                                    <p className="text-sm font-medium">Degree programme</p>
                                </div>
                                <div className="flex flex-1 items-center">
                                    <p className="text-sm text-muted-foreground">{degree || "-"}</p>
                                </div>
                            </div>
                            <Separator />
                            
                            {/* Names */}
                            <div className="flex items-start justify-between py-5">
                                <div className="w-40 shrink-0">
                                    <p className="text-sm font-medium">Name</p>
                                </div>
                              {editingName ? (
                                  <div className="flex flex-1 items-end gap-3">
                                      <div className="flex flex-1 gap-3">
                                        <div className="flex-1 space-y-1.5">
                                            <Label className="text-xs text-muted-foreground">First Name</Label>
                                            <Input 
                                                value={draftFirstName} 
                                                onChange={(e) => 
                                                    setDraftFirstName(
                                                        e.target.value
                                                    )
                                                } 
                                                autoFocus 
                                            />
                                        </div>
                                        <div className="flex-1 space-y-1.5">
                                            <Label className="text-xs text-muted-foreground">Last Name</Label>
                                            <Input 
                                                value={draftLastName} 
                                                onChange={(e) => 
                                                    setDraftLastName(
                                                        e.target.value
                                                    )   
                                                } 
                                            />  
                                        </div>
                                      </div>
                                      <div className="flex gap-2 pb-0.5">
                                          <Button 
                                              size="sm" 
                                              variant="outline" 
                                              onClick={() => 
                                                  setEditingName(
                                                      false
                                                  )
                                              }
                                          >
                                              Cancel
                                          </Button>
                                          <Button 
                                              size="sm" 
                                              onClick={handleSaveName}
                                          >
                                              Save
                                          </Button>
                                      </div>
                                  </div>
                              ) : (
                                <button
                                    className="group flex flex-1 items-center justify-start text-left rounded-md px-2 py-1 -mx-2 hover:bg-muted transition-colors"
                                    onClick={() => {
                                        setDraftFirstName(firstName)
                                        setDraftLastName(lastName)
                                        setEditingName(true)
                                    }}
                                >
                                    <p className="pr-2 text-sm text-muted-foreground">{`${firstName} ${lastName}`.trim() || "-"}</p>
                                    <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                              )}
                            </div>
                            <Separator />

                            {/* Phone */}
                            <div className="flex items-start justify-between py-5">
                                <div className="w-40 shrink-0">
                                    <p className="text-sm font-medium">Phone number</p>
                                </div>
                                {editingPhone ? (
                                    <div className="flex flex-1 items-end gap-3">
                                        <div className="flex-1 space-y-1.5">
                                            <Input 
                                                type="tel" 
                                                placeholder="868-123-4567" 
                                                value={draftPhone} 
                                                onChange={(e) => 
                                                    setDraftPhone(
                                                        e.target.value
                                                    )
                                                } 
                                                autoFocus
                                            />
                                        </div>
                                        <div className="flex gap-2 pb-0.5">
                                            <Button 
                                                size="sm" 
                                                variant="outline" 
                                                onClick={() => 
                                                setEditingPhone(false)}
                                            >
                                                Cancel
                                            </Button>
                                            
                                            <Button 
                                                size="sm" 
                                                onClick={handleSavePhone}
                                            >
                                                Save
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        className="group flex flex-1 items-center justify-start text-left rounded-md px-2 py-1 -mx-2 hover:bg-muted transition-colors"
                                        onClick={() => {
                                            setDraftPhone(phone)
                                            setEditingPhone(true)
                                        }}
                                    >
                                        <p className="pr-2 text-sm text-muted-foreground">{phone || "-"}</p>
                                        <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                )}
                            </div>
                            <Separator />

                            {/* Password */}
                            <div className="flex items-center justify-between py-5">
                                <div className="w-40 shrink-0">
                                    <p className="text-sm font-medium">Password</p>
                                </div>
                                <button
                                    className="group flex flex-1 items-center justify-start text-left rounded-md px-2 py-1 -mx-2 hover:bg-muted transition-colors"
                                    onClick={() => {
                                        setShowPasswordDialog(true)
                                    }}
                                >
                                    <p className="pr-2 text-sm text-muted-foreground">••••••••••</p>
                                    <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                            </div>
                            <Separator />

                            {/* Transcript */}
                            <div className="flex items-start justify-between py-5">
                                <div className="w-40 shrink-0">
                                    <p className="text-sm font-medium">Transcript</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">PDF only</p>
                                </div>
                                <div className="flex flex-1 items-center justify-between">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        {selectedFile ? (
                                          <>
                                            <FileText className="h-4 w-4" />
                                            <span className="truncate max-w-48">{selectedFile.name}</span>
                                            <span className="text-xs">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
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
                                                  onClick={handleUpload} 
                                                  disabled={isUploading}
                                              >
                                                  {isUploading ? "Uploading..." : "Upload"}
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
                                                      {transcriptUrl ? "Replace" : "Browse"}
                                                  </span>
                                              </Button>
                                          </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {activeTab === "availability" && (
                <Card>
                    <CardContent>
                        <div className="space-y-0">
                            <p className="pb-4 text-sm text-muted-foreground flex justify-between">
                                Set the hours you are available to work each week.
                                <div className="flex gap-2 pt-4">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            availabilityFormRef.current
                                            ?.querySelector<HTMLButtonElement>("button[type='submit']")
                                            ?.click()
                                        }}
                                    >
                                        Save Changes <Save />
                                    </Button>
                                </div>
                            </p>
                            <div
                                ref={availabilityFormRef}
                                className="[&_form>button[type='button']]:hidden [&_form>button[type='submit']]:hidden"
                            >
                                <StepAvailability
                                    defaultValues={availability}
                                    onNext={(updated) => {
                                        setAvailability(updated)
                                        toast.success("Availability saved.")
                                        // call API
                                    }}
                                    onBack={() => {}}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Payment Tab */}
            {activeTab === "payment" && (
                <Card>
                    <CardContent>
                        <div className="space-y-0">
                            <p className="pb-4 text-sm text-muted-foreground">
                                Your bank account details for receiving payment.
                            </p>

                            {/* Bank name */}
                            <div className="flex items-start justify-between py-5">
                                <div className="w-40 shrink-0">
                                    <p className="text-sm font-medium">Bank</p>
                                </div>
                                {editingBankName ? (
                                    <div className="flex flex-1 items-end gap-3">
                                        <div className="flex-1 space-y-1.5">
                                            <Select value={draftBankName} onValueChange={setDraftBankName}>
                                              <SelectTrigger>
                                                <SelectValue placeholder="Select bank..." />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {TT_BANKS.map((b) => (
                                                  <SelectItem key={b} value={b}>{b}</SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="flex gap-2 pb-0.5">
                                            <Button 
                                                size="sm" 
                                                variant="outline" 
                                                onClick={() => setEditingBankName(false)}
                                            >
                                                Cancel
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                onClick={handleSaveBankName}
                                            >
                                                Save
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        className="group flex flex-1 items-center justify-start text-left rounded-md px-2 py-1 -mx-2 hover:bg-muted transition-colors"
                                        onClick={() => {
                                            setDraftBankName(bankName)
                                            setEditingBankName(true)
                                        }}
                                    >
                                        <p className="pr-2 text-sm text-muted-foreground">{bankName || "-"}</p>
                                        <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                )}
                            </div>
                            <Separator />

                            {/* Account type */}
                            <div className="flex items-start justify-between py-5">
                                <div className="w-40 shrink-0">
                                    <p className="text-sm font-medium">Account type</p>
                                </div>
                                {editingAccountType ? (
                                    <div className="flex flex-1 items-end gap-3">
                                        <div className="flex-1 space-y-1.5">
                                          <Select value={draftAccountType} onValueChange={setDraftAccountType}>
                                              <SelectTrigger>
                                                  <SelectValue placeholder="Select type..." />
                                              </SelectTrigger>
                                              <SelectContent>
                                                  <SelectItem value="Chequing">
                                                      Chequing
                                                  </SelectItem>
                                                  <SelectItem value="Savings">
                                                      Savings
                                                  </SelectItem>
                                              </SelectContent>
                                          </Select>
                                        </div>
                                        <div className="flex gap-2 pb-0.5">
                                            <Button 
                                                size="sm" 
                                                variant="outline" 
                                                onClick={() => setEditingAccountType(false)}
                                            >
                                                Cancel
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                onClick={handleSaveAccountType}
                                            >
                                                Save
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        className="group flex flex-1 items-center gap-2 text-left rounded-md px-2 py-1 -mx-2 text-sm text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                                        onClick={() => {
                                            setDraftAccountType(accountType)
                                            setEditingAccountType(true)
                                        }}
                                    >
                                        <p className="text-sm text-muted-foreground">{accountType || "-"}</p>
                                        <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                )}
                            </div>
                            <Separator />

                            {/* Account number */}
                            <div className="flex items-start justify-between py-5">
                                <div className="w-40 shrink-0">
                                    <p className="text-sm font-medium">Account number</p>
                                </div>
                                {editingAccountNumber ? (
                                    <div className="flex flex-1 items-end gap-3">
                                        <div className="flex-1 space-y-1.5">
                                            <Input
                                                value={draftAccountNumber}
                                                onChange={(e) => setDraftAccountNumber(e.target.value)}
                                                autoFocus
                                            />
                                        </div>
                                        <div className="flex gap-2 pb-0.5">
                                            <Button 
                                                size="sm" 
                                                variant="outline" 
                                                onClick={() => setEditingAccountNumber(false)}
                                            >
                                                Cancel
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                onClick={handleSaveAccountNumber}
                                            >
                                                Save
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        className="group flex flex-1 items-center gap-2 text-left rounded-md px-2 py-1 -mx-2 text-sm text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                                        onClick={() => {
                                            setDraftAccountNumber(accountNumber)
                                            setEditingAccountNumber(true)
                                        }}
                                    >
                                        <p className="text-sm text-muted-foreground">
                                            {accountNumber
                                                ? `${"•".repeat(Math.max(0, accountNumber.length - 4))}${accountNumber.slice(-4)}`
                                                : "-"}
                                        </p>
                                        <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

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
        </div>
    )
}