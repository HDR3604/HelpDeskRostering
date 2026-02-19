import * as React from 'react'
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card"
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/sign-in')({
  component: HomeComponent,
})

export function HomeComponent() {
  const [studentId, setStudentId] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setIsSubmitting(true)
  }

  return (
    <div className="flex min-h-screen ">
      <div className="hidden lg:block lg:w-1/2 fancy-animation inert">
        <img
          src="/images/UwiFrontPage.jpg"
          alt="Login background"
          className="h-full w-full object-cover"
          unselectable="on"
        />
      </div>  

      <div className="flex w-full items-center justify-center bg-gray lg:w-1/2">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Login to your account</CardTitle>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="studentId">Student ID</Label>
                  <Input 
                    id="studentId"
                    value={studentId}
                    placeholder="Enter your student ID"
                    onChange={(e) => setStudentId(e.target.value)}
                    required
                  />
                </div>
                
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label>Password</Label>
                    <Label><a href="/passwordreset">Forgot password?</a></Label>
                  </div>
                  <div className="relative">
                    <Input 
                      id="password" 
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
  
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isSubmitting}>
                  {isSubmitting ? "Logging in..." : "Login"}
                </Button>
              </div>  
            </form>
          </CardContent>
          
          <CardFooter className="flex-col gap-2">
            <div className="text-sm text-center text-muted-foreground">
              Don't have an account?
              <a href="/signup">
                <Button variant="link" type="button">
                  Sign Up
                </Button>
              </a>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
