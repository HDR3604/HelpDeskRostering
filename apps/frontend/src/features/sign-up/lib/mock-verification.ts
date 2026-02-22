// Mock verification helpers — replace with real API calls when backend is wired up.
// Simulates the magic-link email flow: send → wait → verified after ~5 seconds.

const sentAt = new Map<string, number>()

const VERIFY_DELAY_MS = 5_000

export async function mockSendVerificationEmail(email: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 1_000))
    sentAt.set(email, Date.now())
    console.log(`[mock] Verification email sent to ${email}`)
}

export async function mockCheckVerificationStatus(email: string): Promise<boolean> {
    const timestamp = sentAt.get(email)
    if (!timestamp) return false
    return Date.now() - timestamp >= VERIFY_DELAY_MS
}
