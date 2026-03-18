import { useState, useEffect } from "react"
import { toast } from "sonner"
import { forgotPassword } from '@/lib/auth'
export function usePasswordReset() {
  const [isLoading, setIsLoading] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)

    useEffect(() => {
    if (resendTimer <= 0) return
    const id = setInterval(() => setResendTimer(t => t - 1), 1000)
    return () => clearInterval(id)
    }, [resendTimer])


  async function sendResetEmail(email: string) {
      if (resendTimer > 0) return
      setIsLoading(true)
      try {
          await forgotPassword(email)
          toast.success("A password reset link has been sent to your email.")
          setResendTimer(30)
      } catch {
          toast.error("Failed to send reset email. Please try again.")
      } finally {
          setIsLoading(false)
      }
  }

  return { sendResetEmail, isLoading, resendTimer }
}