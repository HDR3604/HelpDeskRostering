import { createFileRoute, Outlet } from '@tanstack/react-router'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useUser } from '@/lib/auth/hooks/use-user'
import { 
    Tabs, 
    TabsList, 
    TabsTrigger 
} from '@/components/ui/tabs'
import {
    Link, 
    useRouterState
} from '@tanstack/react-router'
import {  
    MonitorCog, 
    UserPen, 
    CalendarClock, 
    DollarSign 
} from 'lucide-react'

export const Route = createFileRoute('/_app/settings')({
    component: SettingsLayout,
})

function SettingsLayout() {
    useDocumentTitle('Settings')
    const { role } = useUser()
    const router = useRouterState()
    const currentPath = router.location.pathname

    const activeTab = currentPath.endsWith('/availability')
        ? 'availability'
        : currentPath.endsWith('/payment')
        ? 'payment'
        : currentPath.endsWith('/scheduler')
        ? 'scheduler'
        : 'profile'

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex items-end justify-between max-w-3xl gap-4">
              <div>
                  <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Settings</h1>
                  <p className="mt-1 text-muted-foreground">
                      {role === 'student'
                          ? 'Update your information and availability'
                          : 'Update your information and scheduler configurations'
                      }
                  </p>
              </div>
              <Tabs value={activeTab}>
                  <TabsList variant="line">
                        <TabsTrigger value="profile" asChild>
                            <Link to="/settings">
                                <UserPen />
                                Profile
                            </Link>
                        </TabsTrigger>
                        <TabsTrigger value="scheduler" asChild>
                            <Link to="/settings/scheduler">
                                <MonitorCog />
                                Scheduler
                            </Link>
                        </TabsTrigger>
                  </TabsList>
              </Tabs>
            </div>
            <Outlet />
        </div>
    )
}