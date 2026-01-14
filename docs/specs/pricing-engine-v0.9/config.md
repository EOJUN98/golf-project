# TUGOL Configuration Spec (v0.9)

## 1. Config Hierarchy
Configuration is applied in a cascading manner:
`Global (HQ)` → `Chain` → `Course` → `Segment` → `Slot/Date`

## 2. Global/Chain Config (Governance)
High-level policies defined by HQ.

```jsonc
{
  "chain_id": "CHAIN_X",
  "currency": "KRW",
  "global_safety_rules": {
    "min_price_factor": 0.6,   // Never below 60% of base
    "max_price_factor": 1.5,   // Never above 150% of base
    "max_daily_change": 0.2    // Max 20% change per day
  },
  "blocked_segments_global": ["WEEKEND_PRIME"] // Always MANUAL/RECO
}
```

## 3. Course Config (Operational)
Specific settings for a golf course.

```jsonc
{
  "course_id": "C123",
  "default_mode": "RECO",
  "bounds": {
    "price_floor": 100000,
    "price_ceiling": 250000
  },
  "exploration": {
    "enabled": true,
    "level": "LOW" // LOW | MEDIUM | HIGH
  }
}
```

## 4. Segment Policy (Automation)
Granular control per customer segment.

```jsonc
{
  "segment_policies": {
    "WEEKDAY_VALUE": {
      "mode": "AUTO",
      "auto_allowed": true,
      "min_margin": 0.1
    },
    "LAST_MINUTE": {
      "mode": "AUTO",
      "auto_allowed": true,
      "trigger_hours": 48
    },
    "WEEKEND_PRIME": {
      "mode": "RECO",
      "auto_allowed": false
    }
  }
}
```

## 5. Safety Flags
- **`max_auto_coverage`**: 0.3 (Max 30% of inventory can be AUTO priced).
- **`panic_button`**: True (Instantly revert all AUTO to Base Price).