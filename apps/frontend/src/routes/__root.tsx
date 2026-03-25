import { Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ThemeProvider } from '../hooks/use-theme'
import { UserProvider } from '@/lib/auth'
import { Toaster } from '@/components/ui/sonner'
import { RouteError } from '@/components/layout/route-error'
import { RouteNotFound } from '@/components/layout/route-not-found'

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
        },
    },
})

export const Route = createRootRoute({
    component: RootComponent,
    errorComponent: RouteError,
    notFoundComponent: RouteNotFound,
})

function RootComponent() {
    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider>
                <UserProvider>
                    <TooltipProvider>
                        <Outlet />
                        <TanStackRouterDevtools position="bottom-right" />
                        <Toaster />
                    </TooltipProvider>
                </UserProvider>
            </ThemeProvider>
        </QueryClientProvider>
    )
}
