/**
 * SDD-07: Settlement & Billing Module - Test Scenarios
 *
 * Comprehensive test scenarios for the settlement and billing system
 */

# Settlement & Billing Test Scenarios

## Test Scenario 1: Basic Monthly Settlement Creation

### Setup
- Golf Club: "Incheon Club 72"
- Period: January 1-31, 2026
- Reservations in period: 10 total
  - 6 PAID (no cancellations)
  - 2 CANCELLED (partial refunds)
  - 1 NO_SHOW
  - 1 PENDING (should be excluded)

### Configuration
- Commission rate: 10% (0.10)
- Include NO_SHOW: true
- Include CANCELLED: true
- Include REFUNDED: true

### Expected Results

**Preview Calculation**:
```
Total reservations: 10
Included reservations: 9 (excludes 1 PENDING)
Excluded reservations: 1 (PENDING)
Already settled: 0

Gross amount: 900,000 KRW (6 × 100k + 2 × 100k + 1 × 100k)
Refund amount: 150,000 KRW (2 cancelled × 75k each)
Net amount: 750,000 KRW
Platform fee (10%): 75,000 KRW
Club payout: 675,000 KRW
```

**After Creation**:
- Settlement status: DRAFT
- 9 reservations linked to settlement (settlement_id set)
- 1 PENDING reservation not linked

**Status Transitions**:
1. DRAFT → CONFIRMED: Success
   - confirmed_at timestamp set
   - confirmed_by_user_id set

2. CONFIRMED → LOCKED: Success (SUPER_ADMIN only)
   - locked_at timestamp set
   - locked_by_user_id set
   - Further modifications blocked

---

## Test Scenario 2: Overlapping Period Detection

### Setup
- Golf Club: "Seoul Country Club"
- Existing settlement: Jan 1-31, 2026 (CONFIRMED)
- Attempt to create: Jan 15-Feb 15, 2026

### Expected Results

**Validation Errors**:
```
Warning: "15 reservation(s) already included in another settlement and will be excluded"
```

**Behavior**:
- Only reservations NOT in existing settlement are included
- Preview shows split: 15 already settled, 15 new
- Creation succeeds with only 15 new reservations

---

## Test Scenario 3: Commission Rate Variation

### Setup
- Golf Club: "Premium Golf Resort"
- Period: January 2026
- Net amount: 1,000,000 KRW

### Test Cases

**Case A: 10% Commission (Default)**
```
Net: 1,000,000 KRW
Platform fee: 100,000 KRW (10%)
Club payout: 900,000 KRW
```

**Case B: 15% Commission (Premium tier)**
```
Net: 1,000,000 KRW
Platform fee: 150,000 KRW (15%)
Club payout: 850,000 KRW
```

**Case C: 5% Commission (Promotional rate)**
```
Net: 1,000,000 KRW
Platform fee: 50,000 KRW (5%)
Club payout: 950,000 KRW
```

**Validation**:
- Commission rate must be 0.00 to 1.00
- Rates outside range rejected with validation error

---

## Test Scenario 4: NO_SHOW Inclusion Toggle

### Setup
- Golf Club: "Test Golf Club"
- Period: January 2026
- Reservations:
  - 5 PAID: 500,000 KRW
  - 3 NO_SHOW: 300,000 KRW
  - 2 CANCELLED (50% refund): 100,000 KRW paid, 50,000 KRW refunded

### Test Case A: Include NO_SHOW = true (Default)
```
Gross: 500,000 + 300,000 + 100,000 = 900,000 KRW
Refund: 50,000 KRW
Net: 850,000 KRW
Platform fee (10%): 85,000 KRW
Club payout: 765,000 KRW
```

### Test Case B: Include NO_SHOW = false
```
Gross: 500,000 + 100,000 = 600,000 KRW
Refund: 50,000 KRW
Net: 550,000 KRW
Platform fee (10%): 55,000 KRW
Club payout: 495,000 KRW
```

**Difference**: 300,000 KRW in gross, 30,000 KRW in platform fee

