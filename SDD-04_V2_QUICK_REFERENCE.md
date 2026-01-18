# SDD-04 V2: Quick Reference Guide

## Core Logic Decision Tree

```
User wants to cancel reservation
    ↓
Is reservation.is_imminent_deal = TRUE?
    YES → REJECT with message: "임박딜 상품은 취소/환불이 불가합니다"
    NO → Continue
    ↓
Is reservation already cancelled?
    YES → REJECT with message: "이미 취소된 예약입니다"
    NO → Continue
    ↓
Calculate hours until tee-off
    ↓
Is hoursLeft < CUTOFF_HOURS (24)?
    YES → REJECT with message: "취소는 티오프 24시간 전까지 가능합니다"
    NO → Continue
    ↓
ALLOW CANCELLATION
    ↓
Update reservation:
    - status = 'CANCELLED'
    - cancelled_at = NOW()
    - refund_amount = final_price × 1.0
    ↓
Update tee_time:
    - status = 'OPEN'
    - reserved_by = NULL
    ↓
Process payment refund (via PG API)
    ↓
DONE
```

---

## Configuration Constants

```typescript
// In utils/cancellationPolicyV2.ts
export const CANCELLATION_CONFIG = {
  DEFAULT_POLICY: 'STANDARD_V2',
  CANCEL_CUTOFF_HOURS: 24,              // ← TUNE THIS
  NO_SHOW_GRACE_PERIOD_MINUTES: 30,    // ← TUNE THIS
  FULL_REFUND_RATE: 1.0,                // 100% refund
  NO_REFUND_RATE: 0.0,
};
```

---

## Database Quick Commands

### Check if user can cancel
```sql
SELECT * FROM can_user_cancel_reservation(reservation_id);
-- Returns: { can_cancel: boolean, reason: text }
```

### Process cancellation (via function)
```sql
SELECT * FROM process_cancellation(
  p_reservation_id := 'uuid',
  p_user_id := 'uuid',
  p_cancel_reason := 'USER_REQUEST'
);
-- Returns: { success: boolean, message: text, refund_amount: numeric }
```

### Mark as no-show
```sql
SELECT * FROM mark_no_show(reservation_id);
-- Returns: { success: boolean, message: text, user_suspended: boolean }
```

### Check if user can book
```sql
SELECT * FROM can_user_book(user_id);
-- Returns: { can_book: boolean, reason: text }
```

---

## API Endpoints

### 1. Check Cancellation Eligibility (GET)
```bash
GET /api/reservations/cancel?reservationId=xxx

Response:
{
  "canCancel": true/false,
  "reason": "string",
  "hoursLeft": 36.5,
  "policy": { ... }
}
```

### 2. Request Cancellation (POST)
```bash
POST /api/reservations/cancel
Content-Type: application/json

{
  "reservationId": "uuid",
  "userId": "uuid",
  "cancelReason": "USER_REQUEST"  // optional
}

Response (Success):
{
  "success": true,
  "message": "취소가 완료되었습니다...",
  "refundAmount": 120000,
  "refundStatus": "pending",
  "reservationId": "uuid"
}

Response (Error):
{
  "error": "Cancellation not allowed",
  "reason": "임박딜 상품은 취소/환불이 불가합니다...",
  "canCancel": false
}
```

### 3. Mark No-Show (Admin POST)
```bash
POST /api/admin/no-show
Content-Type: application/json

{
  "reservationId": "uuid",
  "adminUserId": "uuid"
}

Response:
{
  "success": true,
  "message": "노쇼 처리 완료. 사용자 계정이 정지되었습니다.",
  "userSuspended": true
}
```

### 4. Get No-Show Candidates (Admin GET)
```bash
GET /api/admin/no-show?date=2026-01-16

Response:
{
  "date": "2026-01-16",
  "totalReservations": 15,
  "candidatesForNoShow": 3,
  "reservations": [
    {
      "reservationId": "uuid",
      "userId": "uuid",
      "userName": "홍길동",
      "teeOff": "2026-01-16T10:00:00Z",
      ...
    }
  ]
}
```

---

## UI Gating Logic

### Show/Hide Cancel Button

```typescript
// In reservation detail page
const [canCancel, setCanCancel] = useState(false);

useEffect(() => {
  async function checkCancellation() {
    const res = await fetch(`/api/reservations/cancel?reservationId=${id}`);
    const data = await res.json();
    setCanCancel(data.canCancel);
  }
  checkCancellation();
}, [id]);

// Render
{canCancel ? (
  <button onClick={handleCancel}>예약 취소</button>
) : (
  <p className="text-gray-500">
    취소 불가 - 골프장으로 문의하세요
  </p>
)}
```

---

### Display Cancellation Badge

```typescript
import CancellationBadge from '@/components/CancellationBadge';

<CancellationBadge
  reservation={reservation}
  teeTime={teeTime}
  isImminentDeal={reservation.is_imminent_deal}
  showDescription={true}
  cutoffHours={24}
/>
```

**Badge Colors**:
- 🟢 Green: "취소 가능" (can cancel)
- 🟠 Orange: "취소 불가" (past cutoff)
- 🔴 Red: "취소/환불 불가" (imminent deal)

---

## Booking Flow Integration

### 1. Check User Suspension Before Booking

```typescript
async function handleBooking(teeTimeId: string, userId: string) {
  // Step 1: Check if user is suspended
  const checkRes = await fetch(`/api/users/can-book?userId=${userId}`);
  const checkData = await checkRes.json();

  if (!checkData.canBook) {
    alert(checkData.reason);  // "노쇼로 인해 예약이 제한되었습니다..."
    return;
  }

  // Step 2: Proceed with booking
  // ...
}
```

