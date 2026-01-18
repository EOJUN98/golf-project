# TUGOL MVP Development Checkpoint (v0.9)

**Project:** TUGOL - Dynamic Pricing Golf Booking App
**Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS, Supabase
**Current Version:** v0.9 (MY Page & Navigation Complete)
**Date:** 2026-01-18

---

## 1. Project Status (Overview)

### Phase 1: Core Logic ✅ Complete
- Pricing Engine: Seeded Random (determinism), Rain Blocking, Panic Mode
- Multi-factor discounts: Weather, Time, LBS, Segment
- 40% discount cap with revenue protection

### Phase 2: Database Setup ✅ Complete
- Supabase connected with all tables created
- Tables: `tee_times`, `reservations`, `golf_clubs`, `users`, `user_stats`, `user_memberships`, `user_payment_methods`, `user_gifts`, `rounds`, `course_notices`
- Smart Fallback: App works with Mock Data if DB fails
- Row Level Security (RLS) configured for MVP testing

### Phase 3: Booking Flow ✅ Complete
- User can view tee time details, confirm booking
- Data inserted into `reservations` and `tee_times` tables
- `discount_breakdown` JSONB column stores all discount factors
- Toss Payments integration ready (test mode)

### Phase 4: My Reservations ✅ Complete
- Page: `/app/my/reservations/page.tsx`
- Fetches user's booking history with JOIN queries
- Individual reservation detail page: `/app/my/reservations/[id]/page.tsx`
- Weather forecast, course notices, cancellation policy display

### Phase 5: MY Page & Navigation ✅ Complete
- **Bottom Navigation**: 3-tab fixed bottom nav (홈/예약/MY)
- **MY Main Page** (`/app/my/page.tsx`):
  - Profile Tab: Segment badges, golf skills, round stats
  - Membership Tab: Tier, points/mileage, payment methods, gifts
  - Rounds Tab: Round history with expandable scorecard details
- **Enhanced Reservation Detail**: Course map, hole info, strategy tips
- **Database Migration**: Added `total_bookings`, `total_spent`, `avg_booking_value`, `is_suspended` to users table

### SDD-10 Implementation ✅ Complete
- User Segment System: PRESTIGE, SMART, CHERRY, FUTURE
- No-Show Risk Scoring with consecutive tracking
- Dynamic Discount System based on segment + risk score
- Segment calculation includes: spending, frequency, no-shows, cancellations

---

## 2. Database Schema (Supabase)

### Core Tables

#### `tee_times`
```sql
id BIGSERIAL PRIMARY KEY
tee_off TIMESTAMPTZ NOT NULL
base_price INTEGER NOT NULL
status VARCHAR(20) DEFAULT 'OPEN' -- 'OPEN', 'BOOKED', 'BLOCKED'
weather_condition JSONB
golf_club_id BIGINT REFERENCES golf_clubs(id)
reserved_by VARCHAR(255) -- user_id when booked
reserved_at TIMESTAMPTZ
```

#### `reservations`
```sql
id BIGSERIAL PRIMARY KEY
user_id VARCHAR(255) NOT NULL
tee_time_id BIGINT REFERENCES tee_times(id)
final_price INTEGER NOT NULL
discount_breakdown JSONB -- { weather, time, lbs, segment, total }
agreed_penalty BOOLEAN DEFAULT false
payment_status VARCHAR(20) DEFAULT 'PENDING'
created_at TIMESTAMPTZ DEFAULT NOW()
updated_at TIMESTAMPTZ
```

#### `golf_clubs`
```sql
id BIGSERIAL PRIMARY KEY
name VARCHAR(255) NOT NULL
location_name VARCHAR(255)
latitude DECIMAL(10, 8)
longitude DECIMAL(11, 8)
avg_rating DECIMAL(3, 2)
total_reviews INTEGER
description TEXT
facilities JSONB
course_map_url TEXT
hole_details JSONB -- Array of hole info
```

### User & Stats Tables (SDD-10)

#### `users`
```sql
id VARCHAR(255) PRIMARY KEY
email VARCHAR(255) UNIQUE NOT NULL
name VARCHAR(255)
phone VARCHAR(20)
segment_type VARCHAR(20) -- PRESTIGE, SMART, CHERRY, FUTURE
segment_score DECIMAL(7, 2)
no_show_count INTEGER DEFAULT 0
no_show_risk_score DECIMAL(5, 2) DEFAULT 0
consecutive_no_shows INTEGER DEFAULT 0
total_cancellations INTEGER DEFAULT 0
cancellation_rate DECIMAL(5, 2) DEFAULT 0
total_bookings INTEGER DEFAULT 0
total_spent INTEGER DEFAULT 0
avg_booking_value DECIMAL(10, 2) DEFAULT 0
is_suspended BOOLEAN DEFAULT false
location JSONB -- { lat, lng, address }
created_at TIMESTAMPTZ DEFAULT NOW()
```