---

## Test Scenario 5: SUPER_ADMIN vs ADMIN vs CLUB_ADMIN Permissions

### User Roles Setup
- User A: SUPER_ADMIN
- User B: ADMIN
- User C: CLUB_ADMIN for "Club A"
- User D: Regular user (no admin)

### Expected Permissions

**User A (SUPER_ADMIN)**:
```
✓ View all settlements (all clubs)
✓ Create settlements (all clubs)
✓ CONFIRM settlements
✓ LOCK settlements
✓ Edit notes (non-LOCKED)
```

**User B (ADMIN)**:
```
✓ View all settlements (all clubs)
✓ Create settlements (all clubs)
✓ CONFIRM settlements
✗ LOCK settlements (only SUPER_ADMIN)
✓ Edit notes (non-LOCKED)
```

**User C (CLUB_ADMIN for Club A)**:
```
✓ View settlements (Club A only)
✓ Create settlements (Club A only)
✓ CONFIRM settlements (Club A only)
✗ LOCK settlements
✓ Edit notes (Club A only, non-LOCKED)
✗ Access Club B settlements
```

**User D (Regular User)**:
```
✗ No access to /admin/settlements
```

### Specific Test: LOCK Action

**Scenario**: Settlement in CONFIRMED status

- User A clicks "정산 잠금": Success → Status = LOCKED
- User B clicks "정산 잠금": Error "Insufficient permissions (SUPER_ADMIN only)"
- User C clicks "정산 잠금": Error "Insufficient permissions"

---

## Test Scenario 6: LOCKED Settlement Immutability

### Setup
- Settlement ID: abc123
- Status: LOCKED
- locked_at: 2026-01-15 14:30:00
- locked_by_user_id: super-admin-id

### Attempted Actions & Expected Results

**1. Update settlement amounts**:
```sql
UPDATE settlements SET net_amount = 999999 WHERE id = 'abc123'
```
Result: ERROR - Trigger blocks update

**2. Update settlement status**:
```sql
UPDATE settlements SET status = 'CONFIRMED' WHERE id = 'abc123'
```
Result: ERROR - "Cannot revert LOCKED settlement"

**3. Update settlement notes**:
```
Admin tries to edit notes via UI
```
Result: UI shows "정산이 잠금 처리되어 수정할 수 없습니다"

**4. Modify linked reservation**:
```sql
UPDATE reservations
SET paid_amount = 50000
WHERE id = 'res123' AND settlement_id = 'abc123'
```
Result: ERROR - Trigger blocks "Cannot modify reservation that is part of a LOCKED settlement"

**5. Add new reservation to LOCKED settlement**:
```sql
UPDATE reservations
SET settlement_id = 'abc123'
WHERE id = 'new-res'
```
Result: ERROR - Prevented by trigger

---

## Test Scenario 7: Edge Case - Zero Revenue Period

### Setup
- Golf Club: "Seasonal Golf Club"
- Period: December 2025 (winter closure)
- Reservations: 0

### Expected Results

**Preview**:
```
Total reservations: 0
Included reservations: 0
Excluded reservations: 0

Gross amount: 0 KRW
Refund amount: 0 KRW
Net amount: 0 KRW
Platform fee: 0 KRW
Club payout: 0 KRW

Warning: "No reservations found in this period"
Warning: "No revenue in this period (gross amount = 0)"

can_create: false
Validation error: "Cannot create settlement with 0 revenue"
```

**Behavior**:
- Preview succeeds, shows warnings
- Create button disabled
- Creation attempt returns error: "Cannot create settlement: validation failed"

---

## Test Scenario 8: Cancelled Reservation with Full Refund

### Setup
- Reservation ID: res-cancel-001
- Original paid_amount: 100,000 KRW
- Cancellation: 3 hours before tee-off (within refund window)
- refund_amount: 100,000 KRW (100% refund per policy)
- Status: CANCELLED

### Settlement Calculation

**Configuration**: include_cancelled = true

