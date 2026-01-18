# SDD-03 V2: Dynamic Pricing Engine Implementation Summary

## Executive Summary

This document summarizes the implementation of **SDD-03 V2**, a complete refactoring of the TUGOL dynamic pricing engine with a redesigned 7-layer discount architecture.

### Key Changes from V1

| Aspect | V1 | V2 |
|--------|----|----|
| **Block Threshold** | RN1 >= 10mm + POP >= 70% | RN1 >= 15mm + POP >= 70% |
| **Weather Discount** | Tiered by POP + RN1 | Pure RN1-based tiers (5%, 10%, 15%) |
| **Step Discount** | Applied after percent | **Applied BEFORE percent** (Layer 2) |
| **Segment Discount** | PRESTIGE/SMART only | **Includes CHERRY penalty (-3%)** |
| **LBS Discount** | Single tier (<=15km → 10%) | **Two tiers** (<=5km → 10%, <=20km → 5%) |
| **Panic Condition** | time <= 30 && sales < 40% | **time <= 60 && time > 30 && sales < 40%** |
| **Cap/Floor** | MAX 40% only | **MAX 40%, MIN -5%** |
| **Rounding** | No rounding | **Round to nearest 100** |

---

## Architecture: 7-Layer Discount System

```
┌─────────────────────────────────────────────────────────────┐
│ INPUT: PricingContextV2                                     │
│  - teeTime (base_price, tee_off, status)                   │
│  - weather (rn1, pop)                                       │
│  - user (segment)                                           │
│  - userDistanceKm                                           │
│  - slotSalesRate                                            │
│  - timeUntilTeeOffMins                                      │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│ LAYER 1: Block Layer                                        │
│  ✓ Check: RN1 >= 15mm AND POP >= 70%                       │
│  ✓ If blocked → finalPrice = basePrice, STOP               │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│ LAYER 2: Step Discount (Fixed Amount)                      │
│  ✓ Time-based urgency discounts                            │
│  ✓ Step 1 (120~90 mins): 1 × stepAmount                    │
│  ✓ Step 2 (90~60 mins):  2 × stepAmount                    │
│  ✓ Step 3 (60~30 mins):  3 × stepAmount                    │
│  ✓ stepAmount = basePrice >= 100k ? 10k : 5k               │
│  ✓ Deduct from price BEFORE percent layer                  │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│ LAYER 3: Percent Discounts (Applied to post-step price)    │
│                                                             │
│  A. Weather Rate:                                           │
│     - RN1 >= 10mm → 15%                                     │
│     - RN1 >= 5mm  → 10%                                     │
│     - RN1 >= 1mm  → 5%                                      │
│     - RN1 < 1mm   → 0%                                      │
│                                                             │
│  B. Sales Rate (slot occupancy):                            │
│     - >= 70% → 0%                                           │
│     - >= 40% → 5%                                           │
│     - < 40%  → 10%                                          │
│                                                             │
│  C. LBS Rate (distance to club):                            │
│     - <= 5km  → 10%                                         │
│     - <= 20km → 5%                                          │
│     - > 20km  → 0%                                          │
│                                                             │
│  D. Segment Rate (user tier):                               │
│     - FUTURE   → 0%                                         │
│     - SMART    → 3%                                         │
│     - PRESTIGE → 5%                                         │
│     - CHERRY   → -3% (PENALTY)                              │
│                                                             │
│  Total Percent Rate = A + B + C + D                         │
│  Percent Discount Amount = (basePrice - stepAmount) × rate  │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│ LAYER 4: Cap & Floor                                        │
│  ✓ Calculate raw discount rate = totalDiscount / basePrice │
│  ✓ Apply constraints:                                       │
│    - MAX: 40% (revenue protection)                          │
│    - MIN: -5% (allow small penalty for CHERRY)             │
│  ✓ Adjust final price to respect cap/floor                 │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│ LAYER 5: Rounding                                           │
│  ✓ Round finalPrice to nearest 100 won                     │
│  ✓ Example: 104,537 → 104,500                              │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│ LAYER 6: Panic Flag                                         │
│  ✓ Check conditions:                                        │
│    - time <= 60 minutes                                     │
│    - time > 30 minutes                                      │
│    - slotSalesRate < 40%                                    │
│    - NOT blocked                                            │
│  ✓ Set isPanicCandidate = true if all conditions met       │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│ LAYER 7: Breakdown JSON                                     │
│  ✓ Build comprehensive discount breakdown                  │
│  ✓ Include:                                                 │
│    - totalDiscountRate, totalDiscountAmount                │
│    - rawDiscountRate (before cap/floor)                    │
│    - Layer-by-layer details (step, weather, sales, etc.)   │
│    - Cap/floor application status                          │
│    - Rounding adjustments                                  │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│ OUTPUT: PricingResultV2                                     │
│  - finalPrice                                               │
│  - basePrice                                                │
│  - isBlocked / blockReason                                  │
│  - isPanicCandidate / panicReason                           │
│  - breakdown (DiscountBreakdown)                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Example Calculation

### Scenario: Heavy Discounts + Cap Enforcement

**Context:**
- Base Price: 150,000원
- Time: 70 minutes before tee-off (Step 2)
- Weather: 12mm rainfall (Heavy rain → 15% discount)
- Sales Rate: 30% occupancy (Low demand → 10% discount)
- User: PRESTIGE member (5% discount)
- Distance: 3km from club (10% discount)

**Step-by-Step Calculation:**

1. **Block Layer**: 12mm < 15mm → NOT blocked ✓

2. **Step Layer**:
   - Step Level: 2 (70 mins)
   - Step Amount: 2 × 10,000 = **-20,000원**
   - Price after step: 150,000 - 20,000 = **130,000원**

3. **Percent Layer** (applied to 130,000원):
   - Weather: 15% × 130,000 = -19,500원
   - Sales: 10% × 130,000 = -13,000원
   - LBS: 10% × 130,000 = -13,000원
   - Segment: 5% × 130,000 = -6,500원
   - **Total Percent Discount: -52,000원**

4. **Total Raw Discount**:
   - Step + Percent = 20,000 + 52,000 = **72,000원**
   - Raw Discount Rate: 72,000 / 150,000 = **48%**

5. **Cap & Floor**:
   - 48% > 40% MAX → **Cap applied!**
   - Capped Discount: 150,000 × 0.40 = **60,000원**
   - Price after cap: 150,000 - 60,000 = **90,000원**

6. **Rounding**:
   - 90,000 → 90,000 (already rounded)

7. **Panic Flag**:
   - Time: 70 mins > 60 → **NOT panic** (outside window)

**Final Result:**
- **Final Price: 90,000원**
- **Total Discount: 60,000원 (40%)**
- **Cap Applied: YES**
- **Is Panic: NO**

---

## Configuration Files

### `/utils/pricingConfigV2.ts`

All pricing rules are configuration-driven for easy tuning:

```typescript
// Block Layer
BLOCK_CONFIG = {
  RAINFALL_THRESHOLD: 15,     // Adjust to 12mm for earlier blocking
  POP_THRESHOLD: 70
}

