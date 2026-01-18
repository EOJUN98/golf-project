# SDD-05: Reservation Detail UI/UX - Quick Reference

**Version**: 1.0 | **Date**: 2026-01-17

---

## Component Quick Access

### WeatherBadge

**Location**: `/components/reservation/WeatherBadge.tsx`

**Usage**:
```tsx
import WeatherBadge from '@/components/reservation/WeatherBadge';

<WeatherBadge
  weather={weatherData}
  teeOff={teeTime.tee_off}
/>
```

**Props**:
- `weather: WeatherData | null` - Weather forecast data
- `teeOff: string` - Tee-off timestamp (ISO 8601)

**Display Logic**:
| Rainfall | Badge | Color | Warning |
|----------|-------|-------|---------|
| ≥ 10mm | 🌧️ 강우 | Blue | Yes |
| ≥ 1mm | 🌦️ 약한 비 | Light Blue | Yes |
| Cloudy | ☁️ 흐림 | Gray | No |
| Sunny | ☀️ 맑음 | Yellow | No |

---

### StatusBadges

**Location**: `/components/reservation/StatusBadges.tsx`

**Usage**:
```tsx
import StatusBadges from '@/components/reservation/StatusBadges';

<StatusBadges
  reservation={reservation}
  user={user}
  eligibility={eligibility}
/>
```

**Badge Matrix**:
| Badge | Trigger | Color | Icon |
|-------|---------|-------|------|
| PAID | status === 'PAID' | Green | ✓ |
| CANCELLED | status === 'CANCELLED' | Orange | ✕ |
| NO_SHOW | status === 'NO_SHOW' | Red | ⚠ |
| IMMINENT | is_imminent_deal === true | Red | 🔥 |
| SUSPENDED | user.is_suspended === true | Red | 🔒 |
| REFUNDED | status === 'REFUNDED' | Blue | ↩ |
| COMPLETED | status === 'COMPLETED' | Gray | ✓ |

---

### CancellationPolicy

**Location**: `/components/reservation/CancellationPolicy.tsx`

**Usage**:
```tsx
import CancellationPolicy from '@/components/reservation/CancellationPolicy';

<CancellationPolicy
  reservation={reservation}
  eligibility={eligibility}
  hoursLeft={hoursLeft}
/>
```

**Policy Sections** (auto-shown based on state):

1. **Imminent Deal** (if `is_imminent_deal`)
   - Red box: "임박 특가 상품은 취소 및 환불이 불가합니다"

2. **Standard Policy** (if NOT imminent)
   - Blue box: "티오프 24시간 전까지 전액 환불 가능..."

3. **Deadline Passed** (if `hoursLeft < 24`)
   - Orange box: "취소 가능 시간이 지났습니다. 골프장으로 문의하세요."

4. **Can Cancel** (if `canCancel && PAID`)
   - Blue box: "티오프까지 X시간 남음. 전액 환불 가능합니다."

5. **No-Show Warning** (if `PAID`)
   - Orange box: "노쇼 발생 시 계정 이용이 제한됩니다"

6. **Weather Policy** (always)
   - Blue box: "기상 환불은 골프장 정책을 따릅니다"

---

### CancellationButton

**Location**: `/components/reservation/CancellationButton.tsx`

**Usage**:
```tsx
import CancellationButton from '@/components/reservation/CancellationButton';

<CancellationButton
  reservation={reservation}
  eligibility={eligibility}
  onCancel={handleCancel}
  isLoading={isCancelling}
/>
```

**Show Conditions** (ALL must be true):
- `eligibility.canCancel === true`
- `reservation.status === 'PAID'`
- Component decides to show (internal logic)

**Modal Flow**:
```
Click "예약 취소하기"
  ↓
Modal opens with warning
  ↓
User confirms
  ↓
onCancel() callback
  ↓
Parent handles API call
  ↓
Success → Alert + Redirect
```

---

## Helper Functions

**File**: `/utils/reservationDetailHelpers.ts`

### Quick Functions

