# Development Guide

This guide walks through the frontend architecture and patterns for implementing new features.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Core Infrastructure](#core-infrastructure)
  - [Routing](#routing)
  - [Providers](#providers)
  - [Theme System](#theme-system)
  - [User Context](#user-context)
- [Example: Adding a "Payments" Feature](#example-adding-a-payments-feature)
  - [Step 1: Types](#step-1-types)
  - [Step 2: Mock Data](#step-2-mock-data)
  - [Step 3: Feature Components](#step-3-feature-components)
  - [Step 4: Form with Validation](#step-4-form-with-validation)
  - [Step 5: Route Page](#step-5-route-page)
- [File Structure](#file-structure)
- [Checklist](#checklist)
- [Key Patterns](#key-patterns)
  - [Form Handling](#form-handling)
  - [Multi-Step Forms](#multi-step-forms)
  - [Role-Based Rendering](#role-based-rendering)
  - [Styling Conventions](#styling-conventions)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser Request                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│               Routes (routes/)                               │
│         File-based routing via TanStack Router              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│               Layouts (_app.tsx, _auth.tsx)                   │
│       Sidebar, header, providers, auth guards               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Features (features/<name>/)                      │
│       Components, hooks, schemas, utilities                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│          Shared Components (components/ui/, components/layout/)│
│             shadcn/ui, layout shells, common UI             │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Infrastructure

### Routing

TanStack Router with **file-based routing**. Routes are auto-generated into `routeTree.gen.ts`.

**Route prefixes:**
- `_auth/` — Public routes (sign-up, onboarding). Simple header layout.
- `_app/` — Protected routes (dashboard, schedule, settings). Full sidebar + header layout.

**Route tree:**

| Path | File | Description |
|------|------|-------------|
| `/` | `_app/index.tsx` | Dashboard (role-aware) |
| `/sign-up` | `_auth/sign-up.tsx` | Multi-step student application |
| `/onboarding` | `_auth/onboarding.tsx` | Post-signup onboarding |
| `/applications` | `_app/applications.tsx` | Admin: student applications table |
| `/schedule` | `_app/schedule/index.tsx` | Admin: schedule list |
| `/schedule/$scheduleId` | `_app/schedule/$scheduleId.tsx` | Schedule editor |
| `/settings` | `_app/settings.tsx` | Settings page |

**Creating a new route:**

```tsx
// src/routes/_app/payments.tsx
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_app/payments")({
  component: PaymentsPage,
})

function PaymentsPage() {
  return <div>Payments</div>
}
```

After creating the file, run `pnpm dev` — TanStack Router auto-generates the route entry.

### Providers

Providers are composed in the root layout (`routes/__root.tsx`):

```tsx
function RootComponent() {
  return (
    <ThemeProvider>
      <UserProvider>
        <TooltipProvider>
          <Outlet />
          <TanStackRouterDevtools position="bottom-right" />
          <Toaster />
        </TooltipProvider>
      </UserProvider>
    </ThemeProvider>
  )
}
```

### Theme System

Light/dark/system theme via `useTheme()` hook. Persists to `localStorage` (`"ui-theme"`).

```tsx
import { useTheme } from "@/hooks/use-theme"

const { theme, setTheme } = useTheme() // "light" | "dark" | "system"
```

- Class-based toggle: `.dark` on `<html>`
- OKLCH color system in `styles.css` with CSS custom properties
- Semantic tokens: `primary`, `secondary`, `muted`, `accent`, `destructive`

### User Context

Role and student identity via `useUser()` hook. Persists role to `localStorage` (`"ui-role"`).

```tsx
import { useUser } from "@/hooks/use-user"

const { role, setRole, currentStudent, currentStudentId } = useUser()
// role: "admin" | "student"
```

Currently uses mock data. Will be replaced with real auth when backend auth is integrated.

---

## Example: Adding a "Payments" Feature

---

## Step 1: Types

Define TypeScript interfaces that mirror the backend API response.

```ts
// src/types/payment.ts
export interface Payment {
  payment_id: string
  student_id: number
  period_start: string
  period_end: string
  hours_worked: number
  gross_amount: number
  processed_at: string | null
  created_at: string
  updated_at: string | null
}
```

---

## Step 2: Mock Data

Add mock data for development. All mocks live in `lib/mock-data.ts`.

```ts
// In src/lib/mock-data.ts
export const MOCK_PAYMENTS: Payment[] = [
  {
    payment_id: "pay-001",
    student_id: 816012345,
    period_start: "2025-02-03",
    period_end: "2025-02-16",
    hours_worked: 12.5,
    gross_amount: 250.0,
    processed_at: "2025-02-17T09:00:00Z",
    created_at: "2025-02-17T09:00:00Z",
    updated_at: null,
  },
]
```

---

## Step 3: Feature Components

Feature code is organized under `features/<name>/`. Each feature can have `components/`, `hooks/`, `lib/`, and utilities.

```tsx
// src/features/payments/components/payment-table.tsx
import type { Payment } from "@/types/payment"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatDateMedium } from "@/lib/format"

interface PaymentTableProps {
  payments: Payment[]
}

export function PaymentTable({ payments }: PaymentTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment History</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((p) => (
              <TableRow key={p.payment_id}>
                <TableCell>
                  {formatDateMedium(p.period_start)} – {formatDateMedium(p.period_end)}
                </TableCell>
                <TableCell>{p.hours_worked}h</TableCell>
                <TableCell>${p.gross_amount.toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant={p.processed_at ? "default" : "secondary"}>
                    {p.processed_at ? "Processed" : "Pending"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
```

---

## Step 4: Form with Validation

Forms use **React Hook Form + Zod**. Schemas live in the feature's `lib/` directory.

### Schema

```ts
// src/features/payments/lib/payment-schemas.ts
import { z } from "zod"

export const processPaymentSchema = z.object({
  periodStart: z.string().min(1, "Start date is required"),
  periodEnd: z.string().min(1, "End date is required"),
  studentIds: z.array(z.number()).min(1, "Select at least one student"),
})

export type ProcessPaymentData = z.infer<typeof processPaymentSchema>
```

### Form Component

```tsx
// src/features/payments/components/process-payment-form.tsx
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  processPaymentSchema,
  type ProcessPaymentData,
} from "@/features/payments/lib/payment-schemas"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface ProcessPaymentFormProps {
  onSubmit: (data: ProcessPaymentData) => void
}

export function ProcessPaymentForm({ onSubmit }: ProcessPaymentFormProps) {
  const form = useForm<ProcessPaymentData>({
    resolver: zodResolver(processPaymentSchema),
    defaultValues: {
      periodStart: "",
      periodEnd: "",
      studentIds: [],
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="periodStart"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Period Start</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* ... more fields */}
        <Button type="submit">Process Payments</Button>
      </form>
    </Form>
  )
}
```

---

## Step 5: Route Page

Wire the feature into a route. Use `useUser()` for role-based rendering and `useDocumentTitle()` for the page title.

```tsx
// src/routes/_app/payments.tsx
import { createFileRoute } from "@tanstack/react-router"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { useUser } from "@/hooks/use-user"
import { PaymentTable } from "@/features/payments/components/payment-table"
import { MOCK_PAYMENTS } from "@/lib/mock-data"

export const Route = createFileRoute("/_app/payments")({
  component: PaymentsPage,
})

function PaymentsPage() {
  useDocumentTitle("Payments")
  const { role, currentStudentId } = useUser()

  const payments =
    role === "admin"
      ? MOCK_PAYMENTS
      : MOCK_PAYMENTS.filter((p) => String(p.student_id) === currentStudentId)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
      <PaymentTable payments={payments} />
    </div>
  )
}
```

---

## File Structure

```
src/
├── main.tsx                    # App entry point
├── routeTree.gen.ts            # Auto-generated (TanStack Router)
├── styles.css                  # Tailwind + theme variables (OKLCH)
├── routes/                     # File-based routing
│   ├── __root.tsx              # Root layout (providers, devtools, toaster)
│   ├── _auth.tsx               # Public layout (simple header)
│   ├── _auth/
│   │   ├── sign-up.tsx         # Multi-step student application
│   │   └── onboarding.tsx      # Post-signup onboarding
│   ├── _app.tsx                # Protected layout (sidebar + header)
│   └── _app/
│       ├── index.tsx           # Dashboard (role-aware)
│       ├── applications.tsx    # Admin: student applications
│       ├── settings.tsx        # Settings page
│       └── schedule/
│           ├── index.tsx       # Schedule list
│           └── $scheduleId.tsx # Schedule editor
├── features/                   # Feature modules
│   ├── sign-up/
│   │   ├── components/         # Step components (transcript, verify, contact, etc.)
│   │   └── lib/                # Zod schemas, mock helpers
│   ├── student/
│   │   ├── student-dashboard.tsx
│   │   ├── components/         # Status banner, summary cards, weekly schedule
│   │   ├── skeletons/          # Loading skeletons
│   │   └── utils.ts
│   └── admin/
│       ├── admin-dashboard.tsx
│       ├── schedule/
│       │   ├── schedule-editor.tsx
│       │   ├── schedule-list-view.tsx
│       │   ├── components/     # Grid, tables, dialogs, student pool
│       │   ├── charts/         # Hours, trends, attendance charts
│       │   ├── hooks/          # useGenerationStatus, useScheduleEditor
│       │   └── columns/        # TanStack Table column definitions
│       └── components/         # Applications table, transcript dialog
├── components/
│   ├── ui/                     # shadcn/ui (30+ components, do not edit directly)
│   ├── layout/
│   │   ├── app-sidebar.tsx     # Sidebar navigation (role-based)
│   │   ├── site-header.tsx     # Top bar with breadcrumbs + user menu
│   │   ├── command-palette.tsx # Cmd+K search/navigation
│   │   ├── theme-switcher.tsx  # Light/dark/system toggle
│   │   ├── route-error.tsx     # Error boundary
│   │   └── route-not-found.tsx # 404 page
│   └── shared/                 # Shared components across features
├── hooks/
│   ├── use-user.tsx            # Auth/role context (admin | student)
│   ├── use-theme.ts            # Theme provider (light | dark | system)
│   ├── use-mobile.ts           # Mobile breakpoint detection
│   └── use-document-title.ts   # Page title management
├── types/                      # TypeScript interfaces (mirror backend DTOs)
│   ├── student.ts              # Student, TranscriptMetadata, ApplicationStatus
│   ├── schedule.ts             # ScheduleResponse, Assignment, GenerationStatus
│   ├── shift-template.ts       # ShiftTemplate
│   ├── scheduler-config.ts     # SchedulerConfig
│   └── time-log.ts             # TimeLog
└── lib/                        # Shared utilities
    ├── constants.ts            # Day names, grade colors, status styles
    ├── format.ts               # Date/time/duration formatting
    ├── utils.ts                # cn() classname helper
    └── mock-data.ts            # Mock data for all features
```

---

## Checklist

When implementing a new feature:

- [ ] **Types**: Define interfaces in `types/` that mirror backend API responses
- [ ] **Mock Data**: Add mock data to `lib/mock-data.ts` for development
- [ ] **Feature Directory**: Create `features/<name>/` with `components/`, `lib/`, `hooks/` as needed
- [ ] **Schemas**: Define Zod schemas in `features/<name>/lib/` for any forms
- [ ] **Components**: Build feature components using shadcn/ui primitives
- [ ] **Route**: Create route file in `routes/_app/` (or `routes/_auth/` for public pages)
- [ ] **Sidebar**: Add navigation entry to `components/layout/app-sidebar.tsx` if needed
- [ ] **Role Guard**: Use `useUser()` for role-based rendering (admin vs student views)
- [ ] **Page Title**: Call `useDocumentTitle("Page Name")` in the route component

---

## Key Patterns

### Form Handling

All forms use **React Hook Form** with **Zod** resolvers. The pattern is:

1. Define a Zod schema in `features/<name>/lib/`
2. Export the inferred type: `type FormData = z.infer<typeof schema>`
3. Use `useForm<FormData>({ resolver: zodResolver(schema) })`
4. Compose with shadcn `<Form>`, `<FormField>`, `<FormItem>`, `<FormLabel>`, `<FormControl>`, `<FormMessage>`

```tsx
const form = useForm<ContactData>({
  resolver: zodResolver(contactSchema),
  defaultValues: { email: "", phoneNumber: "" },
})

<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <FormField control={form.control} name="email" render={({ field }) => (
      <FormItem>
        <FormLabel>Email</FormLabel>
        <FormControl><Input {...field} /></FormControl>
        <FormMessage />
      </FormItem>
    )} />
  </form>
</Form>
```

### Multi-Step Forms

Multi-step forms use local `useState` in the route component. Each step is a separate component that receives `onNext(data)` and `onBack()` callbacks.

```tsx
// Route component manages step state
const [step, setStep] = useState(0)
const [stepOneData, setStepOneData] = useState<StepOneData | null>(null)

// Step components are self-contained forms
<StepOne
  defaultValues={stepOneData ?? undefined}
  onNext={(data) => { setStepOneData(data); setStep(1) }}
/>
<StepTwo
  onNext={(data) => { /* ... */ setStep(2) }}
  onBack={() => setStep(0)}
/>
```

### Role-Based Rendering

Use `useUser()` to conditionally render UI based on the current role:

```tsx
const { role } = useUser()

// Conditional page content
if (role === "admin") return <AdminDashboard />
return <StudentDashboard />

// Conditional sidebar items
const navItems = role === "admin"
  ? [{ title: "Applications", url: "/applications" }, ...]
  : [{ title: "My Schedule", url: "/schedule" }, ...]
```

### Styling Conventions

- **Utility-first**: Tailwind classes directly on elements
- **Class merging**: Use `cn()` from `lib/utils.ts` for conditional classes
- **Component variants**: Use `class-variance-authority` (CVA) for component variant props
- **Spacing**: Use `space-y-*` for vertical stacking, `gap-*` for flex/grid
- **Responsive**: Mobile-first with `sm:`, `md:`, `lg:` breakpoints
- **Dark mode**: Pair light and dark classes — `text-blue-600 dark:text-blue-400`
- **Semantic colors**: Prefer `text-muted-foreground`, `bg-card`, `border` over raw colors
- **shadcn/ui**: Always check existing components before building custom UI. Install new ones via `npx shadcn@latest add <component>`

### Toasts

Use `sonner` for toast notifications:

```tsx
import { toast } from "sonner"

toast.success("Payment processed")
toast.error("Failed to save changes")
```

### Formatting Utilities

Date and time formatting helpers live in `lib/format.ts`:

```tsx
import { formatDateMedium, formatHour, formatDateRange } from "@/lib/format"

formatHour("08:00:00")           // "8 AM"
formatDateMedium("2025-02-17")   // "Feb 17, 2025"
formatDateRange("2025-02-03", "2025-02-16") // "Feb 3 – Feb 16, 2025"
```
