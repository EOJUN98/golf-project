# SDD-04 V2: Cancellation/Refund/NoShow Policy Implementation Summary

## Executive Summary

This document summarizes the implementation of **SDD-04 V2**, a comprehensive cancellation and refund policy system for the TUGOL platform.

### Core Principles

1. **Responsibility Separation**
   - Weather-related cancellations/refunds → Golf club responsibility
   - Platform → Intermediary + status display only

2. **Product Types**
   - **STANDARD_TEE**: Cancellable before cutoff + full refund
   - **IMMINENT_TEE**: Non-cancellable immediately after purchase

3. **Cutoff Policy**
   - `CANCEL_CUTOFF_HOURS = 24` (configurable)
   - Standard tee times can be cancelled up to 24 hours before tee-off

4. **No Partial Refunds**
   - Cancellable → Full refund
   - Non-cancellable → Platform cancellation disabled + "Contact golf club" message

5. **No-Show Policy**
   - Mark as NO_SHOW after tee-off + 30 minutes
   - Automatic user suspension (`user.is_suspended = TRUE`)

6. **Weather Policy**
   - Display weather icon in UI only
   - No direct intervention in refund/cancellation logic

---

## Database Schema Changes

### `reservations` Table (New Columns)

```sql
-- Status tracking
status TEXT NOT NULL DEFAULT 'PENDING'
  CHECK (status IN ('PENDING', 'PAID', 'CANCELLED', 'REFUNDED', 'NO_SHOW', 'COMPLETED'))

-- Product type
is_imminent_deal BOOLEAN NOT NULL DEFAULT FALSE

-- Cancellation tracking
cancelled_at TIMESTAMPTZ
cancel_reason TEXT  -- 'USER_REQUEST', 'WEATHER', 'NO_SHOW', 'ADMIN_CANCEL'
refund_amount NUMERIC(10,2) DEFAULT 0

-- No-show tracking
no_show_marked_at TIMESTAMPTZ

-- Policy version
policy_version TEXT DEFAULT 'v2'
```

### `users` Table (New Columns)

```sql
-- Suspension tracking
is_suspended BOOLEAN NOT NULL DEFAULT FALSE
suspended_reason TEXT  -- 'NO_SHOW', 'MULTIPLE_NO_SHOWS', 'POLICY_VIOLATION'
suspended_at TIMESTAMPTZ
suspension_expires_at TIMESTAMPTZ  -- NULL = permanent
```

### `cancellation_policies` Table (New)

```sql
CREATE TABLE cancellation_policies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,  -- 'STANDARD_V2', 'FLEXIBLE_V2', etc.
  version TEXT NOT NULL DEFAULT 'v2',

  -- Cancellation rules
  cancel_cutoff_hours INTEGER NOT NULL DEFAULT 24,
  imminent_deal_cancellable BOOLEAN NOT NULL DEFAULT FALSE,
  refund_rate NUMERIC(3,2) NOT NULL DEFAULT 1.00,

  -- No-show rules
  no_show_grace_period_minutes INTEGER NOT NULL DEFAULT 30,
  no_show_suspension_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  no_show_suspension_duration_days INTEGER,  -- NULL = permanent

  description TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);
```

**Default Policies**:
- `STANDARD_V2`: 24h cutoff, full refund, imminent non-cancellable, 30min grace, permanent suspension
- `FLEXIBLE_V2`: 12h cutoff, 80% refund, imminent cancellable, 30min grace, 7-day suspension
- `STRICT_V2`: 48h cutoff, full refund, imminent non-cancellable, 15min grace, permanent suspension

---

## Server Functions

### 1. `canUserCancelReservation(reservationId)`

**Purpose**: Check if cancellation is allowed

**Logic**:
```typescript
1. Get reservation + tee time
2. Check if already cancelled → Reject
3. Check if completed/no-show → Reject
4. Check if imminent deal → Reject (unless policy allows)
5. Calculate hours until tee-off
6. If hours < cutoff → Reject with message
7. Return: { canCancel: true/false, reason: string, hoursLeft, policy }
```

**Used in**:
- UI gating (show/hide cancel button)
- API validation (before processing cancellation)

---

### 2. `requestCancellation(reservationId, userId, cancelReason)`

**Purpose**: Process cancellation and update DB

**Logic**:
```typescript
1. Call canUserCancelReservation() → Check eligibility
2. If not allowed → Return error
3. Calculate refund amount (full refund = final_price × 1.0)
4. Update reservation:
   - status = 'CANCELLED'
   - cancelled_at = NOW()
   - cancel_reason = reason
   - refund_amount = calculated
5. Update tee time:
   - status = 'OPEN'
   - reserved_by = NULL
6. Return: { success, message, refundAmount }
```

**Note**: Does NOT process payment refund (handled separately via PG API)