```typescript
// Calculate hours until tee-off
const hours = calculateHoursLeft(teeTime.tee_off);

// Get weather status
const status = getWeatherStatus(weatherData);
// Returns: 'heavy-rain' | 'rain' | 'cloudy' | 'sunny' | 'unknown'

// Check if cancel button should show
const show = shouldShowCancelButton(eligibility, reservation, user);

// Get status badges for reservation
const badges = getStatusBadges(reservation, user, eligibility);

// Format currency
const formatted = formatCurrency(120000);
// Returns: "₩120,000"

// Format tee-off time
const { date, time, dayOfWeek } = formatTeeOffTime(teeOff);
// Returns: { date: "2026년 1월 20일", time: "10:00", dayOfWeek: "월" }
```

---

## API Routes

### GET `/api/reservation/[id]`

**Fetch reservation detail**

**Request**:
```bash
GET /api/reservation/abc-123-def
```

**Response**:
```json
{
  "success": true,
  "data": {
    "reservation": { /* ... */ },
    "teeTime": { /* ... */ },
    "golfClub": { /* ... */ },
    "user": { /* ... */ },
    "weather": {
      "rn1": 0,
      "sky": "SUNNY",
      "pop": 10,
      "tmp": 5
    },
    "eligibility": {
      "canCancel": true,
      "reason": "Cancellation allowed",
      "hoursLeft": 72.5,
      "isImminentDeal": false,
      "isUserSuspended": false,
      "reservationStatus": "PAID",
      "cutoffHours": 24
    }
  }
}
```

---

### POST `/api/reservations/cancel`

**Cancel reservation** (from SDD-04)

**Request**:
```bash
POST /api/reservations/cancel
Content-Type: application/json

{
  "reservationId": "abc-123-def",
  "userId": "user-1",
  "cancelReason": "USER_REQUEST"
}
```

**Response** (Success):
```json
{
  "success": true,
  "message": "취소가 완료되었습니다",
  "refundAmount": 120000,
  "refundStatus": "pending"
}
```

**Response** (Error):
```json
{
  "success": false,
  "error": "Cancellation not allowed",
  "reason": "임박딜 상품은 취소/환불이 불가합니다"
}
```

---

## Configuration

**File**: `/utils/reservationDetailHelpers.ts`

### Constants

```typescript
export const RESERVATION_DETAIL_CONFIG = {
  // Cancellation cutoff (must match DB policy)
  CANCEL_CUTOFF_HOURS: 24,

  // Weather thresholds
  WEATHER_HEAVY_RAIN_THRESHOLD: 10, // mm
  WEATHER_RAIN_THRESHOLD: 1,        // mm

  // Messages
  WEATHER_POLICY_MESSAGE: '기상 환불은 골프장 정책을 따릅니다',
  CANCELLATION_TERMS: '티오프 24시간 전까지 전액 환불 가능하며 이후 취소는 골프장 정책을 따릅니다',
  IMMINENT_DEAL_TERMS: '임박 특가 상품은 취소 및 환불이 불가합니다',
  NO_SHOW_WARNING: '노쇼 발생 시 계정 이용이 제한됩니다',
};
```

**To Change Cutoff**:
1. Update `CANCEL_CUTOFF_HOURS` above
2. Update database:
   ```sql
   UPDATE cancellation_policies
   SET cancel_cutoff_hours = 48
   WHERE name = 'STANDARD_V2';
   ```

---

## UI Decision Tree

### Should Show Cancel Button?

```
Is reservation.status === 'PAID'?
  NO → Hide button
  YES ↓

Is eligibility.canCancel === true?
  NO → Hide button + show reason
  YES ↓

Is user.is_suspended === true?
  YES → Hide button
  NO ↓

Is reservation.is_imminent_deal === true?
  YES → Hide button
  NO ↓

SHOW CANCEL BUTTON ✓
```

---

### What Status Badges to Show?

