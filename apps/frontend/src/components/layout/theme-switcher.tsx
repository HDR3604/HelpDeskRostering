import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from '@/hooks/use-theme'
import { cn } from '@/lib/utils'

const options = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'system', icon: Monitor, label: 'System' },
    { value: 'dark', icon: Moon, label: 'Dark' },
] as const

export function ThemeSwitcher() {
    const { theme, setTheme } = useTheme()

    return (
        <div className="flex items-center gap-1 rounded-full border bg-background/80 p-1 shadow-sm backdrop-blur-sm">
            {options.map(({ value, icon: Icon, label }) => (
                <button
                    key={value}
                    onClick={() => setTheme(value)}
                    className={cn(
                        'rounded-full p-1.5 transition-colors',
                        theme === value
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground',
                    )}
                    aria-label={label}
                >
                    <Icon className="size-3.5" />
                </button>
            ))}
        </div>
    )
}
