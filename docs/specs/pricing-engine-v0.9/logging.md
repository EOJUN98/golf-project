# TUGOL Logging & Telemetry Spec (v0.9)

## 1. Event Types
Key events for the Data Lake.

- **`PRICE_RECO`**: Engine generated a suggestion.
- **`PRICE_AUTO`**: Engine set a price automatically.
- **`PRICE_OVERRIDE`**: Host modified the price.
- **`BOOKED`**: User purchased a slot.
- **`CANCELLED`**: User/Host cancelled a booking.
- **`NOBOOK`**: Slot expired without booking (Inventory Loss).

## 2. Minimum Schema (Log Row)
Designed for RL State reconstruction.

| Field | Type | Description |
| :--- | :--- | :--- |
| `log_id` | UUID | |
| `timestamp` | ISO8601 | |
| `course_id` | String | |
| `segment_id` | String | |
| `slot_time` | ISO8601 | |
| `lead_time_hours` | Float | |
| `base_price` | Int | |
| `recommended_price`| Int | |
| `final_price` | Int | Action taken |
| `weather_score` | Float | 0.0 (Bad) - 1.0 (Good) |
| `occupancy_rate` | Float | At time of log |
| `booking_flag` | Int | 0 or 1 |
| `revenue` | Int | 0 or final_price |
| `cancel_flag` | Int | 0 or 1 |
| `pricing_mode` | Enum | MANUAL/RECO/AUTO |

## 3. Data Storage
- **Hot:** Real-time stream (Kafka) for Dashboard.
- **Cold:** Parquet files (S3) for Offline RL Training.