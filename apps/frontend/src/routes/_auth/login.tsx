import * as React from 'react'
import { loginUser } from '../../lib/auth'
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../../components/ui/alert-dialog"
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { GraduationCap } from 'lucide-react'

export const Route = createFileRoute('/_auth/login')({
  component: LoginComponent,
})

export function LoginComponent() {
  const [studentId, setStudentId] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const result = await loginUser(studentId, password)
      if (result.role === 'admin') {
        navigate({ to: '/' })
      } else {
        navigate({ to: '/' })
      }
    } catch (err) {
      setError('Invalid student ID or password. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-4 gap-6">
      <div className="flex items-center gap-3 w-full max-w-4xl">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <GraduationCap className="size-5" />
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-lg font-semibold">HelpDesk</span>
          <span className="text-xs text-muted-foreground">Rostering</span>
        </div>
      </div>
      <Card className="w-full max-w-4xl overflow-hidden shadow-xl flex flex-row p-0 min-h-[500px]">
        <div className="hidden lg:block lg:w-1/2 relative">
          <img
            src="/images/UwiFrontPage.jpg"
            alt="UWI Campus"
            className="absolute inset-0 h-full w-full object-cover" />
        </div>

        <div className="w-full lg:w-1/2 flex flex-col justify-center p-10">
          <CardHeader className="px-0 pt-0 text-center space-y-2">
            <CardTitle className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Welcome back
            </CardTitle>
            <p className="text-muted-foreground">
              Sign in to your account
            </p>
          </CardHeader>

          <CardContent className="px-0">
            <form onSubmit={handleSubmit}>
              <div className="flex flex-col gap-5">
                <div className="grid gap-1.5">
                  <Label htmlFor="studentId">
                    Student ID
                  </Label>
                  <Input
                    id="studentId"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    required />
                </div>

                <div className="grid gap-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">
                      Password
                    </Label>

                    <a href="/passwordreset"
                      className="text-xs text-primary hover:underline">
                      Forgot password?
                    </a>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}>
                  {isSubmitting ? "Signing in..." : "Sign In"}
                </Button>

              </div>
            </form>
          </CardContent>

          <CardFooter className="px-0 pb-0">
            <div className="text-sm text-muted-foreground text-center w-full mt-1">
              Don't have an account?{" "}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="text-primary font-medium hover:underline">
                    Apply to be an Assistant
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will take you to the sign-up page for new assistants. Do you want to proceed?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => navigate({ to: '/sign-up' as any })}>
                      Continue
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardFooter>
        </div>
      </Card>
    </div>
  )
}