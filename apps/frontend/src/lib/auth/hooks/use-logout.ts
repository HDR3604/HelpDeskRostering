import { useNavigate } from '@tanstack/react-router'
import { useCallback } from 'react'
import { logoutUser } from '../actions'
import { resetOnboardingCheck } from '../onboarding-check'

/**
 * Returns a stable callback that logs out the user
 * (calls server logout + clears tokens) and navigates to /sign-in.
 */
export function useLogout() {
    const navigate = useNavigate()

    return useCallback(async () => {
        await logoutUser()
        resetOnboardingCheck()
        navigate({ to: '/sign-in' })
    }, [navigate])
}
