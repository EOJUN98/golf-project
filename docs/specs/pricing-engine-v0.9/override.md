# TUGOL Override & Acceptance Spec (v0.9)

## 1. Override Structure
Capturing the difference between Machine Intelligence and Human Intuition.

```jsonc
{
  "request_id": "REQ-001",
  "timestamp": "...",
  "segment": "WEEKDAY_VALUE",
  "recommended_price": 138000,
  "final_price": 145000,
  "override_amount": 7000,
  "override_rate": 0.0507 // +5.07%
}
```

## 2. Derived Metrics
- **Deviation:** `final_price - recommended_price`
- **Deviation Rate:** `Deviation / recommended_price`
- **Bias:** Moving average of Deviation Rate over time.

## 3. Acceptance Logic
- **Accepted:** If `|Deviation Rate| <= 0.02` (Within 2% tolerance).
- **Modified:** If `|Deviation Rate| > 0.02`.
- **Ignored:** If Host switches to MANUAL and sets arbitrary price.

## 4. Acceptance Score
A score (0.0 - 1.0) calculated per Segment per Course.
- Used to qualify for `AUTO` mode transition.
- **Formula:** `(Count of Accepted) / (Total Reco Events)` (Last 30 days).

## 5. Feedback Loop
- **Positive Bias:** If Host consistently sets price +5% higher, Engine learns to add +5% bias to future recommendations.
- **Negative Bias:** If Host discounts more aggressively, Engine adapts elasticity curve.