```
PRIMARY BADGE (pick one):
  status === 'CANCELLED' → "취소됨" (orange)
  status === 'NO_SHOW' → "노쇼" (red)
  status === 'REFUNDED' → "환불 완료" (blue)
  status === 'COMPLETED' → "이용 완료" (gray)
  status === 'PAID' → "결제 완료" (green)

SECONDARY BADGES (add if true):
  is_imminent_deal === true → "임박딜" (red)
  user.is_suspended === true → "계정 정지" (red)
```

---

### What Weather Badge to Show?

```
Is weather data available?
  NO → Show nothing
  YES ↓

Is rn1 >= 10mm?
  YES → 🌧️ "강우" (blue) + warning
  NO ↓

Is rn1 >= 1mm?
  YES → 🌦️ "약한 비" (light blue) + warning
  NO ↓

Is sky === 'CLOUDY' or 'OVERCAST'?
  YES → ☁️ "흐림" (gray)
  NO ↓

☀️ "맑음" (yellow)
```

---

## Test Scenarios Quick Check

### ✅ Scenario 1: Cancellable PAID

- Status: PAID, NOT imminent, NOT suspended
- Hours left: > 24
- **Expect**: Cancel button SHOWN, green "결제 완료" badge

### ✅ Scenario 2: Past Cutoff

- Status: PAID, Hours left: < 24
- **Expect**: Cancel button HIDDEN, orange "취소 불가" warning

### ✅ Scenario 3: Imminent Deal

- `is_imminent_deal: true`
- **Expect**: Red "임박딜" badge, NO cancel button, red policy warning

### ✅ Scenario 4: Cancelled

- Status: CANCELLED
- **Expect**: Orange "취소됨" badge, orange info box with refund details

### ✅ Scenario 5: No-Show

- Status: NO_SHOW, `user.is_suspended: true`
- **Expect**: Red "노쇼" + "계정 정지" badges, red info box, no refund

### ✅ Scenario 6: Suspended User

- `user.is_suspended: true`, Status: PAID
- **Expect**: Red "계정 정지" badge, NO cancel button (even if eligible)

### ✅ Scenario 7: Heavy Rain

- `weather.rn1 >= 10mm`
- **Expect**: Blue rain badge, policy warning, golf club operation notice

---

## Common Customizations

### Change Cutoff to 48 Hours

**Step 1**: Update config
```typescript
// utils/reservationDetailHelpers.ts
CANCEL_CUTOFF_HOURS: 48,
```

**Step 2**: Update database
```sql
UPDATE cancellation_policies
SET cancel_cutoff_hours = 48
WHERE name = 'STANDARD_V2';
```

**Step 3**: Update message
```typescript
CANCELLATION_TERMS: '티오프 48시간 전까지 전액 환불 가능...',
```

---

### Add New Badge Type

**Step 1**: Add type
```typescript
// types/reservationDetail.ts
export type ReservationStatusBadge =
  | 'PAID'
  | 'WAITING_DEPOSIT' // ← NEW
  | ...
```

**Step 2**: Add config
```typescript
// utils/reservationDetailHelpers.ts
case 'WAITING_DEPOSIT':
  return {
    label: '입금 대기',
    variant: 'warning',
    icon: '⏳',
    description: '입금을 완료해 주세요'
  };
```

**Step 3**: Add to logic
```typescript
export function getStatusBadges(...) {
  if (reservation.status === 'PENDING_DEPOSIT') {
    badges.push('WAITING_DEPOSIT');
  }
}
```

---

### Customize Weather Thresholds

```typescript
// utils/reservationDetailHelpers.ts
export const RESERVATION_DETAIL_CONFIG = {
  WEATHER_HEAVY_RAIN_THRESHOLD: 15, // mm (was 10)
  WEATHER_RAIN_THRESHOLD: 0.5,      // mm (was 1)
};
```

---

## Debugging Tips

### Cancel Button Not Showing

**Check**:
```typescript
console.log('Status:', reservation.status);
console.log('Can cancel:', eligibility?.canCancel);
console.log('Reason:', eligibility?.reason);
console.log('Is suspended:', user.is_suspended);
console.log('Is imminent:', reservation.is_imminent_deal);
console.log('Hours left:', hoursLeft);
```

