# Pricing Engine: V1 vs V2 Comparison

## Quick Reference

| Feature | V1 (pricingEngineV2.ts) | V2 (pricingEngineV3.ts) | Impact |
|---------|-------------------------|-------------------------|--------|
| **File** | `utils/pricingEngineV2.ts` | `utils/pricingEngineV3.ts` | New file |
| **Config** | `utils/pricingConfig.ts` | `utils/pricingConfigV2.ts` | New file |
| **Tests** | `utils/__tests__/pricingEngineV2.test.ts` | `utils/__tests__/pricingEngineV3.test.ts` | New file |
| **Layers** | 7 (Weather→Time→Sales→Segment→LBS→Cap→Panic) | 7 (Block→Step→Percent→Cap→Round→Panic→Breakdown) | Reordered |
| **Test Scenarios** | 17 tests | 31 tests | +14 tests |

---

## Layer-by-Layer Comparison

### Layer 1: Weather/Block

#### V1: Weather Layer (Blocking + Discount)
```typescript
// Blocking condition
if (rn1 >= 10mm) → BLOCK

// Discount tiers (applied as percent)
rn1 >= 5mm + pop >= 60% → 20% discount
rn1 >= 1mm + pop >= 40% → 10% discount
rn1 >= 0mm + pop >= 30% → 5% discount
```

#### V2: Block Layer (Blocking only)
```typescript
// Blocking condition
if (rn1 >= 15mm AND pop >= 70%) → BLOCK

// No discount in block layer
// Weather discount moved to Layer 3 (Percent)
```

**Key Differences:**
- ✅ **Stricter blocking** (15mm vs 10mm)
- ✅ **POP now required** for blocking (70%+)
- ✅ **Cleaner separation** (blocking vs discounting)

---

### Layer 2: Time/Step

#### V1: Time Layer (Fixed discounts)
```typescript
// Applied AFTER weather discount
time <= 120~90 → Step 1 → 1 × stepAmount
time <= 90~60  → Step 2 → 2 × stepAmount
time <= 60~30  → Step 3 → 3 × stepAmount

stepAmount = base >= 100k ? 10k : 5k

// Example: 150k base, 10% weather, Step 2
// 1. Weather: 150k × 0.10 = -15k → 135k
// 2. Step: 135k - 20k = 115k
```

#### V2: Step Layer (Fixed discounts)
```typescript
// Applied BEFORE percent discounts
time <= 120~90 → Step 1 → 1 × stepAmount
time <= 90~60  → Step 2 → 2 × stepAmount
time <= 60~30  → Step 3 → 3 × stepAmount

stepAmount = base >= 100k ? 10k : 5k

// Example: 150k base, 15% weather, Step 2
// 1. Step: 150k - 20k = 130k
// 2. Weather: 130k × 0.15 = -19.5k → 110.5k
```

**Key Differences:**
- ✅ **Order reversed** (step BEFORE percent)
- ✅ **Maximizes total discount** (percent applies to lower base)
- ✅ **Same step thresholds** (120/90/60/30)

**Impact Example:**
```
Base: 150,000원, Weather: 10%, Step 2 (-20k)

V1: 150k → (-15k weather) → 135k → (-20k step) = 115,000원
V2: 150k → (-20k step) → 130k → (-13k weather) = 117,000원

Difference: V1 gives MORE discount (-35k vs -33k)
```

---

### Layer 3: Sales/Percent Discounts

#### V1: Sales Layer (Occupancy-based)
```typescript
slotSalesRate >= 0.7 → 0% (high demand)
slotSalesRate >= 0.4 → 5% (medium)
slotSalesRate < 0.4  → 10% (low) + PANIC flag

// Applied as percentage to current price
```

#### V2: Percent Layer (4 factors combined)
```typescript
// A. Weather (RN1-based, no POP requirement)
rn1 >= 10mm → 15%
rn1 >= 5mm  → 10%
rn1 >= 1mm  → 5%
rn1 < 1mm   → 0%

// B. Sales (same as V1)
slotSalesRate >= 0.7 → 0%
slotSalesRate >= 0.4 → 5%
slotSalesRate < 0.4  → 10%

// C. LBS (NEW: 2 tiers)
distance <= 5km  → 10%
distance <= 20km → 5%
distance > 20km  → 0%

// D. Segment (NEW: includes CHERRY penalty)
FUTURE   → 0%
SMART    → 3%
PRESTIGE → 5%
CHERRY   → -3% (penalty!)

// Total = A + B + C + D (all rates summed)
```

