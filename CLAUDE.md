# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Eden Living is a Next.js 15.5 application for senior living community management with:
- **Frontend**: Next.js 15.5 with App Router, TypeScript, Tailwind CSS
- **Authentication**: Supabase integration (client-side ready, currently using mock auth)
- **Styling**: Tailwind CSS with Radix UI components
- **State Management**: React Context for authentication

## Development Commands

```bash
# Start development server with Turbopack
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run ESLint
npm run lint
```

## Architecture

### Key Directories
- `src/app/` - Next.js App Router pages and layouts
- `src/components/ui/` - Reusable UI components (Radix UI based)
- `src/contexts/` - React Context providers (AuthContext)
- `src/lib/` - Utility libraries (Supabase client/server)
- `src/types/` - TypeScript type definitions

### Authentication Flow
- Uses `AuthContext` with mock users for demo (admin@eden.com/resident@eden.com, password: password123)
- Ready for Supabase integration via `src/lib/supabase/client.ts`
- User data stored in localStorage for persistence

### Data Models (src/types/database.ts)
- **Profile**: User accounts with roles (resident/admin/staff)
- **ServiceRequest**: Service requests with types (meal, laundry, housekeeping, etc.)
- **Announcement**: Community announcements
- **Event**: Calendar events and registrations
- **BillingRecord**: Financial records and payments

### UI Components
- Built with Radix UI primitives
- Styled with Tailwind CSS
- Component library in `src/components/ui/`

## Environment Setup

Required environment variables for Supabase integration:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## Development Notes

- Current authentication is mocked - ready for Supabase integration
- All pages use TypeScript strict mode
- Tailwind CSS with custom design system
- Responsive design with mobile-first approach
- App Router with client/server component separation