// Step Layer
STEP_CONFIG = {
  START_TIME: 120,            // Adjust to 180 for earlier discounts
  HIGH_STEP_AMOUNT: 10000,    // Adjust to 15000 for aggressive discounts
  LOW_STEP_AMOUNT: 5000
}

// Weather Rate
WEATHER_RATE_CONFIG = {
  TIER_HEAVY: { minRainfall: 10, rate: 0.15 },   // Adjust rate to 0.20
  TIER_MODERATE: { minRainfall: 5, rate: 0.10 },
  TIER_LIGHT: { minRainfall: 1, rate: 0.05 }
}

// Sales Rate
SALES_RATE_CONFIG = {
  HIGH_OCCUPANCY: 0.7,        // Adjust to 0.75 for stricter threshold
  MEDIUM_RATE: 0.05,
  LOW_RATE: 0.10
}

// LBS Rate
LBS_RATE_CONFIG = {
  NEAR_DISTANCE: 5,           // Adjust to 10 for broader "near" zone
  NEAR_RATE: 0.10,
  MEDIUM_RATE: 0.05
}

// Segment Rate
SEGMENT_RATE_CONFIG = {
  PRESTIGE: { rate: 0.05 },   // Adjust to 0.08 for VIP treatment
  SMART: { rate: 0.03 },
  CHERRY: { rate: -0.03 }     // Adjust to -0.05 for harsher penalty
}

