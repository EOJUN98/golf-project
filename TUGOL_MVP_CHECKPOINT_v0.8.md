# TUGOL MVP Development Checkpoint (v0.8)

**Project:** TUGOL - Dynamic Pricing Golf Booking App
**Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS, Supabase
**Current Version:** v0.8 (User Flow Complete)
**Date:** 2026-01-12

---

## 1. Project Status (Overview)
- **Phase 1 (Core Logic):** ✅ Complete
  - Pricing Engine: Seeded Random (determinism), Rain Blocking, Panic Mode implemented.
- **Phase 2 (DB Setup):** ✅ Complete
  - Supabase connected. Tables (`tee_times`, `reservations`, `golf_clubs`) created.
  - Smart Fallback: App works with Mock Data if DB fails.
- **Phase 3 (Booking Flow):** ✅ Complete
  - User can view details, confirm booking, and data is inserted into DB.
  - Hotfix applied: `discount_breakdown` column added to `reservations`.
- **Phase 4 (My Reservations):** ✅ Complete
  - Page: `/app/reservations/page.tsx`
  - Function: Fetches user's booking history with Join query (Reservations + TeeTimes).

---

## 2. Database Schema (Supabase)
**Tables & Key Columns:**
- **`tee_times`**: `id`, `tee_off` (Timestamp), `base_price`, `status` ('OPEN', 'BOOKED', 'BLOCKED'), `weather_condition` (JSONB), `golf_club_id` (FK).
- **`reservations`**: `id`, `final_price`, `discount_breakdown` (JSONB), `user_id`, `tee_time_id` (FK), `created_at`.
- **`golf_clubs`**: `id`, `name`, `location_name`.

**Security (RLS):**
- Public Read enabled for `tee_times` and `reservations` (for MVP testing).

---

## 3. Key Files & Logic
- **`utils/pricingEngine.ts`**:
  - `calculateDynamicPrice(teeTime, weather)`: Returns final price & discount logic.
  - **Rules**: Rain (>10mm) -> Block / Imminent (<1h) -> Panic Discount.
- **`app/page.tsx`**: Main dashboard showing Tee Time cards.
- **`app/reservations/page.tsx`**: User's booking history list.
- **`lib/supabase.ts`**: Supabase client configuration.

---

## 4. How to Restart (Context Load)
If the AI context is lost, provide this file and instruct:
"We are at v0.8. The User Flow is complete.
Current task: Proceed to Phase 5 (Admin Dashboard).
Do not regenerate existing code unless requested for debugging."