**Common Issues**:
- `status !== 'PAID'` → Button hidden
- `eligibility.canCancel === false` → Check backend policy
- `user.is_suspended === true` → User suspended
- `is_imminent_deal === true` → Imminent deals can't cancel

---

### Weather Badge Not Showing

**Check**:
```typescript
console.log('Weather data:', weather);
console.log('Weather status:', getWeatherStatus(weather));
```

**Common Issues**:
- `weather === null` → No weather data in tee_time
- `tee_time.weather_condition` not populated → Need to fetch weather

---

### Wrong Badge Colors

**Check**:
```typescript
const config = getStatusBadgeConfig('PAID');
console.log('Config:', config);
const className = getBadgeVariantClassName(config.variant);
console.log('Class:', className);
```

**Ensure Tailwind classes are not purged**:
```javascript
// tailwind.config.js
content: [
  './components/**/*.tsx',
  './app/**/*.tsx',
  './utils/**/*.ts', // ← Include this
],
```

---

### API Returns 404

**Check**:
```bash
# Verify reservation exists
curl http://localhost:3000/api/reservation/abc-123-def

# Check database
SELECT * FROM reservations WHERE id = 'abc-123-def';
```

**Common Issues**:
- Wrong reservation ID
- Reservation doesn't exist
- API route file in wrong location

---

## Integration Checklist

- [ ] **Link from Tee Time List**
  ```tsx
  <Link href={`/reservation/${reservation.id}`}>View Details</Link>
  ```

- [ ] **Link from My Reservations**
  ```tsx
  <Link href={`/reservation/${reservation.id}`}>상세 보기</Link>
  ```

- [ ] **Navigation Breadcrumbs**
  ```tsx
  Home > My Reservations > Reservation Detail
  ```

- [ ] **Back Button**
  ```tsx
  <button onClick={() => router.back()}>돌아가기</button>
  ```

- [ ] **Database Migration**
  - [ ] SDD-04 V2 migration applied
  - [ ] Cancellation policies table populated

- [ ] **Weather Data Pipeline**
  - [ ] Weather fetched for tee times
  - [ ] Stored in `tee_times.weather_condition` JSONB

- [ ] **Payment Gateway**
  - [ ] `processPaymentRefund()` implemented
  - [ ] Toss Payments API integration complete

---

## File Locations

| Component | Path |
|-----------|------|
| Main Page | `/app/reservation/[id]/page.tsx` |
| API Route | `/app/api/reservation/[id]/route.ts` |
| Weather Badge | `/components/reservation/WeatherBadge.tsx` |
| Status Badges | `/components/reservation/StatusBadges.tsx` |
| Policy Display | `/components/reservation/CancellationPolicy.tsx` |
| Cancel Button | `/components/reservation/CancellationButton.tsx` |
| Types | `/types/reservationDetail.ts` |
| Helpers | `/utils/reservationDetailHelpers.ts` |

---

## Quick Stats

- **Files Created**: 8
- **Total Lines**: ~1,315
- **Components**: 4 (WeatherBadge, StatusBadges, CancellationPolicy, CancellationButton)
- **API Routes**: 1 (GET /api/reservation/[id])
- **Helper Functions**: 12
- **Badge Types**: 7
- **Policy Sections**: 6
- **Test Scenarios**: 7

---

## Next Actions

1. **Test All Scenarios** (see test scenarios above)
2. **Integrate Navigation** (add links from other pages)
3. **Deploy to Staging** (test with real data)
4. **User Acceptance Testing** (get feedback)
5. **Payment Gateway Integration** (implement refund API)
6. **Production Deployment** (go live!)

---

**For Detailed Documentation**: See `SDD-05_IMPLEMENTATION_SUMMARY.md`

**For Backend Policy Logic**: See `SDD-04_V2_QUICK_REFERENCE.md`

**Last Updated**: 2026-01-17
