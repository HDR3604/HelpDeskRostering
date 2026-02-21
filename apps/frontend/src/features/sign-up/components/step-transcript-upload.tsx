import { useRef, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, FileText, X, ArrowRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StepTranscriptUploadProps {
    defaultValue?: File
    onNext: (file: File) => void
    isProcessing?: boolean
}

export function StepTranscriptUpload({ defaultValue, onNext, isProcessing }: StepTranscriptUploadProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const submitRef = useRef<HTMLButtonElement>(null)
    const [file, setFile] = useState<File | null>(defaultValue ?? null)
    const [error, setError] = useState('')
    const [isDragOver, setIsDragOver] = useState(false)

    function handleFile(f: File) {
        if (f.type !== 'application/pdf') {
            setError('Only PDF files are accepted')
            return
        }
        setFile(f)
        setError('')
        requestAnimationFrame(() => submitRef.current?.focus())
    }

    function handleDrop(e: React.DragEvent) {
        e.preventDefault()
        setIsDragOver(false)
        const dropped = e.dataTransfer.files[0]
        if (dropped) handleFile(dropped)
    }

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(false)
    }, [])

    function handleSubmit() {
        if (!file) {
            setError('Please upload your transcript to continue')
            return
        }
        onNext(file)
    }

    return (
        <form
            className="space-y-6"
            onSubmit={(e) => {
                e.preventDefault()
                handleSubmit()
            }}
        >
            {file ? (
                <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
                    <FileText className="size-5 shrink-0 text-primary" />
                    <span className="flex-1 truncate text-sm font-medium">{file.name}</span>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-destructive"
                        onClick={() => { setFile(null); setError('') }}
                    >
                        <X className="size-3.5" />
                    </Button>
                </div>
            ) : (
                <div
                    role="button"
                    tabIndex={0}
                    className={cn(
                        'flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-12 text-center transition-colors cursor-pointer',
                        'outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                        isDragOver
                            ? 'border-primary bg-primary/5'
                            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                    )}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            fileInputRef.current?.click()
                        }
                    }}
                >
                    <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                        <Upload className="size-4 text-muted-foreground" />
                    </div>
                    <div>
                        <p className="text-sm font-medium">
                            Drop your transcript here or click to browse
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">PDF only</p>
                    </div>
                </div>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => {
                    const selected = e.target.files?.[0]
                    if (selected) handleFile(selected)
                }}
            />

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end">
                <Button ref={submitRef} type="submit" disabled={isProcessing}>
                    {isProcessing ? (
                        <>
                            <Loader2 className="size-4 animate-spin" />
                            Processing…
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
    )
}
