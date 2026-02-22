# Frontend

React SPA for the Help Desk Rostering application. Dual-role UI serving both admin and student views.

## Quick Start

```bash
# Via Docker (from project root)
task start

# Local development
cd apps/frontend
pnpm install
pnpm dev
```

http://localhost:5173

## Tech Stack

| | |
|---|---|
| **Framework** | React 19, TypeScript |
| **Routing** | TanStack Router (file-based) |
| **Styling** | Tailwind CSS 4, shadcn/ui, Radix UI |
| **Forms** | React Hook Form + Zod validation |
| **Tables** | TanStack Table |
| **Drag & Drop** | dnd-kit |
| **Build** | Vite |

## Project Structure

```
src/
├── routes/              # File-based routing (TanStack Router)
│   ├── __root.tsx       # Root layout
│   ├── _app.tsx         # Authenticated layout
│   ├── _app/            # Admin + student pages
│   ├── _auth.tsx        # Auth layout (sign-up, login)
│   └── _auth/           # Auth pages
├── features/            # Feature modules
│   ├── admin/           # Admin dashboard, schedules, shifts
│   ├── student/         # Student dashboard, availability
│   └── sign-up/         # Multi-step application form
├── components/          # Shared + shadcn/ui components
├── hooks/               # Custom React hooks (useUser, useTheme)
├── types/               # TypeScript interfaces
├── lib/                 # Utilities, constants, mock data
└── schemas/             # Zod validation schemas
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server (:5173) |
| `pnpm build` | Production build + type check |
| `pnpm preview` | Preview production build |
| `pnpm db:studio` | Open Drizzle Studio |

## Development Guide

See [DEVELOPMENT.md](DEVELOPMENT.md) for architecture patterns, form handling, role-based rendering, and a step-by-step feature implementation walkthrough.
