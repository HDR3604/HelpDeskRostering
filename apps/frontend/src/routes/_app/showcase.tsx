import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_app/showcase")({
  component: HomeComponent,
})

export function HomeComponent() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Enter your email</CardTitle>
        <CardDescription>
          This doesn't work right now tho
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form>
          <div className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Label htmlFor="email">Enter Email</Label>
              <Input id="email" type="email" placeholder="a@uwi.edu" required/>
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex-col gap-2">
      <a href="http://localhost:5174" className="ml-auto inline-block text-sm underline-offset-4 hover:underline">
        <Button type="submit" className="w-full">Back to Home</Button>
      </a>
      </CardFooter>
    </Card>
  )
}
