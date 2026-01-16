# TUGOL State Spec (v0.9)

## 1. Purpose
Defines the State Vector ($S_t$) for Bandit/RL models.

## 2. State Components
The context used to decide the Action (Price).

```text
S = {
  // Time Context
  "lead_time_bucket": Categorical (0-1d, 2-3d, 4-7d, >7d),
  "time_of_day": Categorical (Morning, Day, Twilight),
  "day_of_week": Categorical (Mon-Sun),
  "is_weekend": Binary,
  "season": Categorical (Spring, Summer, Fall, Winter),

  // Segment Context
  "segment_id": Categorical (WEEKDAY_VALUE, etc.),

  // Supply Context
  "inventory_remaining": Integer,
  "occupancy_rate": Float (0.0-1.0),
  
  // Demand Context
  "booking_velocity_24h": Float,
  "search_volume_index": Float,

  // Environment Context
  "weather_bucket": Categorical (Good, Fair, Bad),
  "temp_bucket": Categorical (Cold, Mild, Hot),

  // Operational Context
  "current_acceptance_prob": Float (Estimated)
}
```

## 3. Feature Engineering
- **Bucketing:** Continuous variables (Lead time, Temp) are bucketed to reduce state space for Bandit.
- **Normalization:** Numerical values normalized to [0, 1] range.