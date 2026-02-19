import { redirect } from '@tanstack/react-router'
import { isLoggedIn } from './auth'

export function requireAuth() {
  if (!isLoggedIn()) {
    throw redirect({ to: '/login' })
  }
}