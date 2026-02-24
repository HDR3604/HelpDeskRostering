import * as React from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { GraduationCap, Eye, EyeOff } from 'lucide-react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { loginUser } from '../../lib/auth'
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../components/ui/form"
import { Checkbox } from "../../components/ui/checkbox"

export const Route = createFileRoute('/_auth/sign-in')({
  component: SignInComponent,
})

const loginSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean().optional(),
})

type LoginValues = z.infer<typeof loginSchema>

export function SignInComponent() {
  const navigate = useNavigate()
  const [error, setError] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      studentId: '',
      password: '',
      remember: false,
    },
  })

  const onSubmit = async (values: LoginValues) => {
    setError('')
    try {
      const result = await loginUser(values.studentId, values.password, values.remember)
      if (result.role === 'admin') {
        navigate({ to: '/' })
      } else {
        navigate({ to: '/' })
      }
    } catch (err) {
      setError('Invalid student ID or password. Please try again.')
    }
  }

  return (
    <div className="w-full lg:grid lg:min-h-[calc(100vh-4rem)] lg:grid-cols-2 xl:min-h-[800px]">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <GraduationCap className="size-5" />
              </div>
              <div className="flex flex-col leading-none text-left">
                <span className="text-lg font-semibold">HelpDesk</span>
                <span className="text-xs text-muted-foreground">Rostering</span>
              </div>
            </div>
            <h1 className="text-3xl font-bold">Welcome Back</h1>
            <p className="text-balance text-muted-foreground">
              Enter your Student ID below to login
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
              <FormField
                control={form.control}
                name="studentId"
                render={({ field }) => (
                  <FormItem className="grid gap-2">
                    <FormLabel>Student ID</FormLabel>
                    <FormControl>
                      <Input placeholder="816000000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="grid gap-2">
                    <div className="flex items-center">
                      <FormLabel>Password</FormLabel>
                      <a
                        href="/passwordreset"
                        className="ml-auto inline-block text-sm text-primary hover:underline"
                      >
                        Forgot password?
                      </a>
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          {...field}
                        />
                        <button
                          type="button"
                          className="absolute right-0 top-0 h-full px-3 py-2 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowPassword(!showPassword)}
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          <span className="sr-only">
                            {showPassword ? "Hide password" : "Show password"}
                          </span>
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="remember"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0 mt-1">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Remember me
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              {error && (
                <div className="text-sm font-medium text-destructive mt-2">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full mt-2" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </Form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="text-primary font-medium hover:underline">
                  Apply to be an Assistant
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Continue to Assistant Application?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You’ll be taken to the Assistant application form. Submitting an application doesn’t grant access—applications must be reviewed and approved.
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
        </div>
      </div>
      <div className="hidden bg-muted lg:block">
        <img
          src="/images/UwiFrontPage.jpg"
          alt="UWI Campus"
          className="h-full w-full object-cover dark:brightness-[0.8]"
        />
      </div>
    </div>
  )
}