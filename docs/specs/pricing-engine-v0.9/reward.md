# Reward Spec v0.9

> **Scope:** Definition of the Reward Function for RL/Bandit optimization.

## 1. Primary Reward (R)
The objective function to maximize.

$$ R = w_1 \cdot R_{rev} + w_2 \cdot R_{occ} + w_3 \cdot R_{host} $$

### Components:
1.  **Revenue ($R_{rev}$):**
    -   `Actual Booking Price` (if booked).
    -   `0` (if not booked).
2.  **Occupancy ($R_{occ}$):**
    -   Small bonus for filling a slot (Inventory Clearance).
    -   Critical for `LAST_MINUTE` segment.
3.  **Host Acceptance ($R_{host}$):**
    -   **RECO Mode Only.**
    -   `+1` if Host accepts recommendation.
    -   `-1` if Host modifies deviation > 5%.

## 2. Shaping & Penalties

### A. Cancellation Penalty
-   If a booking is cancelled:
    -   Subtract original reward.
    -   Apply `Cancellation Fee` as partial reward (if applicable).

### B. Volatility Penalty
-   Penalize rapid price fluctuations to ensure user trust.
-   $R_{final} = R - \lambda \cdot |P_t - P_{t-1}|$

## 3. Reward Attribution
-   **Immediate:** Pricing Decision -> Immediate Booking.
-   **Delayed:** Pricing Decision -> Booking 3 days later (Attribution Window needed).
-   **V0.9 Strategy:** Use **Immediate Reward** (Session-based) for simplicity.