#### `user_stats`
```sql
id BIGSERIAL PRIMARY KEY
user_id VARCHAR(255) REFERENCES users(id)
handicap DECIMAL(4, 1)
handicap_trend VARCHAR(20) -- IMPROVING, STABLE, DECLINING
avg_score DECIMAL(5, 2)
driving_distance INTEGER
fairway_accuracy DECIMAL(5, 2)
gir_rate DECIMAL(5, 2)
total_rounds INTEGER DEFAULT 0
completed_rounds INTEGER DEFAULT 0
best_score INTEGER
avg_booking_lead_time INTEGER
```

#### `user_memberships`
```sql
id BIGSERIAL PRIMARY KEY
user_id VARCHAR(255) REFERENCES users(id)
membership_type VARCHAR(20) -- GOLD, SILVER, BRONZE, FREE
tier_level INTEGER DEFAULT 1
points_balance INTEGER DEFAULT 0
points_lifetime INTEGER DEFAULT 0
valid_until TIMESTAMPTZ
created_at TIMESTAMPTZ DEFAULT NOW()
```

#### `user_payment_methods`
```sql
id BIGSERIAL PRIMARY KEY
user_id VARCHAR(255) REFERENCES users(id)
payment_type VARCHAR(50)
masked_number VARCHAR(50)
nickname VARCHAR(100)
is_default BOOLEAN DEFAULT false
is_active BOOLEAN DEFAULT true
created_at TIMESTAMPTZ DEFAULT NOW()
```

#### `user_gifts`
```sql
id BIGSERIAL PRIMARY KEY
user_id VARCHAR(255) REFERENCES users(id)
gift_type VARCHAR(50)
gift_name VARCHAR(255)
discount_rate INTEGER
gift_value INTEGER
valid_until TIMESTAMPTZ
is_used BOOLEAN DEFAULT false
used_at TIMESTAMPTZ
```

#### `rounds`
```sql
id BIGSERIAL PRIMARY KEY
user_id VARCHAR(255) REFERENCES users(id)
golf_club_id BIGINT REFERENCES golf_clubs(id)
played_at TIMESTAMPTZ
total_score INTEGER
front_nine INTEGER
back_nine INTEGER
tee_box VARCHAR(50)
fairways_hit INTEGER
greens_in_regulation INTEGER
total_putts INTEGER
weather_condition VARCHAR(50)
wind_speed INTEGER
temperature INTEGER
notes TEXT
playing_partners TEXT[]
```

#### `course_notices`
```sql
id BIGSERIAL PRIMARY KEY
golf_club_id BIGINT REFERENCES golf_clubs(id)
notice_type VARCHAR(50) -- MAINTENANCE, TOURNAMENT, CLOSURE
severity VARCHAR(20) -- INFO, WARNING, CRITICAL
title VARCHAR(255)
description TEXT
start_date TIMESTAMPTZ
end_date TIMESTAMPTZ
created_at TIMESTAMPTZ DEFAULT NOW()
```

### Discount Tables (SDD-10)

#### `dynamic_discounts`
```sql
id BIGSERIAL PRIMARY KEY
discount_type VARCHAR(50) -- WEATHER, TIME_OF_DAY, LAST_MINUTE, SEGMENT
segment_type VARCHAR(20) -- NULL for non-segment discounts
discount_rate INTEGER
min_risk_score DECIMAL(5, 2)
max_risk_score DECIMAL(5, 2)
is_active BOOLEAN DEFAULT true
valid_from TIMESTAMPTZ
valid_until TIMESTAMPTZ
```

---

## 3. Key Files & Logic

### Pricing Engine
**File:** `/utils/pricingEngine.ts`

**Core Function:**
```typescript
calculateDynamicPrice(teeTime, weather, options?: {
  userSegment?: string
  userLocation?: { lat: number; lng: number }
  golfClubLocation?: { lat: number; lng: number }
})
```

**Discount Logic:**
1. **Weather Discount** (up to 20%)
   - Rain ≥60%: 20% discount
   - Cloudy 30-59%: 10% discount
   - Blocks tee time if rainfall ≥10mm

2. **Time-Based Discount** (deterministic, seeded random)
   - Uses tee time timestamp as seed for consistent pricing
   - Stepped discounts across 3 time zones

3. **LBS Discount** (10%)
   - If user within 15km of golf club

