# TUGOL Pricing Engine Interfaces (v0.9)

## 1. Input Interface (Pricing Request)
Used by Booking Engine to request a price calculation.

```jsonc
{
  "request_id": "REQ-001",
  "mode": "RECO",              // MANUAL | RECO | AUTO
  "course_id": "C123",
  "date": "2025-08-01",
  "slot": "MORNING_07_30",
  "segment": "WEEKDAY_VALUE",  // Target Customer Segment
  "base_price": 150000,
  "lead_time_days": 5,
  "weather": {
    "temperature": 29.5,
    "rain_prob": 0.3,
    "feels_like": 32.0,
    "wind_speed": 3.0,
    "pm10": 45
  },
  "demand_signals": {
    "booking_velocity": 0.42,  // Norm 0-1
    "search_volume": 0.65,
    "conversion_rate": 0.28,
    "cancellation_rate": 0.05
  },
  "host_config": {
    "price_floor": 110000,
    "price_ceiling": 190000,
    "auto_allowed": false,
    "blocked_segments": ["WEEKEND_PRIME"]
  }
}
```

## 2. Output Interface (Pricing Response)
Returned to Booking Engine / Host Dashboard.

```jsonc
{
  "request_id": "REQ-001",
  "timestamp": "2025-07-27T09:00:00Z",
  "mode": "RECO",
  "recommended_price": 138000,
  "final_price": 138000,       // Same as recommended in AUTO
  "currency": "KRW",
  "confidence_score": 0.78,    // Model confidence
  "reasoning": [
    "High Rain Probability (-5%)",
    "Slow Booking Velocity (-3%)"
  ],
  "governance": {
    "is_capped": false,
    "cap_type": null
  }
}
```

## 3. Control Interface (Config Update)
Used to change operating modes.

```jsonc
{
  "course_id": "C123",
  "segment": "WEEKDAY_VALUE",
  "new_mode": "AUTO",
  "updated_by": "admin_user"
}
```

## 4. Override Interface (Host Feedback)
Used when Host modifies the recommended price.

```jsonc
{
  "request_id": "REQ-001",
  "course_id": "C123",
  "recommended_price": 138000,
  "final_price": 145000,       // Host decision
  "reason": "Course Condition Good"
}
```

## 5. Logging Hook (Event Stream)
Events emitted for Data Lake / RL Training.
- `PRICE_RECO_GENERATED`
- `PRICE_AUTO_GENERATED`
- `PRICE_OVERRIDDEN`
- `BOOKING_COMPLETED`
- `BOOKING_CANCELLED`
- `NO_BOOKING_EXPIRED`