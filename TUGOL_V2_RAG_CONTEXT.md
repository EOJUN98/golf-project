# TUGOL — V2 Development Context (RAG)

> **Last Updated:** 2026-01-13
> **Version:** V2.1 (Hydration Fixed & Filtering Gap Resolved)
> **Status:** Production-Ready MVP

This document serves as the **primary context source** for the CLI Agent regarding the V2 architecture, dynamic pricing logic, and critical bug fixes.

---

## 1. Core Architecture (Next.js 16 + Supabase)

### Server-Side Data Flow (SSR)
- **Entry:** `app/page.tsx` (Async Server Component)
- **Fetch:** Calls `getTeeTimesByDate` directly (No API route overhead).
- **Logic:** `utils/supabase/queries.ts` injects **V2 Pricing Engine** logic before rendering.
- **Render:** Passes fully calculated `initialTeeTimes` to `TeeTimeList` (Client Component).

### Client-Side Interactivity
- **Component:** `components/TeeTimeList.tsx`
- **Features:**
  - **Hydration Safe:** Uses `mounted` state pattern to prevent SSR mismatch.
  - **Gap-less Filtering:** Covers all time slots (Morning/Day/Evening) without exclusion.
  - **Panic Mode:** Client-side random trigger effect (visual only).

### Security Model (Reservation)
- **Endpoint:** `app/api/reservations/route.ts`
- **Rule:** **Zero Trust**. The server *ignores* the price sent by the client.
- **Process:**
  1. Fetch `tee_time` from DB.
  2. Re-calculate price using `pricingEngine.calculateDynamicPrice`.
  3. Compare Server Price vs. Client Price.
  4. **Atomic Update:** Uses `.eq('status', 'OPEN')` to prevent double booking.

---

## 2. V2 Dynamic Pricing Engine (`utils/pricingEngine.ts`)

The engine uses a deterministic algorithm based on 5 layers.

| Layer | Name | Logic |
| :--- | :--- | :--- |
| **L1** | **Base Price** | Weekday(120k) / Weekend(160k) + Peak Season(x1.25) + Premium Slot(+20k) |
| **L2** | **Time (LMD)** | < 24h before tee-off: -15%(Weekday) / -5%(Weekend). *Blocked for 'Cherry' segment.* |
| **L3** | **Weather** | Rain(>30%) or Extreme Temp or Wind: -5% discount. |
| **L4** | **Segment** | 'VIP': Flat -5,000 KRW discount. |
| **L5** | **Floor** | Minimum price protection (50,000 KRW). |

---

## 3. Critical Fixes & Patterns

### A. Hydration Mismatch Fix
**Problem:** `new Date()` and `Math.random()` caused server-client HTML mismatch.
**Solution:** Client-Side Mounting Check Pattern.
```tsx
// components/TeeTimeList.tsx
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);

if (!mounted) return <Loader2 />; // Render Loader until client hydration is complete
```

### B. Tee Time Filtering (Gap-less Logic)
**Problem:** Previous logic used strict ranges (e.g., 05:00-07:30, 11:00-14:30), hiding slots like 08:00 or 15:00.
**Solution:** Sequential coverage logic.
```tsx
const totalMinutes = hour * 60 + minutes;
// Part 1: Until 11:00
if (selectedPart === 'part1') return totalMinutes < 660; 
// Part 2: 11:00 ~ 17:00
if (selectedPart === 'part2') return totalMinutes >= 660 && totalMinutes < 1020; 
// Part 3: 17:00 ~ onwards
if (selectedPart === 'part3') return totalMinutes >= 1020; 
```

### C. Date Handling
- **Tool:** `date-fns` used for calculation logic.
- **State:** `selectedDate` state is managed in `TeeTimeList`.
- **Sync:** URL Query Param (`?date=YYYY-MM-DD`) drives the Server Component data fetching.

---

## 4. Directory Structure Snapshot

```text
/
├── app/
│   ├── page.tsx                 # Server Component (Data Fetching)
│   └── api/reservations/route.ts # Secure Reservation Endpoint
├── components/
│   ├── TeeTimeList.tsx          # Client Component (UI/Filter/Hydration)
│   ├── BookingModal.tsx         # Toss Payments Integration
│   └── ...
├── utils/
│   ├── pricingEngine.ts         # V2 Logic (Pure Function)
│   └── supabase/queries.ts      # DB Access + Engine Integration
└── types/
    └── database.ts              # Strict TypeScript Definitions
```

## 5. Next Steps
- [ ] Connect real Weather API (KMA) to `queries.ts`.
- [ ] Implement Admin Dashboard controls for Pricing Policies.
- [ ] Add User Authentication context to replace Mock User ('PRESTIGE').