**Key Differences:**
- ✅ **Weather separated** from blocking (pure RN1 tiers)
- ✅ **LBS expanded** to 2 tiers (was 1 tier at 15km)
- ✅ **Segment added CHERRY** penalty (-3%)
- ✅ **All applied together** to post-step price

---

### Layer 4-7: Segment, LBS, Cap, Panic (V1) vs Cap, Round, Panic, Breakdown (V2)

#### V1: Segment → LBS → Cap → Panic
```typescript
// Layer 4: Segment (applied after sales)
PRESTIGE → 5%
SMART → 3%

// Layer 5: LBS (applied after segment)
distance <= 15km → 10%

// Layer 6: Cap (max 40% total)
if (totalRate > 0.40) → cap to 40%

// Layer 7: Panic
if (time <= 30 && sales < 0.4 && OPEN) → isPanic
```

#### V2: Cap → Round → Panic → Breakdown
```typescript
// Layer 4: Cap & Floor (applied to total rate)
MAX: 40%
MIN: -5% (allows CHERRY penalty)

if (rate > 0.40) → cap to 40%
if (rate < -0.05) → floor to -5%

// Layer 5: Rounding (final price cleanup)
roundToNearest(price, 100)

// Layer 6: Panic (NEW condition)
if (30 < time <= 60 && sales < 0.4 && !blocked) → isPanic

// Layer 7: Breakdown (structured output)
{
  totalDiscountRate, totalDiscountAmount, rawDiscountRate,
  layers: { step, percentDiscounts, capFloor, rounding }
}
```

**Key Differences:**
- ✅ **Cap includes floor** (-5% minimum)
- ✅ **Rounding added** (nearest 100)
- ✅ **Panic window changed** (30-60 mins, was 0-30 mins)
- ✅ **Breakdown structured** (was flat factors array)

---

## Discount Calculation Examples

### Example 1: No Extreme Discounts

**Context:**
- Base: 120,000원
- Time: 100 mins (Step 1)
- Weather: 2mm rain
- Sales: 55% occupancy
- Distance: 10km
- Segment: SMART

#### V1 Calculation:
```
1. Weather: 120k × 5% = -6k → 114k
2. Step 1: 114k - 10k = 104k
3. Sales: 104k × 5% = -5.2k → 98.8k
4. Segment: 98.8k × 3% = -2.96k → 95.84k
5. LBS: 95.84k × 10% = -9.58k → 86.26k
6. Cap: 33.74k / 120k = 28% → NO CAP

Final: 86,260원 (28% discount)
```

#### V2 Calculation:
```
1. Block: 2mm < 15mm → NOT BLOCKED
2. Step 1: 120k - 10k = 110k
3. Percent:
   - Weather: 5%
   - Sales: 5%
   - LBS: 5% (10km is <=20km tier)
   - Segment: 3%
   Total: 18% × 110k = -19.8k → 90.2k
4. Cap: (10k + 19.8k) / 120k = 24.8% → NO CAP
5. Round: 90,200 → 90,200

Final: 90,200원 (24.8% discount)
```

**Result:** V1 gives MORE discount (86,260 vs 90,200) due to compounding

---

### Example 2: Extreme Discounts (Cap Enforcement)

**Context:**
- Base: 150,000원
- Time: 40 mins (Step 3)
- Weather: 12mm rain
- Sales: 25% occupancy
- Distance: 3km
- Segment: PRESTIGE

#### V1 Calculation:
```
1. Weather: 150k × 20% = -30k → 120k
2. Step 3: 120k - 30k = 90k
3. Sales: 90k × 10% = -9k → 81k
4. Segment: 81k × 5% = -4.05k → 76.95k
5. LBS: 76.95k × 10% = -7.7k → 69.25k
6. Cap: 80.75k / 150k = 53.8% → CAP to 40%

Final: 90,000원 (40% capped)
```