4. **Segment Discount** (up to 5%)
   - PRESTIGE users: 5% additional discount

5. **Panic Mode** (imminent booking)
   - Triggers if booking < 1 hour before tee off
   - Visual urgency indicators

**Revenue Protection:** Total discount capped at 40%

### Authentication & Demo Mode
**File:** `/lib/auth/getCurrentUserWithRoles.ts`

**DEMO MODE Support:**
```typescript
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

if (DEMO_MODE) {
  const demoEmail = process.env.NEXT_PUBLIC_DEMO_USER_EMAIL;
  // Fetch demo user from database
}
```

### Navigation Architecture

#### Bottom Navigation
**File:** `/components/BottomNav.tsx`
- Fixed bottom position (z-50)
- 3 tabs: 홈 (`/`), 예약 (`/my/reservations`), MY (`/my`)
- Active state detection with usePathname()
- Smooth routing with Next.js router

#### MY Page Structure
**File:** `/app/my/page.tsx` (Server Component)
- Fetches all user data server-side
- Passes data to MyPageTabs client component

**File:** `/components/my/MyPageTabs.tsx` (Client Component)
- Internal tab state management
- 3 tabs: 프로필, 멤버십, 라운드
- Conditional rendering of tab content

**Files:** Tab Components
- `/components/my/ProfileTab.tsx` - Segment badges, golf skills, risk score
- `/components/my/MembershipTab.tsx` - Tier, points, payment methods, gifts
- `/components/my/RoundsTab.tsx` - Round history with expandable details

### Weather Integration
**File:** `/utils/weather.ts`

**API:** Korean Meteorological Administration VilageFcst
- Grid coordinates: (54, 123) for Incheon Club 72
- 3-hour forecast blocks
- Extracts POP (precipitation probability) and rainfall amount
- 10-minute cache: `next: { revalidate: 600 }`

### Payment Flow
**Files:**
- `/components/BookingModal.tsx` - Toss Payment Widget
- `/app/api/payments/confirm/route.ts` - Payment confirmation

**Flow:**
```
[BookingModal] → [Toss SDK] → [Toss Server] →
[/api/payments/confirm] → [Supabase] → [Success Page]
```

---

## 4. Environment Variables Required

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...

# Toss Payments (Test Mode)
NEXT_PUBLIC_TOSS_CLIENT_KEY=test_ck_...
TOSS_SECRET_KEY=test_sk_...

# Weather API
WEATHER_API_KEY=your_kma_api_key
GRID_X=54
GRID_Y=123

# Demo Mode
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_DEMO_USER_EMAIL=vip_user@tugol.dev
```

---

## 5. Recent Implementations (Phase 5)

### Files Created
1. `/components/BottomNav.tsx` - Fixed bottom navigation
2. `/app/my/page.tsx` - MY main page server component
3. `/components/my/MembershipTab.tsx` - Membership section
4. `/components/my/RoundsTab.tsx` - Round history section
5. `/supabase/migrations/20260118_add_user_spending_fields.sql` - User spending fields migration
6. `/IMPLEMENTATION_MY_PAGE_NAV.md` - Complete implementation documentation

### Files Modified
1. `/app/layout.tsx` - Added BottomNav globally with pb-16 spacing
2. `/components/my/MyPageTabs.tsx` - Changed to container component with internal state
3. `/components/my/ProfileTab.tsx` - Updated props for UserWithRoles, added null-safety
4. `/components/my/ReservationDetailClient.tsx` - Added course map, hole details, strategy tips

### Database Migrations Run
1. `20260117_sdd10_noshow_segments_datadiscounts.sql` - SDD-10 full schema
2. `20260118_add_user_spending_fields.sql` - User spending/booking fields

---

## 6. UI/UX Patterns

### Color Scheme
- **Primary Green:** `bg-green-600`, `text-green-600` (main actions, success)
- **Gray Scale:** `bg-gray-50`, `text-gray-600` (neutral UI)
- **Segment Colors:**
  - PRESTIGE: Purple gradient (`from-purple-600 to-purple-800`)
  - SMART: Blue gradient (`from-blue-600 to-blue-800`)
  - CHERRY: Pink gradient (`from-pink-600 to-pink-800`)
  - FUTURE: Gray gradient (`from-gray-600 to-gray-800`)

### Component Patterns
- **Cards:** `rounded-2xl` with `shadow-sm` or `shadow-lg`
- **Active States:** Green border-bottom + background highlight
- **Badges:** Gradient backgrounds for segments/membership
- **Expandable Cards:** useState for collapse/expand with ChevronDown/ChevronUp
- **Empty States:** Trophy icon, helpful message, CTA button

### Mobile Optimization
- Bottom nav sticky with z-50
- Horizontal scroll for tabs (hidden scrollbar)
- Touch-friendly tap targets (min 44px height)
- Responsive grid layouts

---

## 7. Development Commands

```bash
# Development
npm run dev           # Start dev server (http://localhost:3000)
npm run build         # Production build with TypeScript checking
npm start             # Run production build
npm run lint          # ESLint check

