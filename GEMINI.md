# GEMINI.md - TUGOL Golf Booking App

## Project Overview

TUGOL is a Next.js application for a golf tee-time booking service, featuring real-time availability, dynamic pricing, and a user segmentation system.

### Key Technologies
- **Frontend**: Next.js 14+ (React), Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Realtime)
- **Payments**: Toss Payments (Virtual payment mode implemented for dev)
- **Language**: TypeScript

## 🚀 Current Status (As of Jan 20, 2026)

### Operational Status
- **Supabase Migration**: Migration chain has been cleaned up and made idempotent. `supabase db push` should work, but there are issues with the Auth schema permissions.
- **Time Zone**: KST (Korea Standard Time) handling has been fixed in Admin dashboard and tee-time generation (9-hour offset correction).
- **Authentication**: **CRITICAL ISSUE**. Supabase Auth (`signInWithPassword`, `signUp`) is currently failing due to internal permission/configuration issues on the remote Supabase project.

### Feature Status (SDD-10 Complete)
The codebase now includes the implementation for **SDD-10** (System Design Document 10), adding:
1.  **No-Show Prevention**: Risk scoring based on history, penalty agreements, and booking restrictions.
2.  **User Segmentation**: Automatic `PRESTIGE`, `SMART`, `CHERRY`, `FUTURE` tiering based on RFM and loyalty.
3.  **Data-Driven Discounts**: Pricing adjustments based on vacancy rates, booking velocity, and segment synergy.
4.  **Virtual Payment**: A dev-friendly payment mode skipping the real PG for easier testing.
5.  **My Page**: Enhanced user dashboard with Profile, Reservation Details, and Statistics tabs.

## 📂 Key Recent Changes

### Database (`supabase/migrations/`)
- `20260117_sdd10_noshow_segments_datadiscounts.sql`: Major schema update for SDD-10.
- `20260119_rls_recursion_fix.sql`: Fix for infinite recursion in RLS policies.
- `20260114_base_schema.sql`: Consolidated base schema.

### Logic & Actions
- **Pricing**: `utils/pricingEngineSDD10.ts` (New data-driven engine).
- **Server Actions**: `app/actions/sdd10-actions.ts` (Risk calc, Virtual payment, Segment recalc).
- **Admin**: `app/admin/tee-times/` updated for KST.
- **Auth**: `lib/supabase/server.ts` and `app/login/actions.ts` standardized.

## ⚠️ Known Issues

1.  **Supabase Auth Failure**:
    - `signInWithPassword` returns `invalid_credentials`.
    - `signUp` fails with database errors regarding email checking.
    - Likely requires Supabase support intervention or a fresh project instance.

## 📅 Next Steps

1.  **Resolve Auth**: Contact Supabase support or provision a new Supabase project and re-apply migrations.
2.  **Database Sync**: Run `supabase db push` to apply the SDD-10 schema (`20260117...`).
3.  **Verification**:
    - Test Virtual Payment flow (`createVirtualReservation`).
    - Verify User Segmentation logic (`recalculateUserSegment`).
    - Check "My Page" UI components.

## Development Reference

### Build & Run
```bash
npm install
npm run dev
# App: http://localhost:3000
```

### Conventions
- **Pricing**: Logic in `utils/pricingEngine*.ts`.
- **DB Types**: `types/database.ts` (Base), `types/sdd10-database.ts` (New features).
- **Styling**: Tailwind CSS.