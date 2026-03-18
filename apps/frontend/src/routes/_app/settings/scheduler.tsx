import { createFileRoute } from '@tanstack/react-router'
import { AdminSettings } from '@/features/admin/admin-settings'

export const Route = createFileRoute('/_app/settings/scheduler')({
  component: AdminSettings,
})