# Database
# Run migrations manually via Supabase Dashboard SQL Editor
# Or use Supabase CLI:
supabase db push
```

---

## 8. Testing Checklist (Current Features)

### Navigation
- [ ] Bottom nav visible on all pages
- [ ] Active tab highlights correctly
- [ ] Browser back/forward works
- [ ] All 3 tabs route correctly

### MY Page
- [ ] Profile tab shows segment badge and stats
- [ ] Membership tab displays tier and points
- [ ] Rounds tab lists history with expandable details
- [ ] Empty states show when no data
- [ ] Tab switching works smoothly

### Reservations
- [ ] Reservation list shows all user bookings
- [ ] Detail page displays course info, weather, notices
- [ ] Course map renders if URL exists
- [ ] Cancel/modify buttons work (placeholder)

### Booking Flow
- [ ] Tee time cards display correct prices
- [ ] Date selector changes reload data
- [ ] Booking modal opens and shows Toss widget
- [ ] Payment success updates database
- [ ] Reservation appears in MY > 예약

### DEMO MODE
- [ ] All pages accessible without login
- [ ] Demo user data loads correctly
- [ ] No auth errors in console

---

## 9. Known Limitations (MVP Phase)

- **Authentication:** Hardcoded demo user in DEMO_MODE (needs real auth)
- **Payment Methods:** Skeleton implementation (no real PG integration)
- **Gifts/Vouchers:** Skeleton data (no redemption logic)
- **Course Map:** Requires manual URL entry in database
- **Hole Details:** Requires JSONB data entry
- **Round Records:** Manual entry (no automatic score import)
- **Refund Flow:** No automated refund API
- **Admin Dashboard:** Not yet implemented
- **Testing:** No unit/integration tests

---

## 10. Next Steps (Recommended)

### Immediate Priorities
1. **Admin Dashboard** - Course management, reservation monitoring
2. **Real Authentication** - Implement Supabase Auth or NextAuth
3. **Payment Method Integration** - Connect real payment gateway
4. **Course Data Entry** - Populate golf_clubs with real courses
5. **Automated Testing** - Add unit tests for pricing engine, API routes

### Future Enhancements
1. **Mobile App** - React Native version
2. **Real-time Updates** - WebSocket for live tee time updates
3. **Push Notifications** - Booking confirmations, weather alerts
4. **Social Features** - Friend invites, group bookings
5. **Analytics Dashboard** - User behavior tracking, revenue metrics
6. **SEO Optimization** - Meta tags, sitemap, structured data

---

## 11. How to Restart (Context Load)

If AI context is lost, provide this file and instruct:

> "We are at **v0.9**. The MY page and bottom navigation are complete.
> Current status: All user-facing features implemented (booking flow, my reservations, MY page with profile/membership/rounds).
> **Next recommended task:** Admin Dashboard implementation.
> Do not regenerate existing code unless requested for debugging or feature additions."

---

## 12. Documentation Files

- **`CLAUDE.md`** - Project overview, architecture patterns, development guide
- **`IMPLEMENTATION_MY_PAGE_NAV.md`** - Phase 5 implementation details
- **`SDD-10_IMPLEMENTATION_SUMMARY.md`** - User segment system documentation
- **`README-DEMO-MODE.md`** - Demo mode setup and usage
- **`TUGOL_MVP_CHECKPOINT_v0.9.md`** - This file (current state)

---

## 13. Git Status Snapshot

```
M  app/admin/page.tsx
M  app/reservations/page.tsx
?? TUGOL_MVP_CHECKPOINT_v0.7.md
?? TUGOL_MVP_CHECKPOINT_v0.8.md
?? TUGOL_MVP_CHECKPOINT_v0.9.md

Recent Commits:
6cb65a4 feat: Add My Reservations page (Phase 4)
aff8fba docs: Add Phase 3 booking flow completion guide
dde020c feat: Implement booking flow with reservation system (Phase 3)
0d4ffb8 docs: Add Phase 2 completion summary and setup guide
69a9bf1 feat: Add Supabase database integration (Phase 2)
```

---

**Last Updated:** 2026-01-18
**Version:** 0.9
**Status:** ✅ MY Page & Navigation Complete
**Developer:** Claude Code (Anthropic)