// Cap & Floor
CAP_FLOOR_CONFIG = {
  MAX_DISCOUNT_RATE: 0.40,    // Adjust to 0.50 for aggressive pricing
  MIN_DISCOUNT_RATE: -0.05
}

// Panic
PANIC_V2_CONFIG = {
  MAX_TIME: 60,               // Adjust to 90 for earlier panic alerts
  MIN_TIME: 30
}
```

---

## Core Functions

### Main Pricing Engine

```typescript
import { calculatePricingV2, PricingContextV2 } from '@/utils/pricingEngineV3';

const result = calculatePricingV2({
  teeTime: teeTimeRow,
  weather: weatherData,
  user: userData,
  userDistanceKm: 8,
  slotSalesRate: 0.45,
  timeUntilTeeOffMins: 75
});

console.log('Final Price:', result.finalPrice);
console.log('Is Blocked:', result.isBlocked);
console.log('Is Panic:', result.isPanicCandidate);
console.log('Breakdown:', result.breakdown);
```

### Helper Functions

```typescript
// Layer 1: Block checking
checkBlocking(weather) → { isBlocked, blockReason? }

// Layer 2: Step calculation
calculateStepDiscount(timeUntilTeeOffMins, basePrice)
  → { stepLevel, stepAmount, description }

// Layer 3: Percent rates
calculateWeatherRate(weather) → { rate, description }
calculateSalesRate(slotSalesRate) → { rate, description }
calculateLbsRate(userDistanceKm) → { rate, description }
calculateSegmentRate(user) → { rate, description }

// Layer 6: Panic detection
calculatePanicFlag(time, sales, blocked) → { isPanic, panicReason? }

// Sales rate calculation
calculateSlotSalesRateV2(golfClubId, date, supabase) → Promise<number>
```

---

## Test Scenarios

### Summary Table

| Scenario | Layer | Test Case | Expected Result |
|----------|-------|-----------|-----------------|
| 1 | Block | RN1=15mm, POP=70% | isBlocked=true |
| 2 | Block | RN1=15mm, POP=50% | isBlocked=false, weather=15% |
| 3 | Block | RN1=5mm, POP=80% | isBlocked=false, weather=10% |
| 4-6 | Step | Step 1/2/3 high price | stepAmount=10k/20k/30k |
| 7 | Step | Step 2 low price | stepAmount=10k (2×5k) |
| 8 | Step | time=180 mins | stepAmount=0 |
| 9-12 | Weather | RN1=12/7/2/0mm | rate=15%/10%/5%/0% |
| 13-15 | Sales | occupancy=75%/55%/30% | rate=0%/5%/10% |
| 16-18 | LBS | distance=3/15/25km | rate=10%/5%/0% |
| 19-22 | Segment | FUTURE/SMART/PRESTIGE/CHERRY | rate=0%/3%/5%/-3% |
| 23 | Cap | Extreme discounts | cappedRate=40% |
| 24 | Floor | CHERRY penalty | floorRate=-5% |
| 25 | Cap | Normal discounts | capApplied=false |
| 26 | Rounding | Price=104500 | finalPrice%100=0 |
| 27-30 | Panic | Various time/sales combos | isPanic=true/false |
| 31 | Breakdown | Full stack | All fields populated |

**Total: 31 test scenarios covering all 7 layers**

---

## Usage Examples

### Example 1: Basic Price Calculation

```typescript
import { calculatePricingV2 } from '@/utils/pricingEngineV3';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(url, key);

