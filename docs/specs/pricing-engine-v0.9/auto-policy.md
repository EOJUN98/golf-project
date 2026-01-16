# TUGOL Auto-Policy Spec (v0.9)

## 1. Principles
- **Safety First:** Better to miss a revenue opportunity than to lose Host trust.
- **Gradual Rollout:** Start with low-risk segments (`LAST_MINUTE`, `TWILIGHT`).
- **Human in the Loop:** Host can override AUTO at any time.

## 2. AUTO Allowed/Blocked Rules
- **Blocked:** `WEEKEND_PRIME` (High risk, high visibility).
- **Allowed:** `LAST_MINUTE` (Perishable), `TWILIGHT` (Niche), `WEEKDAY_VALUE` (Volume).

## 3. Transition Logic (RECO → AUTO)
A segment is eligible for AUTO if:
1.  **Acceptance Rate** >= 80% (Last 4 weeks).
2.  **Revenue Impact** >= Neutral/Positive (Simulation).
3.  **Override Variance** < Threshold (Host behavior is predictable).
4.  **Host Opt-in:** Host explicitly enables AUTO switch.

## 4. Safety Constraints
- **Max Auto Coverage:** Max 30% of daily slots can be AUTO.
- **Max Price Change:** Price cannot change by more than 15% from Base Price.
- **Velocity Check:** If booking velocity is too high (underpriced), Auto-raise price or switch to MANUAL.
- **Panic Button:** One-click revert to Base Price for all slots.