```
Reservation contribution:
- paid_amount: 100,000 KRW
- refund_amount: 100,000 KRW
- net_contribution: 0 KRW

Settlement totals (assuming this is only reservation):
- Gross: 100,000 KRW
- Refund: 100,000 KRW
- Net: 0 KRW
- Platform fee: 0 KRW (0% of 0)
- Club payout: 0 KRW
```

**Expected Behavior**:
- Reservation included in count
- No net revenue impact
- Settlement can still be created if other reservations exist

---

## Test Scenario 9: Filter and Search Functionality

### Setup
- 50 settlements across 5 golf clubs
- Date range: Jan 2025 to Dec 2025
- Statuses: 20 DRAFT, 15 CONFIRMED, 15 LOCKED

### Test Cases

**Filter by Golf Club**:
```
Select: "Incheon Club 72"
Expected: Only settlements for Incheon Club 72 displayed
```

**Filter by Status**:
```
Select: "CONFIRMED"
Expected: 15 settlements with status=CONFIRMED
```

**Filter by Year/Month**:
```
Select: Year=2025, Month=6 (June)
Expected: Only settlements with period overlapping June 2025
```

**Search by Golf Club Name**:
```
Input: "Incheon"
Expected: Client-side filter shows all settlements containing "Incheon" in club name
```

**Search by Settlement ID**:
```
Input: "abc12345"
Expected: Shows settlement with ID starting with "abc12345"
```

**Combined Filters**:
```
Golf Club: "Seoul CC"
Status: "LOCKED"
Year: 2025
Month: 12

Expected: Only LOCKED settlements for Seoul CC in December 2025
```

---

## Test Scenario 10: Multi-step Wizard Flow

### Setup
- Admin user navigating through /admin/settlements/new

### Step 1: Golf Club Selection
```
User Action: Click "Incheon Club 72" card
Expected: Card highlights, checkmark appears
User Action: Click "다음" button
Expected: Navigate to Step 2 (Period)
```

### Step 2: Period Selection
```
User Action: Click "이번달" quick select
Expected: period_start and period_end auto-filled with current month dates

User Action: Click "직접 선택"
User Action: Select custom dates (2026-01-01 to 2026-01-15)
Expected: Green confirmation box shows selected range

User Action: Click "다음"
Expected: Navigate to Step 3 (Config)
```

### Step 3: Configuration
```
User Action: Change commission rate to 0.15
Expected: Display shows "15.0%"

User Action: Uncheck "노쇼 (NO_SHOW) 포함"
Expected: include_no_show = false

User Action: Enter notes: "January mid-month settlement"
Expected: Notes saved in state

User Action: Click "미리보기"
Expected: Loading spinner → API call → Navigate to Step 4 (Preview)
```

### Step 4: Preview
```
Expected Display:
- Summary card with all calculated amounts
- Warning/error alerts (if any)
- Preview table of first 10 reservations
- "...외 N건 더 있습니다" if > 10 reservations

User Action: Click "정산 생성"
Expected:
- Loading spinner
- API call to createSettlement
- On success: Redirect to /admin/settlements/{new-id}
- Settlement status: DRAFT
```

### Edge Cases in Wizard

**Back Navigation**:
```
User at Step 4 (Preview)
User Action: Click "설정 수정"
Expected: Return to Step 3, all form data preserved
```

**Validation Error**:
```
User at Step 4, previewed period with already-settled reservations
Expected: Warning message displayed, can_create might be false
User Action: Click "정산 생성"
Expected: Error message, no settlement created
```

---

## Performance Test Scenarios

### Scenario 11: Large Settlement (1000+ Reservations)

**Setup**:
- Golf Club: High-volume club
- Period: Full month (31 days)
- Reservations: 1,200 total (40/day average)

**Performance Requirements**:
```
Preview calculation: < 5 seconds
Settlement creation: < 10 seconds
Detail page load: < 3 seconds
Reservation list rendering: Paginated or virtualized
```

**Expected Optimizations**:
- Database query uses indexes on (golf_club_id, tee_off, settlement_id)
- Reservation preview limited to 10 items in wizard
- Detail page loads reservations with cursor pagination

