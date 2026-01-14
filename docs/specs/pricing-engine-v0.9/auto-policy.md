# Auto-Policy Spec v0.9

> **Scope:** Logic for transitioning from RECO to AUTO and managing Automation.

## 1. Opt-in Logic
Automation is **not enabled by default**. It must be earned and activated.

-   **Prerequisite:**
    1.  Valid Data Stream (Weather, Inventory, Booking).
    2.  Minimum Training Period (4 weeks of `RECO` logs).
    3.  Stable Acceptance Rate (> 85% for target segment).

-   **Activation:**
    -   Host receives a notification: *"Your pricing for Weekday Mornings matches our AI recommendations 90% of the time. Enable AUTO to save time?"*
    -   Host toggles `segment_config.[SEGMENT].mode` to `AUTO`.

## 2. Auto-Policy Rules

### A. The "Do No Harm" Rule
-   If Model Confidence is low (e.g., erratic weather, sparse data), fallback to `Base Price`.
-   Never drop below `min_price_factor` defined in Config.

### B. Exploration Policy (Bandit)
-   **Algorithm:** Thompson Sampling or Epsilon-Greedy.
-   **Scope:** Only vary price within ±10% of the "Safe" price.
-   **Frequency:** Re-calculate every 1 hour or upon booking event.

### C. Circuit Breaker
-   **Trigger:** If Booking Velocity drops 50% below baseline for 24h.
-   **Action:** Revert to `RECO` or `MANUAL` mode. Alert Host.

## 3. Segment Priorities for AUTO
1.  **`LAST_MINUTE` (Highest Priority):** Perishable inventory. High discount tolerance.
2.  **`WEEKDAY_VALUE`:** Low demand, high elasticity. Good for experimentation.
3.  **`TWILIGHT`:** Niche demand.
4.  **`WEEKEND_PRIME` (Lowest Priority):** High risk. Manual control preferred.
