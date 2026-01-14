# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TUGOL is a dynamic golf reservation platform that implements sophisticated real-time pricing with multi-factor discounts (weather, time, location, user segment). Built with Next.js 16 App Router, Supabase, and Toss Payments.

## Development Commands

### Core Development
```bash
npm run dev           # Start dev server (http://localhost:3000)
npm run build         # Production build with TypeScript checking
npm start             # Run production build
npm run lint          # ESLint check
```

### Environment Setup
Requires `.env.local` with:
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_TOSS_CLIENT_KEY` / `TOSS_SECRET_KEY`
- `WEATHER_API_KEY` (Korean Meteorological Administration)
- `GRID_X=54` / `GRID_Y=123` (Incheon Club 72 coordinates)

## Architecture Patterns

### Pricing Engine - Deterministic Randomness

**Critical Pattern**: The pricing engine (`/utils/pricingEngine.ts`) uses seeded random generation to ensure:
- Same tee time always generates same price (no flickering on refresh)
- Reproducible discount schedules
- Pseudo-random appearance

```typescript
// Seed = tee time timestamp → consistent random for that slot
const getSeededRandom = (seed: number): number => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}
```

**Multi-Factor Discounts** (cumulative, max 40%):
1. **Weather**: 20% (rain ≥60%), 10% (cloudy 30-59%)
2. **Time**: Stepped discounts (3 stages, deterministic schedule)
3. **LBS**: 10% if user within 15km
4. **Segment**: 5% for PRESTIGE users

When implementing pricing features:
- Always use seeded random for new time-based logic
- Respect 40% revenue protection cap
- Update `breakdown` object for discount transparency

### Payment Flow Architecture

```
[BookingModal] → [Toss SDK] → [Toss Server] → [/api/payments/confirm] → [Supabase] → [Success Page]
```

**Key Implementation Details**:

1. **Widget Initialization** (`/components/BookingModal.tsx`):
   - Uses `useRef` to store widget instance (survives re-renders)
   - Cleans up on modal close to prevent memory leaks
   - Single `isReady` state instead of complex multi-state

2. **Success URL Pattern**:
   ```typescript
   successUrl: `/api/payments/confirm?tee_time_id=${teeTimeId}&user_id=${userId}`
   // Toss appends: &paymentKey=xxx&orderId=xxx&amount=xxx
   ```

3. **Backend Confirmation** (`/app/api/payments/confirm/route.ts`):
   - Confirms with Toss API using `TOSS_SECRET_KEY`
   - Atomically updates both `reservations` and `tee_times` tables
   - Implements rollback if partial transaction fails

4. **Metadata Transfer**: Uses `sessionStorage` to pass discount details to success page (not via URL params)

**When modifying payment flow**:
- Never skip Toss API confirmation (prevents fraud)
- Always check tee time availability before charging
- Handle rollbacks for partial failures
- Log payment keys for manual refund support

### Supabase Query Patterns

**Type-Safe Joins**:
```typescript
const { data } = await supabase
  .from('reservations')
  .select(`
    id, final_price,
    tee_times ( tee_off, base_price, golf_clubs ( name ) )
  `)
```

**Type Inference Workarounds**:
- For complex updates, use `(supabase as any)` when type inference fails
- Cast query results explicitly: `const data = result as TeeTime[] | null`

**Graceful Degradation**:
- Always wrap queries in try-catch
- Fall back to mock data on errors (prevents blank screens)
- Log errors for debugging

### Next.js 16 Specific Patterns

**Suspense Boundaries Required**:
```typescript
// Any component using useSearchParams() must be wrapped
function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  // ... logic
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <PaymentSuccessContent />
    </Suspense>
  )
}
```

**Server-First Data Fetching Architecture**:

The app uses a Server Component → Client Component split pattern for optimal performance:

```typescript
// app/page.tsx (Server Component - NO "use client")
export const dynamic = 'force-dynamic'; // Fresh data on every request

export default async function MainPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const resolvedParams = await searchParams;
  const date = resolvedParams.date ? new Date(resolvedParams.date) : new Date();

  // Server-side data fetching (instant, no loading spinner)
  const teeTimes = await getTeeTimesByDate(date);

  return <TeeTimeList initialTeeTimes={teeTimes} initialDate={date} />;
}
```

```typescript
// components/TeeTimeList.tsx (Client Component - has "use client")
export default function TeeTimeList({ initialTeeTimes, initialDate }: Props) {
  const [teeTimes, setTeeTimes] = useState(initialTeeTimes);
  const router = useRouter();

  // Update URL on date change
  const handleDateChange = (date: Date) => {
    const dateStr = date.toISOString().slice(0, 10);
    router.push(`/?date=${dateStr}`); // Triggers server re-fetch
  };

  // Refresh data after booking
  const handleBookingSuccess = () => {
    router.refresh(); // Re-runs server component
  };
}
```

**Hydration Mismatch Prevention Pattern**:

Client-only features (timers, random values, Date.now()) cause hydration mismatches. Use `mounted` state:

```typescript
const [mounted, setMounted] = useState(false);

