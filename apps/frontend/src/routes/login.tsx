import * as React from 'react'
import { loginUser } from '../lib/auth'
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card"
import { createFileRoute, useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/login')({
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
    <div className="h-screen flex items-center justify-center bg-slate-100">
      <Card className="w-full max-w-4xl overflow-hidden shadow-xl flex flex-row p-0 min-h-[500px]">
        <div className="hidden lg:block lg:w-1/2 relative">
          <img
            src="/images/UwiFrontPage.jpg"
            alt="UWI Campus"
            className="absolute inset-0 h-full w-full object-cover"/>
        </div>

        <div className="w-full lg:w-1/2 flex flex-col justify-center p-10">
          <CardHeader className="px-0 pt-0">
            <p className="text-s font-semibold text-blue-700 mb-1">
              Welcome back
            </p>
            <CardTitle className="text-2xl font-bold text-slate-800">
              Sign in to your account
            </CardTitle>
          </CardHeader>

          <CardContent className="px-0">
            <form onSubmit={handleSubmit}>
              <div className="flex flex-col gap-5">
                <div className="grid gap-1.5">
                  <Label htmlFor="studentId" className="text-slate-800 font-medium mt-1">
                    Student ID
                  </Label>
                  <Input
                    id="studentId"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    required
                    className="h-12"/>
                </div>

                <div className="grid gap-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-slate-700 font-medium">
                      Password
                    </Label>
                    
                    <a href="/passwordreset"
                      className="text-xs text-blue-600 hover:text-blue-800 hover:underline transition-colors">
                      Forgot password?
                    </a>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12"/>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 hover:bg-blue-800 text-white font-semibold bg-blue-700 mt-1"
                  disabled={isSubmitting}>
                  {isSubmitting ? "Signing in..." : "Sign In"}
                </Button>

              </div>
            </form>
          </CardContent>

          <CardFooter className="px-0 pb-0">
            <p className="text-sm text-slate-500 text-center w-full  mt-1">
              Don't have an account?    
              <a href="/signup"
                className="text-blue-600 font-medium hover:underline transition-colors ml-1">
                Sign Up as an Assistant
              </a>
            </p>
          </CardFooter>
        </div>
      </Card>
    </div>
  )
}