---

### 3. `markNoShow(reservationId)`

**Purpose**: Mark reservation as no-show (admin function)

**Logic**:
```typescript
1. Get reservation + tee time
2. Check if already no-show → Reject
3. Check if status = 'PAID' → Only PAID can be marked
4. Calculate grace period end (tee_off + 30 mins)
5. If NOW < grace period end → Reject
6. Update reservation:
   - status = 'NO_SHOW'
   - no_show_marked_at = NOW()
   - refund_amount = 0
7. If policy.no_show_suspension_enabled:
   - Update user:
     - is_suspended = TRUE
     - suspended_reason = 'NO_SHOW'
     - no_show_count += 1
     - suspension_expires_at = NOW + duration (or NULL)
8. Return: { success, message, userSuspended }
```

---

### 4. `canUserBook(userId)`

**Purpose**: Check if user is allowed to book (not suspended)

**Logic**:
```typescript
1. Get user
2. If not suspended → Return { canBook: true }
3. Check if suspension expired:
   - If NOW >= suspension_expires_at → Lift suspension, return true
4. If still suspended → Return { canBook: false, reason }
```

**Used in**:
- Booking flow validation
- Payment initiation check

---

### 5. `getCancellationInfo(reservation, teeTime)`

**Purpose**: Get display info for UI (client-side helper)

**Logic**:
```typescript
1. If imminent deal → Return { canCancel: false, badge: '취소/환불 불가' }
2. Calculate hours left
3. If hours < cutoff → Return { canCancel: false, badge: '취소 불가' }
4. Otherwise → Return { canCancel: true, badge: '취소 가능' }
```

---

## API Routes

### POST `/api/reservations/cancel`

**Request**:
```json
{
  "reservationId": "uuid",
  "userId": "uuid",
  "cancelReason": "USER_REQUEST"  // optional
}
```

**Response** (Success):
```json
{
  "success": true,
  "message": "취소가 완료되었습니다. 환불은 영업일 기준 3-5일 소요됩니다.",
  "refundAmount": 120000,
  "refundStatus": "pending",
  "reservationId": "uuid"
}
```

**Response** (Error):
```json
{
  "error": "Cancellation not allowed",
  "reason": "임박딜 상품은 취소/환불이 불가합니다. 골프장으로 문의하세요.",
  "canCancel": false
}
```

---

### GET `/api/reservations/cancel?reservationId=xxx`

**Purpose**: Check cancellation eligibility (for UI)

**Response**:
```json
{
  "canCancel": true,
  "reason": "취소 가능",
  "hoursLeft": 36.5,
  "policy": { /* policy object */ }
}
```

---

### POST `/api/admin/no-show`

**Request**:
```json
{
  "reservationId": "uuid",
  "adminUserId": "uuid"
}
```

**Response**:
```json
{
  "success": true,
  "message": "노쇼 처리 완료. 사용자 계정이 정지되었습니다.",
  "userSuspended": true
}
```

---

### GET `/api/admin/no-show?date=2026-01-16`

**Purpose**: Get all reservations that need no-show checking

**Response**:
```json
{
  "date": "2026-01-16",
  "totalReservations": 15,
  "candidatesForNoShow": 3,
  "reservations": [
    {
      "reservationId": "uuid",
      "userId": "uuid",
      "userName": "홍길동",
      "userPhone": "010-1234-5678",
      "userNoShowCount": 0,
      "teeOff": "2026-01-16T10:00:00Z",
      "golfClubName": "Incheon Club 72",
      "finalPrice": 120000
    }
  ]
}
```

---

## UI/UX Implementation

### Tee Time Card

```tsx
<TeeTimeCard>
  {/* Weather icon */}
  <WeatherIcon condition={weather} />

  {/* Cancellation badge */}
  <CancellationBadge
    isImminentDeal={isImminentDeal}
    showDescription={false}
  />

  {/* Price display */}
  <Price>{finalPrice}원</Price>
</TeeTimeCard>
```

**Badge States**:
- Imminent deal: `취소/환불 불가` (red)
- Standard < 24h: `취소 불가` (orange)
- Standard >= 24h: `24시간 전 취소 가능` (blue/green)

---

### Reservation Detail Page

```tsx
<ReservationDetail>
  {/* Cancellation info */}
  <CancellationBadge
    reservation={reservation}
    teeTime={teeTime}
    showDescription={true}
  />

  {/* Cancel button (conditionally rendered) */}
  {canCancel && (
    <button onClick={handleCancelReservation}>
      예약 취소
    </button>
  )}

  {/* If cannot cancel, show message */}
  {!canCancel && (
    <InfoBox>
      취소가 불가능한 예약입니다.
      문의사항은 골프장으로 연락하세요.
    </InfoBox>
  )}
</ReservationDetail>
```

