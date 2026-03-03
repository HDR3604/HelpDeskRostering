import { useState, useCallback } from 'react'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Copy, CircleCheck } from 'lucide-react'

interface CopyMenuItemProps {
    value: string
    label?: string
}

export function CopyMenuItem({ value, label = 'Copy ID' }: CopyMenuItemProps) {
    const [copied, setCopied] = useState(false)

    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(value)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }, [value])

    return (
        <DropdownMenuItem
            onSelect={(e) => {
                e.preventDefault()
                handleCopy()
            }}
        >
            {copied ? (
                <>
                    <CircleCheck className="mr-2 h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-emerald-500">Copied!</span>
                </>
            ) : (
                <>
                    <Copy className="mr-2 h-3.5 w-3.5" />
                    {label}
                </>
            )}
        </DropdownMenuItem>
    )
}
