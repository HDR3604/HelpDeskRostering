import { useRouter } from "@tanstack/react-router"
import { TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"

export function RouteError() {
  const router = useRouter()

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <TriangleAlert className="h-6 w-6 text-destructive" />
      </div>
      <div>
        <p className="text-lg font-semibold">Something went wrong</p>
        <p className="mt-1 text-sm text-muted-foreground">
          An unexpected error occurred. Please try again.
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => router.history.back()}>
          Go back
        </Button>
        <Button onClick={() => router.invalidate()}>
          Try again
        </Button>
      </div>
    </div>
  )
}