**Cancel Button Logic**:
```typescript
const [canCancel, setCanCancel] = useState(false);

useEffect(() => {
  async function checkCancellation() {
    const res = await fetch(`/api/reservations/cancel?reservationId=${id}`);
    const data = await res.json();
    setCanCancel(data.canCancel);
  }
  checkCancellation();
}, [id]);
```

---

### Booking Flow (Suspension Check)

```typescript
async function handleBooking(teeTimeId: string, userId: string) {
  // Check if user can book
  const checkRes = await fetch(`/api/users/can-book?userId=${userId}`);
  const checkData = await checkRes.json();

  if (!checkData.canBook) {
    alert(checkData.reason);
    return;
  }

  // Proceed with booking...
}
```

---

## Terms & Conditions Text

### Booking Confirmation Modal

```
예약 전 확인사항

✓ 기상 사유 환불은 골프장 정책에 따릅니다.
✓ 노쇼 시 계정 이용이 제한될 수 있습니다.
✓ 취소는 티오프 24시간 전까지 가능합니다.
✓ 임박딜 상품은 취소 및 환불이 불가합니다.
```

### Policy Page

```markdown
# 취소 및 환불 정책

## 일반 티타임 (Standard Tee)
- 티오프 24시간 전까지 전액 환불 가능
- 24시간 이내 취소는 골프장 정책에 따릅니다

## 임박딜 (Imminent Deal)
- 구매 즉시 취소/환불 불가
- 긴급 사유는 골프장으로 직접 문의

## 기상 환불
- 기상 사유 취소/환불은 골프장 책임
- 플랫폼은 중개 역할만 수행

## 노쇼 정책
- 티오프 30분 경과 후 노쇼 처리
- 노쇼 시 계정 영구 정지
- 정지 해제는 고객센터 문의
```

---

## Test Scenarios

### Test 1: Standard Tee, 30h Before Cancellation

**Setup**:
- Book standard tee time
- Tee-off: 2026-01-18 10:00
- Current time: 2026-01-17 04:00 (30 hours before)

**Expected**:
- `canUserCancelReservation()` → `{ canCancel: true }`
- `requestCancellation()` → Success
- `refund_amount` = final_price
- Reservation status = 'CANCELLED'
- Tee time status = 'OPEN'

**Test Code**:
```typescript
const result = await requestCancellation(reservationId, userId);
expect(result.success).toBe(true);
expect(result.refundAmount).toBe(120000);
```

---

### Test 2: Standard Tee, 12h Before Cancellation

**Setup**:
- Book standard tee time
- Tee-off: 2026-01-17 20:00
- Current time: 2026-01-17 08:00 (12 hours before)

**Expected**:
- `canUserCancelReservation()` → `{ canCancel: false }`
- Reason: "취소는 티오프 24시간 전까지 가능합니다..."
- UI: Cancel button hidden
- API: 400 error on cancellation attempt

**Test Code**:
```typescript
const result = await canUserCancelReservation(reservationId, supabase);
expect(result.canCancel).toBe(false);
expect(result.reason).toContain('24시간 전');
```

---

### Test 3: Imminent Deal Purchase → Immediate Cancellation

**Setup**:
- Book imminent deal (is_imminent_deal = TRUE)
- Attempt immediate cancellation

**Expected**:
- `canUserCancelReservation()` → `{ canCancel: false }`
- Reason: "임박딜 상품은 취소/환불이 불가합니다..."
- UI: Badge shows "취소/환불 불가"
- API: 400 error

**Test Code**:
```typescript
const reservation = { ...mockReservation, is_imminent_deal: true };
const result = await canUserCancelReservation(reservation.id, supabase);
expect(result.canCancel).toBe(false);
expect(result.reason).toContain('임박딜');
```

---

### Test 4: Weather-Related Cancellation

**Setup**:
- Book standard tee time
- Heavy rain forecast
- User attempts cancellation

**Expected**:
- Platform allows cancellation (if within cutoff)
- `cancel_reason` = 'WEATHER'
- UI displays: "기상 환불은 골프장 정책에 따릅니다"
- Refund processing deferred to golf club

**Test Code**:
```typescript
const result = await requestCancellation(
  reservationId,
  userId,
  'WEATHER'
);
expect(result.success).toBe(true);
// Note: Actual refund handled by golf club
```

---

### Test 5: No-Show Marking

**Setup**:
- Reservation status = 'PAID'
- Tee-off: 2026-01-16 10:00
- Current time: 2026-01-16 10:35 (35 minutes after)

**Expected**:
- `markNoShow()` → Success
- Reservation status = 'NO_SHOW'
- refund_amount = 0
- user.is_suspended = TRUE
- user.no_show_count += 1