useEffect(() => {
  setMounted(true); // Only runs in browser
}, []);

// Prevent hydration errors with client-only features
useEffect(() => {
  if (!mounted) return; // Skip on server
  const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
  return () => clearInterval(timer);
}, [mounted]);

if (!mounted) {
  return <Loader2 />; // Same as server render
}
```

**Why This Architecture**:
- Server Components: Instant data (no loading spinner), smaller JS bundle
- `router.push()` updates URL → triggers server re-fetch with new params
- `router.refresh()` re-runs server component without navigation
- `mounted` state prevents hydration errors from client-only code

**When to Use Each Pattern**:
- Server Component: Data fetching, static UI, database queries
- Client Component: State, effects, events, Toss SDK, timers, router navigation

## Database Schema

### tee_times (티타임 슬롯)
```typescript
id: number (PK)
tee_off: string (ISO 8601 timestamp)
base_price: number
status: 'OPEN' | 'BOOKED' | 'BLOCKED'
weather_condition: JSONB (optional snapshot)
reserved_by: string (user_id, optional)
reserved_at: string (timestamp, optional)
```

### reservations (예약 내역)
```typescript
id: number (PK)
user_id: string
tee_time_id: number (FK → tee_times)
final_price: number
discount_breakdown: JSONB { weather, time, lbs, segment }
agreed_penalty: boolean (우천 시 위약금 동의)
payment_status: 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED'
created_at: string
updated_at?: string
```

**Note**: Database schema includes optional fields for payment integration:
- `payment_key`, `order_id` may be added for Toss integration
- Current implementation focuses on reservation flow first

### users (Schema defined, not fully implemented)
```typescript
id, email, name, phone
user_segment: 'FUTURE' | 'PRESTIGE' | 'SMART' | 'CHERRY'
cherry_score: number (0-100)
location: JSONB { lat, lng, address }
visit_count, avg_stay_time
```

## Component Data Flow

### Main Page Architecture (`/app/page.tsx` → `/components/TeeTimeList.tsx`)

**Server Component** (`/app/page.tsx`):
```
Responsibilities:
  - Parse URL query params (date)
  - Fetch tee times from Supabase server-side
  - Pass initial data to client component
  - Re-render when URL changes (router.push)

Flow:
  URL ?date=2024-01-15 → getTeeTimesByDate(date) → <TeeTimeList initialTeeTimes={data} />
```

**Client Component** (`/components/TeeTimeList.tsx`):
```
State Management:
  mounted → prevents hydration mismatch
  selectedDate → controls DateSelector highlight
  selectedPart → filters by time (1부/2부/3부: morning/day/night)
  teeTimes → synced with initialTeeTimes prop
  isBookingModalOpen + selectedTeeTime → modal control
  showPanic → panic mode overlay toggle
  timeLeft → countdown timer (client-only)

Time Period Filtering (useMemo):
  - 1부 (part1): 05:00-11:00 (< 660 minutes)
  - 2부 (part2): 11:00-17:00 (660-1020 minutes)
  - 3부 (part3): 17:00-19:30 (≥ 1020 minutes)

  Uses totalMinutes (hour * 60 + minutes) for precise filtering

User Actions:
  Date change → router.push(`/?date=${newDate}`) → Server re-fetch
  Booking success → router.refresh() → Server re-fetch
  Time part toggle → Client-side filter only
