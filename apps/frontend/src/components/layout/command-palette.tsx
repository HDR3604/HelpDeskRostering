import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
    LayoutDashboard,
    FileText,
    Calendar,
    Settings,
    ClipboardList,
    UserSearch,
    DollarSign,
} from 'lucide-react'
import { useUser } from '@/lib/auth'
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandShortcut,
} from '@/components/ui/command'

interface NavItem {
    label: string
    to: string
    search?: Record<string, string>
    icon: React.ComponentType<{ className?: string }>
    shortcut?: string
    keywords?: string[]
}

const ADMIN_PAGES: NavItem[] = [
    {
        label: 'Dashboard',
        to: '/',
        icon: LayoutDashboard,
        shortcut: 'D',
        keywords: ['home', 'overview'],
    },
    {
        label: 'Applications',
        to: '/applications',
        icon: FileText,
        shortcut: 'A',
        keywords: ['students', 'pending'],
    },
    {
        label: 'Schedule',
        to: '/schedule',
        icon: Calendar,
        shortcut: 'S',
        keywords: ['roster', 'shifts'],
    },
    {
        label: 'Assistants — Team',
        to: '/assistants',
        icon: UserSearch,
        keywords: ['assistants', 'team', 'roster', 'students'],
    },
    {
        label: 'Assistants — Payroll',
        to: '/assistants/payments',
        icon: DollarSign,
        keywords: ['payroll', 'payments', 'salary', 'hours'],
    },
    {
        label: 'Settings',
        to: '/settings',
        icon: Settings,
        keywords: ['preferences', 'config'],
    },
]

const STUDENT_PAGES: NavItem[] = [
    {
        label: 'My Schedule',
        to: '/',
        icon: Calendar,
        shortcut: 'S',
        keywords: ['shifts', 'roster'],
    },
    {
        label: 'Onboarding',
        to: '/onboarding',
        icon: ClipboardList,
        keywords: ['banking', 'setup'],
    },
    {
        label: 'Settings',
        to: '/settings',
        icon: Settings,
        keywords: ['preferences', 'config'],
    },
]

export function CommandPalette() {
    const [open, setOpen] = useState(false)
    const navigate = useNavigate()
    const { role } = useUser()

    const pages = useMemo(
        () => (role === 'admin' ? ADMIN_PAGES : STUDENT_PAGES),
        [role],
    )

    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault()
                setOpen((prev) => !prev)
            }
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [])

    function handleSelect(item: NavItem) {
        setOpen(false)
        navigate({ to: item.to, search: item.search })
    }

    return (
        <CommandDialog
            open={open}
            onOpenChange={setOpen}
            title="Go to page"
            description="Search for a page to navigate to"
            showCloseButton={false}
        >
            <CommandInput placeholder="Where do you want to go?" />
            <CommandList>
                <CommandEmpty>No pages found.</CommandEmpty>
                <CommandGroup heading="Pages">
                    {pages.map((page) => (
                        <CommandItem
                            key={`${page.to}${page.search ? JSON.stringify(page.search) : ''}`}
                            value={`${page.label} ${page.keywords?.join(' ') ?? ''}`}
                            onSelect={() => handleSelect(page)}
                        >
                            <page.icon className="size-4" />
                            <span>{page.label}</span>
                            {page.shortcut && (
                                <CommandShortcut>
                                    {page.shortcut}
                                </CommandShortcut>
                            )}
                        </CommandItem>
                    ))}
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    )
}
