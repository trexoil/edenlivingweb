# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Eden Living is a Next.js 15.5 application for senior living community management featuring:

- **Frontend**: Next.js 15.5 with App Router, React 19.1, TypeScript
- **UI Framework**: Tailwind CSS 4.x with Radix UI components (shadcn/ui)
- **Authentication**: Supabase integration with fallback mock authentication
- **Backend**: Next.js API Routes with Supabase as backend-as-a-service
- **Payments**: Stripe integration
- **Styling**: Tailwind CSS with custom design system and theme support

## Architecture

This is a full-stack Next.js application using the App Router pattern with:

- **Client-Server Architecture**: React Server Components + Client Components
- **Database**: Supabase (PostgreSQL) with real-time subscriptions
- **Authentication**: Custom AuthContext with Supabase Auth + localStorage persistence
- **Multi-tenancy**: Site-based isolation with role-based access control
- **State Management**: React Context for auth, local state for components
- **API Layer**: Next.js API Routes in `src/app/api/`

### Role-Based Access Control

The application supports multiple user roles:
- `superadmin`: Full system access, can manage all sites
- `site_admin`: Manages a single site
- `admin`: Site-level administrative access
- `staff`: Staff access to site operations
- `resident`: End-user access to services

### Authentication Flow

1. **Mock Authentication** (Development): Hardcoded credentials for testing
   - `superadmin@eden.com` / `password123` → Superadmin dashboard
   - `siteadmin@eden.com` / `password123` → Site admin dashboard
   - `admin@eden.com` / `password123` → Regular dashboard
   - `resident@eden.com` / `password123` → Regular dashboard

2. **Supabase Authentication** (Production): Standard email/password with profile creation
3. **Session Persistence**: localStorage for demo users, Supabase session for real users
4. **Route Protection**: Role-based redirects in AuthContext and middleware (currently disabled)

## Development Commands

```bash
# Start development server with Turbopack
npm run dev

# Build for production (with build error ignoring enabled)
npm run build

# Start production server
npm run start

# Run ESLint
npm run lint
```

## Environment Setup

### Prerequisites
- Node.js (latest LTS recommended)
- npm or yarn
- Supabase account (optional for development)

### Required Environment Variables
```env
# Supabase (optional for development, mock auth will work without these)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Stripe (for payment features)
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

### Installation
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## Directory Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth route group (login, register)
│   ├── api/               # API routes
│   ├── dashboard/         # Resident/Admin dashboard pages
│   ├── siteadmin/         # Site Admin interface
│   ├── superadmin/        # Super Admin interface
│   ├── layout.tsx         # Root layout with providers
│   └── page.tsx           # Landing page
├── components/            # React components
│   ├── ui/                # shadcn/ui components
│   ├── announcements/     # Announcement-specific components
│   ├── debug/             # Development debugging components
│   ├── siteadmin/         # Site admin components
│   └── superadmin/        # Super admin components
├── contexts/              # React Context providers
│   ├── AuthContext.tsx    # Main authentication context
│   └── SimpleAuthContext.tsx  # Alternative auth context
├── hooks/                 # Custom React hooks
├── lib/                   # Utility libraries
│   ├── supabase/          # Supabase client/server utilities
│   ├── auth/              # Authentication helpers
│   ├── middleware/        # Middleware utilities
│   └── utils.ts           # General utilities (cn helper)
└── types/
    └── database.ts        # TypeScript type definitions
```

## Data Models

Core entities defined in `src/types/database.ts`:

| Model | Key Fields | Purpose |
|-------|-----------|---------|
| Profile | id, email, role, site_id, first_name, last_name | User accounts with role-based access |
| ServiceRequest | id, resident_id, type, status, priority | Service requests (meals, laundry, etc.) |
| Announcement | id, site_id, title, content, priority | Community announcements |
| Event | id, site_id, title, event_date, location | Calendar events and activities |
| BillingRecord | id, resident_id, amount, due_date, status | Financial records and payments |
| HelpDeskTicket | id, resident_id, title, status, category, priority | Support tickets system |
| Site | id, name, address, total_units, available_services | Multi-tenant site management |

### Service Request Types
- `meal`, `laundry`, `housekeeping`, `transportation`, `maintenance`, `home_care`, `medical`

### User Roles Hierarchy
- `superadmin` > `site_admin` > `admin` > `staff` > `resident`

## Key Configuration Files

- `next.config.ts`: Build errors and ESLint are ignored during builds
- `components.json`: shadcn/ui configuration with New York style
- `tsconfig.json`: TypeScript configuration with strict mode
- `middleware.ts`: Currently disabled, authentication handled in AuthContext

## Development Notes

### Authentication System
- The app uses `SimpleAuthContext` (referenced in layout.tsx) vs `AuthContext`
- Mock authentication is enabled for development with hardcoded credentials
- Supabase integration is ready but uses fallback mock data when unavailable
- Global auth state prevents re-initialization between route changes

### UI Components
- Built with Radix UI primitives and Tailwind CSS
- Custom component library in `src/components/ui/`
- Theme support with `next-themes`
- Toast notifications with Sonner

### API Structure
- RESTful API routes in `src/app/api/`
- Organized by feature (announcements, billing, events, etc.)
- Mobile-specific endpoints in `api/mobile/`
- Admin endpoints in `api/admin/`

### Build Configuration
- TypeScript build errors are ignored (`ignoreBuildErrors: true`)
- ESLint errors are ignored during builds (`ignoreDuringBuilds: true`)
- Turbopack enabled for faster development and builds

### Testing
- No test setup currently configured
- Recommend adding Jest or Vitest for unit tests
- Consider Playwright for E2E testing

### Deployment Considerations
- Built for Vercel deployment (standard Next.js app)
- Environment variables need to be set in deployment environment
- Database migrations handled through Supabase dashboard or CLI