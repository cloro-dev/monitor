# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development
pnpm dev                 # Start development server with Turbopack
pnpm build               # Generate Prisma client and build for production
pnpm start               # Start production server
pnpm lint                # Run ESLint

# Database
pnpm db:migrate          # Run database migrations
pnpm db:studio           # Open Prisma Studio for database management
pnpm db:generate         # Generate Prisma client
pnpm db:push             # Push schema changes to database
pnpm db:pull             # Pull schema from database
pnpm db:reset            # Reset database (remove volumes and restart)
pnpm db:up               # Start database containers
pnpm db:down             # Stop database containers
pnpm db:logs             # View database logs
```

## Architecture Overview

This is a Next.js 16 application using the App Router architecture with:

- **Authentication**: Better Auth with email/password and PostgreSQL adapter
- **Database**: Prisma with PostgreSQL (Rust-Free Engine)
- **UI**: shadcn/ui components with Tailwind CSS
- **Styling**: Tailwind CSS v4 with dark/light theme support

### Key Directory Structure

```json
├── app/                  # Next.js App Router
│   ├── (dashboard)/     # Protected route group (requires auth)
│   ├── api/             # API routes
│   ├── login/           # Public auth pages
│   └── signup/
├── components/          # React components
│   ├── ui/             # shadcn/ui base components
│   ├── auth/           # Authentication forms
│   └── app-sidebar.tsx # Dashboard navigation
├── lib/                # Core utilities and configuration
│   ├── auth.ts         # Server-side Better Auth configuration
│   └── auth-client.ts  # Client-side auth client
├── hooks/              # Custom React hooks
└── prisma/             # Database schema and migrations
```

## Authentication Architecture

### Server-side (`/lib/auth.ts`)

- Uses Better Auth with Prisma PostgreSQL adapter
- Session management with JWT tokens
- Configuration for email/password authentication

### Client-side (`/lib/auth-client.ts`)

- React client using `createAuthClient`
- Handles sign in, sign up, and session management
- Type-safe authentication operations

### Auth Routes

- `/api/auth/[...all]/route.ts` - Better Auth catch-all handler
- Protected routes use dashboard layout middleware for session validation

## Database Setup

### Prisma Schema

- **Models**: `user`, `account`, `session`, `verification`
- **Provider**: PostgreSQL with PrismaPg adapter
- **Generated client**: Output to `/src/generated/prisma/client`
- **Environment**: `DATABASE_URL` required

### Access Patterns

```typescript
// Server components and API routes
const prisma = global.prisma || new PrismaClient({ adapter });

// Session checking in API routes
const session = await auth.api.getSession({ headers: await headers() });
```

## Component Architecture

### UI Components

- Based on shadcn/ui with Radix UI primitives
- Uses `cn()` utility for className merging (tailwind-merge + clsx)
- Icon libraries: Tabler Icons and Lucide React
- Responsive design with mobile-first approach

### Component Patterns

- Default to server components (no "use client")
- Use client components for forms, state management, and browser APIs
- Authentication forms in `/components/auth/`
- Reusable UI components in `/components/ui/`

## Route Structure

### Public Routes

- `/` - Landing page
- `/login` - Login page
- `/signup` - Registration page

### Protected Routes

- `/dashboard/*` - All routes under `(dashboard)` group require authentication
- Dashboard layout handles session validation and redirects

### API Routes

- `/api/auth/*` - Better Auth endpoints
- Server-side only with full Prisma access

## Development Patterns

### TypeScript

- Strict TypeScript configuration
- Generated types from Prisma
- Better Auth provides built-in type definitions

### Styling

- Tailwind CSS v4 with CSS variables for theming
- Component variants using `class-variance-authority`
- Dark/light theme support via `next-themes`

### State Management

- React hooks for local state
- Better Auth client for authentication state
- No global state management library

## Build Process

The build process runs `npx prisma generate` before `next build` to ensure the Prisma client is up to date. The application uses Turbopack for faster development builds.

## Environment Setup

Copy `.env.example` to `.env` and configure:

- `DATABASE_URL` - PostgreSQL connection string
- `BETTER_AUTH_SECRET` - Authentication secret key
- `BETTER_AUTH_URL` - Base URL for auth callbacks