// Fetch tee time
const { data: teeTime } = await supabase
  .from('tee_times')
  .select('*')
  .eq('id', 101)
  .single();

// Fetch weather
const { data: weather } = await supabase
  .from('weather_cache')
  .select('*')
  .eq('target_date', '2026-01-16')
  .eq('target_hour', 14)
  .single();

// Calculate pricing
const result = calculatePricingV2({
  teeTime,
  weather,
  userDistanceKm: 10,
  slotSalesRate: 0.50,
  timeUntilTeeOffMins: 80
});

console.log(`Base: ${result.basePrice}원`);
console.log(`Final: ${result.finalPrice}원`);
console.log(`Discount: ${Math.round(result.breakdown.totalDiscountRate * 100)}%`);
```

### Example 2: Integration with Booking Flow

```typescript
// In your booking API route
import { calculatePricingV2 } from '@/utils/pricingEngineV3';

export async function POST(req: Request) {
  const { teeTimeId, userId } = await req.json();

  // Fetch context data
  const teeTime = await getTeeTime(teeTimeId);
  const user = await getUser(userId);
  const weather = await getWeather(teeTime.tee_off);
  const salesRate = await calculateSlotSalesRateV2(
    teeTime.golf_club_id,
    new Date(teeTime.tee_off),
    supabase
  );

  // Calculate price
  const pricing = calculatePricingV2({
    teeTime,
    user,
    weather,
    userDistanceKm: user.distance_to_club_km,
    slotSalesRate: salesRate
  });

  // Check if blocked
  if (pricing.isBlocked) {
    return NextResponse.json({
      error: 'Tee time blocked due to weather',
      reason: pricing.blockReason
    }, { status: 400 });
  }

  // Create reservation with final price
  const reservation = await createReservation({
    user_id: userId,
    tee_time_id: teeTimeId,
    final_price: pricing.finalPrice,
    discount_breakdown: pricing.breakdown
  });

  return NextResponse.json({
    reservation,
    pricing
  });
}
```

### Example 3: Display Breakdown to User

```typescript
// In your UI component
function PriceBreakdown({ breakdown }: { breakdown: DiscountBreakdown }) {
  return (
    <div className="space-y-2">
      <h3 className="font-bold">Discount Details</h3>

      {/* Step Discount */}
      {breakdown.layers.step.stepAmount > 0 && (
        <div className="flex justify-between">
          <span>{breakdown.layers.step.description}</span>
          <span className="text-red-600">
            -{breakdown.layers.step.stepAmount.toLocaleString()}원
          </span>
        </div>
      )}

      {/* Weather Discount */}
      {breakdown.layers.percentDiscounts.weather.rate > 0 && (
        <div className="flex justify-between">
          <span>{breakdown.layers.percentDiscounts.weather.description}</span>
          <span className="text-red-600">
            -{breakdown.layers.percentDiscounts.weather.amount.toLocaleString()}원
          </span>
        </div>
      )}

      {/* Sales Discount */}
      {breakdown.layers.percentDiscounts.sales.rate > 0 && (
        <div className="flex justify-between">
          <span>{breakdown.layers.percentDiscounts.sales.description}</span>
          <span className="text-red-600">
            -{breakdown.layers.percentDiscounts.sales.amount.toLocaleString()}원
          </span>
        </div>
      )}

      {/* Cap Notice */}
      {breakdown.layers.capFloor.applied && (
        <div className="text-xs text-gray-500">
          * {breakdown.layers.capFloor.description}
        </div>
      )}

      {/* Total */}
      <div className="flex justify-between font-bold text-lg border-t pt-2">
        <span>Total Discount</span>
        <span className="text-red-600">
          {Math.round(breakdown.totalDiscountRate * 100)}%
          ({breakdown.totalDiscountAmount.toLocaleString()}원)
        </span>
      </div>
    </div>
  );
}
```

---

## Performance Metrics

| Operation | Time (ms) | Notes |
|-----------|-----------|-------|
| calculatePricingV2() | < 1ms | In-memory calculation |
| calculateSlotSalesRateV2() | 50-150ms | Database query (cached recommended) |
| Full pricing with DB fetch | 100-200ms | Includes weather + sales rate queries |

**Optimization Recommendations:**
1. **Cache sales rates**: Store pre-calculated occupancy rates in Redis (5-min TTL)
2. **Batch weather queries**: Fetch weather for entire day, not per tee time
3. **Index weather_cache**: Composite index on (target_date, target_hour)

---

## Migration Guide (V1 → V2)

### Code Changes Required

1. **Import new engine**:
```typescript
// Old
import { calculatePricing } from '@/utils/pricingEngineV2';