#### V2 Calculation:
```
1. Block: 12mm < 15mm → NOT BLOCKED
2. Step 3: 150k - 30k = 120k
3. Percent:
   - Weather: 15%
   - Sales: 10%
   - LBS: 10%
   - Segment: 5%
   Total: 40% × 120k = -48k → 72k
4. Raw total: (30k + 48k) / 150k = 52% → CAP to 40%
5. Capped: 150k × 0.4 = 60k → 90k
6. Round: 90,000 → 90,000

Final: 90,000원 (40% capped)
```

**Result:** Both capped at 90,000원, but V2 hits cap harder (52% raw vs 53.8%)

---

## Migration Checklist

### Backend Code

- [ ] Import new engine: `import { calculatePricingV2 } from '@/utils/pricingEngineV3'`
- [ ] Update context: Add `userDistanceKm`, `slotSalesRate` fields
- [ ] Update result handling: Use `result.breakdown.layers.*` instead of `result.factors[]`
- [ ] Update panic logic: Remove time check (already in engine)
- [ ] Test blocking: Verify 15mm + 70% POP threshold
- [ ] Test CHERRY segment: Verify -3% penalty applied

### Frontend Code

- [ ] Update price display: Use `breakdown.totalDiscountAmount`
- [ ] Update discount list: Parse `breakdown.layers.percentDiscounts.*`
- [ ] Update panic UI: Check `isPanicCandidate` only (no time check needed)
- [ ] Update tooltips: Show layer-by-layer breakdown
- [ ] Test rounding: Verify prices end in 00

### Database

- [ ] No schema changes required (V2 uses same tables as V1)
- [ ] Optional: Add index on `weather_cache(target_date, target_hour)`
- [ ] Optional: Add `discount_breakdown_v2` column to reservations

### Configuration

- [ ] Review block threshold: 15mm vs 10mm
- [ ] Review LBS tiers: 5km/20km vs 15km
- [ ] Review panic window: 30-60 mins vs 0-30 mins
- [ ] Define CHERRY segment rules: When to apply -3% penalty
- [ ] Test cap/floor: Verify 40%/-5% enforcement

---

## Performance Comparison

| Metric | V1 | V2 | Notes |
|--------|----|----|-------|
| Calculation time | < 1ms | < 1ms | Same (in-memory) |
| Database queries | 2-3 | 2-3 | Same (weather + sales) |
| Result size | ~1KB | ~2-3KB | V2 breakdown is larger |
| Test coverage | 17 scenarios | 31 scenarios | +82% coverage |

---

## Recommendation

### When to Use V1
- Already in production and working well
- Need compounding discounts (more aggressive)
- Prefer simpler breakdown structure
- Weather blocking at 10mm is sufficient

### When to Use V2
- Starting new implementation
- Need stricter weather blocking (15mm)
- Want structured breakdown for analytics
- Need CHERRY segment penalty
- Want 2-tier LBS system
- Prefer step-before-percent for predictability

### Migration Strategy
1. **Parallel Run** (Recommended):
   - Deploy V2 alongside V1
   - Route 10% of traffic to V2 for testing
   - Compare revenue, conversion, user satisfaction
   - Gradually increase V2 traffic

2. **A/B Test**:
   - 50/50 split for 2 weeks
   - Measure: avg discount, revenue, booking rate
   - Choose winner based on data

3. **Feature Flag**:
   - Add config: `PRICING_ENGINE_VERSION=v1|v2`
   - Toggle per golf club or user segment
   - Monitor metrics before full rollout

---

## Summary

**V1 Strengths:**
- Compounding discounts = higher total discount
- Simpler result structure
- Proven in production (if applicable)

**V2 Strengths:**
- Clearer layer separation (block, step, percent)
- Structured breakdown for analytics
- CHERRY penalty for abuse prevention
- 2-tier LBS for better targeting
- Rounding for cleaner prices
- Stricter weather blocking (safer)
- Better panic detection window

**Bottom Line:** V2 is more production-ready with better structure, but V1 gives slightly higher discounts due to compounding. Choose based on business goals (revenue protection vs aggressive discounting).