```

### Date Selector (`/components/DateSelector.tsx`)
- Generates 14-day array from today
- Horizontal scroll with hidden scrollbar
- Selected date scales up (Tailwind: `scale-105`)
- Emits `onDateChange(date)` callback

### Booking Modal (`/components/BookingModal.tsx`)
**Props**:
```typescript
{
  isOpen: boolean
  onClose: () => void
  teeTime: TeeTimeWithPricing
  userId?: number
  userSegment?: string
  onSuccess?: () => void
}
```

**Widget Lifecycle**:
```typescript
useEffect(() => {
  if (!isOpen) {
    paymentWidgetRef.current = null
    setIsReady(false)
    return
  }
  initWidget() // Load Toss SDK
}, [isOpen, userId, finalPrice])
```

## API Routes

### `/api/reservations`
- **POST**: Create reservation (no payment) → Insert reservation + Update tee time
- **GET**: Fetch user's reservations with joins (`?userId=1`)

### `/api/payments/confirm`
- **POST**: Confirm Toss payment → Call Toss API → Create reservation + Update tee time
- Handles atomic transactions with rollback

### `/api/pricing`
- **GET**: Calculate real-time prices with live weather data
- Calls Korean Met Office API (`getVilageFcst`)
- 10-minute cache: `next: { revalidate: 600 }`

## Weather Integration

**API**: Korean Meteorological Administration VilageFcst API
- Grid coordinates: `(54, 123)` for Incheon Club 72
- Queries 3-hour forecast blocks (base times: 02, 05, 08, 11, 14, 17, 20, 23 KST)
- Extracts POP (probability of precipitation) category
- **Blocking Logic**: Blocks tee time if rainfall ≥ 10mm

**Timezone Handling**:
```typescript
// Convert UTC to KST (UTC+9)
const kstDate = new Date(utcDate.getTime() + 9 * 60 * 60 * 1000)
```

## Common Development Tasks

### Adding New Discount Factor
1. Update `pricingEngine.ts`:
   - Add calculation in `calculatePrice()`
   - Update `breakdown` object
   - Update `reasons` array
   - Ensure total discount ≤ 40%
2. Update `types/database.ts`:
   - Add field to `DiscountResult.breakdown`
3. Update UI:
   - `BookingModal.tsx` to display new discount
   - `page.tsx` price cards to show reason tags

### Testing Payment Flow Locally
1. Use Toss public test keys (already in `.env.local`)
2. Test card: `4000-0000-0000-0008` (success), `4000-0000-0000-0010` (fail)
3. Check logs in `/api/payments/confirm` for Toss API responses
4. Verify database updates in Supabase dashboard

### Debugging Payment Widget Issues
**Common Issues**:
- **401 Unauthorized**: Check `NEXT_PUBLIC_TOSS_CLIENT_KEY` has no spaces after `=` in `.env.local`
- **Widget iframe not found**: Ensure `useRef` pattern is used (no direct DOM checks)
- **Widget not rendering**: Check `isReady` state transitions in console logs

**Clean Implementation Pattern**:
- Never use `setTimeout` or retry loops for widget loading
- Trust SDK's Promise resolution
- Reset widget state on modal close

### Debugging Hydration Mismatch Errors

**Error Message**: `Hydration failed because the server rendered HTML didn't match the client`

**Common Causes in This Codebase**:
1. **Timers/Countdown**: `setInterval` running on client but not server
2. **Random Values**: `Math.random()` generates different values on server vs client
3. **Date.now()**: Current timestamp differs between server and client render
4. **Browser APIs**: `window`, `localStorage`, `navigator` don't exist on server

**Solution Pattern**:
```typescript
const [mounted, setMounted] = useState(false);

useEffect(() => {
  setMounted(true);
}, []);

// All client-only code goes here
useEffect(() => {
  if (!mounted) return;
  const timer = setInterval(() => {
    // Safe to use timers now
  }, 1000);
  return () => clearInterval(timer);
}, [mounted]);

if (!mounted) {
  return <Loader2 />; // Matches server render
}

// Client-only render
return <div>{Math.random()}</div>; // Now safe
```

**Real Example from TeeTimeList.tsx**:
- Panic mode timer uses `mounted` guard
- Random panic trigger (`Math.random() > 0.8`) only runs after mount
- Initial loader prevents mismatch during hydration

### Adding New API Route
1. Create `/app/api/{name}/route.ts`
2. Export `POST`, `GET`, etc. as async functions
3. Use `NextResponse.json()` for responses
4. Add `try-catch` with error logging
5. Add `next: { revalidate: N }` for caching (optional)

## Known Limitations (MVP Phase)

- **Authentication**: Hardcoded `userId=1` (needs real auth system)
- **Refund Flow**: Manual process (no automated refund API)
- **User Segments**: Defined in types but not dynamically assigned
- **Golf Clubs**: Schema exists but minimal implementation
- **Testing**: No unit/integration tests yet
- **Error Boundaries**: No React error boundaries

## Code Style Conventions

- **TypeScript**: Strict mode enabled, no `any` unless necessary (Supabase type workarounds)
- **Imports**: Use `@/` alias for root-relative imports
- **Styling**: Tailwind utility classes (no CSS modules)
- **State**: Use `useState` + `useMemo` for derived data
- **Error Handling**: Always wrap async operations in try-catch
- **Logging**: Use `console.error` for errors, `console.log` for debugging

## Deployment Checklist

- [ ] Update `.env.local` with production Supabase credentials
- [ ] Switch to production Toss keys (`live_ck_...` / `live_sk_...`)
- [ ] Enable Row Level Security (RLS) on Supabase tables
- [ ] Add authentication (Supabase Auth recommended)
- [ ] Implement real user segment assignment logic
- [ ] Add error boundaries for payment flows
- [ ] Set up monitoring for payment failures
- [ ] Configure webhook for Toss payment events (optional)
