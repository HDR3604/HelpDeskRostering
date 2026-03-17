/**
 * Module-level cache for the student onboarding check.
 * Prevents hitting the banking-details API on every route navigation.
 * Reset on logout so the next user gets a fresh check.
 */
let verified = false

export function isOnboardingVerified() {
    return verified
}

export function markOnboardingVerified() {
    verified = true
}

export function resetOnboardingCheck() {
    verified = false
}
