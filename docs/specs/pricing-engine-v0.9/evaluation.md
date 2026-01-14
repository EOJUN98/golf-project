# Evaluation Spec v0.9

> **Scope:** Metrics and methodologies for validating engine performance.

## 1. KPI Framework

### Tier 1: Business Metrics (Host Success)
-   **RevPAR (Revenue Per Available Round):** Total Revenue / Total Capacity.
-   **Occupancy Rate:** Booked Slots / Total Slots.
-   **Yield:** Actual Revenue / Potential Revenue (at max price).

### Tier 2: Model Metrics (Engine Intelligence)
-   **Acceptance Rate:** % of Engine Recommendations accepted by Host (Goal: > 80%).
-   **Elasticity Accuracy:** R-squared of estimated vs. actual demand curve.
-   **Forecast Accuracy:** MAPE (Mean Absolute Percentage Error) of demand forecast.

### Tier 3: Operational Metrics (System Health)
-   **Intervention Rate:** Frequency of Manual Overrides (Lower is better for AUTO).
-   **Response Time:** Engine latency (Target: < 200ms).

## 2. Evaluation Methods

### A. Backtesting (Offline)
-   Use historical data (Phase 0) to simulate "What if" scenarios.
-   Compare V0.9 Logic vs. Historical Manual Pricing revenue.

### B. Shadow Mode (Online)
-   Engine runs in background (calculates prices but does not expose them).
-   Compare `Shadow Price` vs. `Actual Manual Price`.
-   Monitor `Deviation Rate`.

### C. A/B Testing (Chain Pilot)
-   **Split:** Course A (Treatment: Engine AUTO) vs. Course B (Control: Manual).
-   **Normalization:** Adjust for course differences (Location, Brand).
-   **Metric:** Compare RevPAR uplift.

## 3. Validation Criteria (Gate to Pilot)
-   [ ] Acceptance Rate > 70% in `RECO` mode for 2 weeks.
-   [ ] No Critical Safety Violations.
-   [ ] Data Pipeline 100% operational (0 data loss).
