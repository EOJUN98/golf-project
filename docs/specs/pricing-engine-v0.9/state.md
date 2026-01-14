# State Spec v0.9

> **Scope:** Definition of the State Space (Context) for RL/Bandit models.

## 1. State Vector (S_t)
The environment state at time `t` for a specific tee-time slot.

| Dimension | Feature Name | Type | Definition |
| :--- | :--- | :--- | :--- |
| **Time** | `lead_time_bucket` | Categorical | `>14d`, `7-14d`, `3-7d`, `1-3d`, `<1d` |
| | `time_of_day` | Categorical | `MORNING`, `DAY`, `TWILIGHT`, `NIGHT` |
| | `is_weekend` | Binary | `True` if Sat/Sun/Holiday |
| **Inventory** | `inventory_remaining` | Integer | Absolute count |
| | `occupancy_rate` | Float | `(Total - Remaining) / Total` |
| | `velocity_24h` | Integer | Bookings in last 24h |
| **Weather** | `rain_prob_bucket` | Categorical | `None`, `Low`, `High` |
| | `temp_bucket` | Categorical | `Freezing`, `Cold`, `Good`, `Hot` |
| **Segment** | `segment_id` | Categorical | `WEEKDAY_VALUE`, `WEEKEND_PRIME`, etc. |

## 2. State Enrichment
-   **Competitor Price:** (Future V1.0) Average price of nearby courses.
-   **Event Flag:** (Future V1.0) Local events impacting demand.

## 3. State Representation
-   For **Bandit (Linear):** One-hot encoding of categorical features + Normalized numerical features.
-   For **RL (Deep):** Embeddings for categorical, Raw scalars for numerical.
