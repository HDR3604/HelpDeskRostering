import { useNavigate } from "@tanstack/react-router"
import { useCallback } from "react"
import { logoutUser } from "@/lib/auth"

/**
 * Returns a stable callback that logs out the user
 * (calls server logout + clears tokens) and navigates to /sign-in.
 */
export function useLogout() {
  const navigate = useNavigate()

  return useCallback(async () => {
    await logoutUser()
    navigate({ to: "/sign-in" })
  }, [navigate])
}
