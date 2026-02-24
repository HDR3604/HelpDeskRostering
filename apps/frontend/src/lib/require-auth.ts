import { redirect } from '@tanstack/react-router'
import { isAuthenticated } from './auth'

export function requireAuth({ location }: { location: { href: string } }) {
    if (!isAuthenticated()) {
        throw redirect({
            to: '/sign-in',
            search: { redirect: location.href },
        })
    }
}