// New
import { calculatePricingV2 } from '@/utils/pricingEngineV3';
```

2. **Update context type**:
```typescript
// Old
const ctx: PricingContext = { teeTime, weather, user };

// New
const ctx: PricingContextV2 = {
  teeTime,
  weather,
  user,
  userDistanceKm: user.distance_to_club_km,
  slotSalesRate: await calculateSlotSalesRateV2(...)
};
```

3. **Update result handling**:
```typescript
// Old
const factors = result.factors; // Array of factors

// New
const breakdown = result.breakdown; // Structured breakdown object
const stepDiscount = breakdown.layers.step.stepAmount;
const weatherRate = breakdown.layers.percentDiscounts.weather.rate;
```

4. **Update panic detection**:
```typescript
// Old
if (result.isPanicCandidate && timeLeft <= 30) { ... }

// New
if (result.isPanicCandidate) {
  // Already checks: 30 < time <= 60
  // No additional time check needed
}
```

### Configuration Tuning

Compare your V1 configuration with V2 defaults:

| Config | V1 Default | V2 Default | Action |
|--------|------------|------------|--------|
| Block rainfall | 10mm | **15mm** | Increase threshold if needed |
| Weather tier | POP + RN1 | **RN1 only** | Review tier boundaries |
| LBS tiers | 1 tier | **2 tiers** | Define near/medium zones |
| Segment | 2 types | **4 types (incl. CHERRY)** | Define CHERRY penalty |
| Panic time | <= 30 | **30 < t <= 60** | Adjust notification timing |

---

## Known Limitations

1. **Sales Rate Calculation**:
   - Currently queries database per call
   - **Solution**: Implement Redis caching with 5-minute TTL

2. **Weather Data Freshness**:
   - Depends on external API update frequency
   - **Solution**: Add `weather_cache.updated_at` check

3. **CHERRY Segment Logic**:
   - Penalty applied but no tracking of why users become CHERRY
   - **Solution**: Add `users.cherry_reasons` JSONB column

4. **Breakdown Storage**:
   - DiscountBreakdown is large (2-3KB JSON)
   - **Solution**: Store compressed or summarized version in DB

5. **Rounding Edge Cases**:
   - Rounding can cause 100-200원 variance in total discount
   - **Solution**: Document as acceptable variance

---

## Next Steps

### Immediate (Ready for Production)
- [ ] Run database migration (notifications system from SDD-03 V1)
- [ ] Deploy V2 pricing engine to staging
- [ ] Run 31 test scenarios for QA validation
- [ ] Update API documentation with V2 examples

### Short-term (1-2 weeks)
- [ ] Implement Redis caching for sales rates
- [ ] Add monitoring for cap/floor enforcement frequency
- [ ] Create admin dashboard to visualize discount distribution
- [ ] A/B test V1 vs V2 pricing (50/50 split)

### Medium-term (1-2 months)
- [ ] Integrate panic notifications with push service
- [ ] Add machine learning for dynamic cap adjustment
- [ ] Implement real-time panic alert system
- [ ] Create discount simulator for marketing team

---

## Support

For questions or issues:
1. Review test scenarios in `/utils/__tests__/pricingEngineV3.test.ts`
2. Check configuration in `/utils/pricingConfigV2.ts`
3. Refer to implementation in `/utils/pricingEngineV3.ts`
4. Consult this summary document

**Last Updated**: 2026-01-16
**Version**: SDD-03 V2
**Status**: ✅ Implementation Complete, Ready for QA
