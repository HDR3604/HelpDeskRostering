import { useState, useCallback } from 'react'
import { Copy, CircleCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CopyableTextProps {
    text: string
    icon?: React.ComponentType<{ className?: string }>
    className?: string
    iconClassName?: string
}

export function CopyableText({
    text,
    icon: Icon,
    className,
    iconClassName = 'h-3 w-3',
}: CopyableTextProps) {
    const [copied, setCopied] = useState(false)

    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }, [text])

    return (
        <button
            type="button"
            onClick={handleCopy}
            className={cn(
                'group/copy flex items-center gap-1.5 transition-colors hover:text-foreground',
                className,
            )}
        >
            {Icon && (
                <Icon className={cn(iconClassName, 'shrink-0 opacity-50')} />
            )}
            {text}
            {copied ? (
                <CircleCheck
                    className={cn(iconClassName, 'text-emerald-500')}
                />
            ) : (
                <Copy
                    className={cn(
                        iconClassName,
                        'opacity-0 transition-opacity group-hover/copy:opacity-50',
                    )}
                />
            )}
        </button>
    )
}