### 2. Mark Reservation as Imminent Deal

```typescript
// When creating reservation for imminent deal
await supabase.from('reservations').insert({
  user_id: userId,
  tee_time_id: teeTimeId,
  final_price: price,
  is_imminent_deal: true,  // ← Set to TRUE for imminent deals
  policy_version: 'v2',
  // ...
});
```

---

## Test Scenarios Checklist

### Scenario 1: Standard Tee, 30h Before
- [x] `canUserCancelReservation()` returns TRUE
- [x] `requestCancellation()` succeeds
- [x] `refund_amount` = `final_price`
- [x] Reservation status = 'CANCELLED'
- [x] Tee time status = 'OPEN'

### Scenario 2: Standard Tee, 12h Before
- [x] `canUserCancelReservation()` returns FALSE
- [x] Reason contains "24시간 전"
- [x] UI hides cancel button
- [x] API returns 400 error

### Scenario 3: Imminent Deal
- [x] `canUserCancelReservation()` returns FALSE
- [x] Reason contains "임박딜"
- [x] Badge shows "취소/환불 불가"
- [x] Cancel button hidden

### Scenario 4: No-Show Marking
- [x] Can only mark PAID reservations
- [x] Must wait 30 minutes after tee-off
- [x] User suspended after no-show
- [x] `no_show_count` incremented

### Scenario 5: Suspended User Booking
- [x] `canUserBook()` returns FALSE
- [x] Booking button disabled
- [x] Error message displayed

### Scenario 6: Suspension Expiry
- [x] Expired suspension auto-lifted
- [x] User can book again
- [x] `is_suspended` = FALSE

---

## Common Issues & Solutions

### Issue 1: "Cancellation not allowed" but hoursLeft > 24

**Cause**: Reservation might be imminent deal or already cancelled

**Debug**:
```typescript
console.log('is_imminent_deal:', reservation.is_imminent_deal);
console.log('cancelled_at:', reservation.cancelled_at);
console.log('status:', reservation.status);
```

---

### Issue 2: No-show marking fails with "Grace period not passed"

**Cause**: Current time < tee_off + 30 minutes

**Solution**: Wait until grace period ends or adjust grace period:
```sql
UPDATE cancellation_policies
SET no_show_grace_period_minutes = 15
WHERE name = 'STANDARD_V2';
```

---

### Issue 3: User not suspended after no-show

**Cause**: Suspension might be disabled in policy

**Debug**:
```sql
SELECT no_show_suspension_enabled
FROM cancellation_policies
WHERE name = 'STANDARD_V2';
```

**Fix**:
```sql
UPDATE cancellation_policies
SET no_show_suspension_enabled = TRUE
WHERE name = 'STANDARD_V2';
```

---

### Issue 4: Payment refund not processing

**Cause**: `processPaymentRefund()` is a placeholder

**Solution**: Implement actual PG API integration:
```typescript
// In utils/cancellationPolicyV2.ts
export async function processPaymentRefund(
  reservationId: string,
  refundAmount: number,
  paymentKey: string
): Promise<{ success: boolean; message: string }> {
  // TODO: Call Toss Payments API
  const response = await fetch(
    `https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(TOSS_SECRET_KEY + ':').toString('base64')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        cancelReason: 'User requested cancellation',
        cancelAmount: refundAmount
      })
    }
  );

  return {
    success: response.ok,
    message: response.ok ? 'Refund processed' : 'Refund failed'
  };
}
```

---

## Migration Steps

### Step 1: Run Database Migration
```bash
# Apply migration
psql -h your-db-host -U your-user -d tugol_db \
  -f supabase/migrations/20260116_cancellation_policy_v2.sql
```

### Step 2: Verify Tables Created
```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('reservations', 'users', 'cancellation_policies');

-- Check if new columns added
SELECT column_name FROM information_schema.columns
WHERE table_name = 'reservations'
AND column_name IN ('is_imminent_deal', 'cancelled_at', 'refund_amount');
```

### Step 3: Test Functions
```sql
-- Test cancellation check
SELECT * FROM can_user_cancel_reservation('test-reservation-id');

-- Test user booking check
SELECT * FROM can_user_book('test-user-id');
```

### Step 4: Update Client Code
- Add suspension check to booking flow
- Add cancellation UI to reservation detail
- Update tee time cards with cancellation badges

---

## Monitoring & Analytics

### Key Metrics to Track

1. **Cancellation Rate**:
```sql
SELECT
  COUNT(*) FILTER (WHERE status = 'CANCELLED') * 100.0 / COUNT(*) as cancellation_rate
FROM reservations
WHERE created_at >= NOW() - INTERVAL '30 days';
```

2. **No-Show Rate**:
```sql
SELECT
  COUNT(*) FILTER (WHERE status = 'NO_SHOW') * 100.0 / COUNT(*) as no_show_rate
FROM reservations
WHERE created_at >= NOW() - INTERVAL '30 days';
```

3. **Suspension Count**:
```sql
SELECT COUNT(*) as suspended_users
FROM users
WHERE is_suspended = TRUE;
```

4. **Imminent Deal Cancellation Attempts**:
```sql
-- Check logs for 400 errors on /api/reservations/cancel
-- with is_imminent_deal = true
```

---

## Support & Troubleshooting

**For questions**: Refer to `SDD-04_V2_IMPLEMENTATION_SUMMARY.md`

**For API reference**: See API routes in `app/api/reservations/cancel/` and `app/api/admin/no-show/`

**For database functions**: See `supabase/migrations/20260116_cancellation_policy_v2.sql`

**Last Updated**: 2026-01-16