---

## Integration Test Scenarios

### Scenario 12: End-to-End Settlement Lifecycle

**Full Flow**:

1. **Create Settlement**:
   ```
   POST /admin/settlements/new
   - Golf Club: "Test Club"
   - Period: Jan 1-31, 2026
   - Result: Settlement ID = "settlement-001", status = DRAFT
   ```

2. **Verify Reservation Links**:
   ```sql
   SELECT COUNT(*) FROM reservations WHERE settlement_id = 'settlement-001'
   Result: 25 reservations linked
   ```

3. **Confirm Settlement**:
   ```
   PUT /admin/settlements/settlement-001/status
   - new_status: CONFIRMED
   - admin_user_id: "admin-123"
   Result: status = CONFIRMED, confirmed_at set
   ```

4. **Attempt to Modify Linked Reservation (Should Fail)**:
   ```sql
   UPDATE reservations
   SET paid_amount = 50000
   WHERE id = 'res-in-settlement' AND settlement_id = 'settlement-001'

   Expected: ERROR (reservation in CONFIRMED settlement)
   ```

5. **Lock Settlement** (SUPER_ADMIN):
   ```
   PUT /admin/settlements/settlement-001/status
   - new_status: LOCKED
   - admin_user_id: "super-admin-456"
   Result: status = LOCKED, locked_at set
   ```

6. **Attempt to Modify Settlement (Should Fail)**:
   ```
   PUT /admin/settlements/settlement-001/notes
   - notes: "Updated notes"

   Expected: ERROR "Cannot modify locked settlement"
   ```

7. **View Final Settlement**:
   ```
   GET /admin/settlements/settlement-001

   Expected Response:
   - status: LOCKED
   - All amounts frozen
   - Audit trail complete (created_by, confirmed_by, locked_by)
   - can_edit: false
   - can_confirm: false
   - can_lock: false
   ```

---

## QA Checklist

### Functional Testing
- [ ] Settlement preview calculation accurate
- [ ] Settlement creation links reservations correctly
- [ ] Duplicate settlement period prevented
- [ ] Commission rate calculations correct
- [ ] NO_SHOW inclusion toggle works
- [ ] CANCELLED inclusion toggle works
- [ ] REFUNDED inclusion toggle works
- [ ] Status transitions (DRAFT→CONFIRMED→LOCKED) work
- [ ] Invalid status transitions blocked
- [ ] LOCKED settlements are immutable
- [ ] Notes editing works (non-LOCKED only)

### Permission Testing
- [ ] SUPER_ADMIN has all permissions
- [ ] ADMIN cannot LOCK settlements
- [ ] CLUB_ADMIN sees only their clubs
- [ ] Regular users blocked from admin pages
- [ ] Permission checks on all server actions

### UI/UX Testing
- [ ] Settlement list displays correctly
- [ ] Filters work (club, status, year, month)
- [ ] Client-side search functional
- [ ] Wizard navigation smooth (back/forward)
- [ ] Preview displays warnings
- [ ] Detail page shows all info
- [ ] Status badges correct colors
- [ ] Currency formatting correct (KRW)
- [ ] Date formatting correct (ko-KR)
- [ ] Loading states shown during async ops
- [ ] Error messages displayed clearly

### Integration Testing
- [ ] Reservations link to settlements correctly
- [ ] settlement_id updates on reservation table
- [ ] Triggers prevent LOCKED modifications
- [ ] View (settlement_summary) returns correct data
- [ ] Golf club relations load correctly
- [ ] User audit trail populated

### Edge Cases
- [ ] Zero revenue period handled
- [ ] 100% refund reservations calculated correctly
- [ ] Empty period (no reservations) rejected
- [ ] Already-settled reservations excluded
- [ ] Large settlements (1000+ reservations) perform well

### Performance Testing
- [ ] Preview calculation < 5 sec (1000 reservations)
- [ ] Settlement creation < 10 sec
- [ ] List page load < 2 sec
- [ ] Detail page load < 3 sec
- [ ] Search/filter responsive