**Test Code**:
```typescript
const result = await markNoShow(reservationId, supabase);
expect(result.success).toBe(true);
expect(result.userSuspended).toBe(true);

const user = await supabase.from('users').select('*').eq('id', userId).single();
expect(user.data.is_suspended).toBe(true);
```

---

### Test 6: Suspended User Booking Attempt

**Setup**:
- User is suspended (is_suspended = TRUE)
- User attempts to book new tee time

**Expected**:
- `canUserBook()` → `{ canBook: false }`
- Reason: "노쇼로 인해 예약이 제한되었습니다..."
- UI: Booking button disabled
- API: 403 error on booking attempt

**Test Code**:
```typescript
const result = await canUserBook(suspendedUserId, supabase);
expect(result.canBook).toBe(false);
expect(result.reason).toContain('노쇼');
```

---

### Test 7: Suspension Expiry

**Setup**:
- User suspended with expiry: 2026-01-15
- Current time: 2026-01-16 (past expiry)

**Expected**:
- `canUserBook()` → Lifts suspension automatically
- is_suspended = FALSE
- User can book again

**Test Code**:
```typescript
const result = await canUserBook(userId, supabase);
expect(result.canBook).toBe(true);
expect(result.reason).toContain('정지 해제됨');

const user = await supabase.from('users').select('*').eq('id', userId).single();
expect(user.data.is_suspended).toBe(false);
```

---

## Configuration Tuning

### Adjust Cutoff Hours

```typescript
// In pricingConfigV2.ts or environment variable
export const CANCELLATION_CONFIG = {
  CANCEL_CUTOFF_HOURS: 48,  // Change to 48 hours
  // ...
};
```

**Impact**: Users must cancel 48h before tee-off instead of 24h.

---

### Adjust No-Show Grace Period

```sql
-- In cancellation_policies table
UPDATE cancellation_policies
SET no_show_grace_period_minutes = 60
WHERE name = 'STANDARD_V2';
```

**Impact**: No-show can only be marked 60 minutes after tee-off.

---

### Disable Suspension for No-Show

```sql
UPDATE cancellation_policies
SET no_show_suspension_enabled = FALSE
WHERE name = 'STANDARD_V2';
```

**Impact**: No-show only increments counter, doesn't suspend user.

---

### Temporary Suspension Instead of Permanent

```sql
UPDATE cancellation_policies
SET no_show_suspension_duration_days = 30
WHERE name = 'STANDARD_V2';
```

**Impact**: Users suspended for 30 days instead of permanently.

---

## Known Limitations

1. **Payment Refund Integration**:
   - `processPaymentRefund()` is a placeholder
   - Requires actual PG API integration (Toss Payments, etc.)

2. **Multi-Policy Support**:
   - Currently uses `STANDARD_V2` for all reservations
   - Future: Assign policy per golf club or user segment

3. **Weather-Based Auto-Cancellation**:
   - Currently manual only
   - Future: Auto-cancel if weather exceeds threshold

4. **Notification System**:
   - No automatic notifications for suspension/cancellation
   - Future: Integrate with push notification system

5. **Admin Dashboard**:
   - Basic API only, no full UI for no-show management
   - Future: Build admin panel for batch operations

---

## Next Steps

### Immediate (Ready for QA)
- [ ] Run database migration
- [ ] Test 7 scenarios manually
- [ ] Update booking flow to check `canUserBook()`
- [ ] Add cancellation UI to reservation detail page

### Short-term (1-2 weeks)
- [ ] Integrate payment refund API (Toss/Payple)
- [ ] Build admin no-show management UI
- [ ] Add email/SMS notifications for cancellations
- [ ] Implement suspension appeal flow

### Medium-term (1-2 months)
- [ ] Multi-policy support (per golf club)
- [ ] Weather-based auto-cancellation
- [ ] Partial refund tiers (70%, 50%, etc.)
- [ ] Analytics dashboard for cancellation rates

---

## File Summary

| File | Purpose |
|------|---------|
| `supabase/migrations/20260116_cancellation_policy_v2.sql` | Database schema + SQL functions |
| `types/database.ts` | TypeScript types (updated) |
| `utils/cancellationPolicyV2.ts` | Server-side logic functions |
| `app/api/reservations/cancel/route.ts` | Cancellation API |
| `app/api/admin/no-show/route.ts` | Admin no-show API |
| `components/CancellationBadge.tsx` | UI badge component |
| `SDD-04_V2_IMPLEMENTATION_SUMMARY.md` | This document |

---

## Support

For questions or issues:
1. Review test scenarios in this document
2. Check SQL functions in migration file
3. Refer to API route implementations
4. Test with provided test code examples

**Last Updated**: 2026-01-16
**Version**: SDD-04 V2
**Status**: ✅ Implementation Complete, Ready for QA