### Security Testing
- [ ] SQL injection prevented (parameterized queries)
- [ ] Admin-only routes protected
- [ ] RLS policies enforce access control
- [ ] CSRF protection on state changes
- [ ] Audit trail immutable after LOCK

---

## Regression Testing After Future Changes

### When Adding New Reservation Status
```
Example: Adding "PARTIAL_PAYMENT" status

Tests to Run:
1. Verify settlement calculation excludes PARTIAL_PAYMENT (or includes based on business logic)
2. Update config to support include_partial_payment toggle
3. Verify breakdown_by_status includes new status
4. Update UI status badges
```

### When Changing Commission Rate Structure
```
Example: Club-specific commission rates

Tests to Run:
1. Verify getClubCommissionRate() function
2. Settlement preview uses correct rate per club
3. Historical settlements preserve original rate (no recalculation)
4. UI displays club-specific rates
```

### When Adding Refund Complexity
```
Example: Partial refunds, late cancellation penalties

Tests to Run:
1. Verify refund_amount calculation accuracy
2. Settlement net_amount reflects complex refund rules
3. Reservation detail shows refund breakdown
4. Policy version tracked per settlement
```

---

## Test Data Setup Scripts

### SQL Script: Generate Test Data
```sql
-- Insert test golf club
INSERT INTO golf_clubs (id, name, location_name)
VALUES (999, 'Test Golf Club', 'Seoul, Gangnam-gu');

-- Insert test users
INSERT INTO users (id, email, name, is_super_admin, is_admin)
VALUES
  ('test-super-admin', 'super@test.com', 'Super Admin', true, false),
  ('test-admin', 'admin@test.com', 'Admin User', false, true),
  ('test-user-1', 'user1@test.com', 'Test User 1', false, false);

-- Insert test tee times (January 2026)
INSERT INTO tee_times (golf_club_id, tee_off, base_price, status)
SELECT
  999,
  '2026-01-' || LPAD(d::text, 2, '0') || ' 09:00:00',
  100000,
  'BOOKED'
FROM generate_series(1, 31) AS d;

-- Insert test reservations
INSERT INTO reservations (
  tee_time_id, user_id, base_price, final_price, paid_amount,
  status, refund_amount, policy_version
)
SELECT
  tt.id,
  'test-user-1',
  tt.base_price,
  tt.base_price,
  tt.base_price,
  CASE
    WHEN random() < 0.1 THEN 'CANCELLED'
    WHEN random() < 0.05 THEN 'NO_SHOW'
    ELSE 'PAID'
  END,
  CASE WHEN random() < 0.1 THEN tt.base_price * 0.5 ELSE 0 END,
  'STANDARD_V2'
FROM tee_times tt
WHERE tt.golf_club_id = 999;
```

---

## Test Execution Tracking

| Scenario | Status | Tester | Date | Notes |
|----------|--------|--------|------|-------|
| 1. Basic Monthly Settlement | ⏳ Pending | - | - | - |
| 2. Overlapping Period | ⏳ Pending | - | - | - |
| 3. Commission Rate Variation | ⏳ Pending | - | - | - |
| 4. NO_SHOW Toggle | ⏳ Pending | - | - | - |
| 5. Permissions | ⏳ Pending | - | - | - |
| 6. LOCKED Immutability | ⏳ Pending | - | - | - |
| 7. Zero Revenue Edge Case | ⏳ Pending | - | - | - |
| 8. Full Refund Cancellation | ⏳ Pending | - | - | - |
| 9. Filter/Search | ⏳ Pending | - | - | - |
| 10. Wizard Flow | ⏳ Pending | - | - | - |
| 11. Performance (Large) | ⏳ Pending | - | - | - |
| 12. End-to-End Lifecycle | ⏳ Pending | - | - | - |

---

**Test Scenarios Document Version**: 1.0
**Last Updated**: 2026-01-17
**Author**: TUGOL Development Team
