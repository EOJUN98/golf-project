# TUGOL Evaluation Spec (v0.9)

## 1. Validation Cohort (v0.9)
- **Target:** 2~4 Golf Courses (Small/Local + Suburban).
- **Duration:** 8~12 Weeks.
- **Goal:** Data Collection & Trust Building.

## 2. Validation KPIs (Success Criteria)
These metrics must be met to proceed to Pilot (v1.0).

| Category | Metric | Threshold |
| :--- | :--- | :--- |
| **Data** | **Elasticity Detected** | Statistically significant curve in 2+ segments |
| | **Data Density** | > 3,000 Valid Logs |
| **Host** | **Acceptance Rate** | > 70% (in target segments) |
| | **Override Variance** | Decreasing trend over time |
| **Ops** | **AUTO Candidates** | > 2 Segments identified (e.g. LAST_MINUTE) |

## 3. Pilot KPIs (v1.0 Goals)
- **Revenue Uplift:** > 5% vs Control.
- **Occupancy Uplift:** > 10% in Off-peak.
- **AUTO Ratio:** > 30% of total slots.
- **Host Satisfaction:** NPS > 8.

## 4. Methodology
- **A/B Test:** Not possible in single course. Use **Pre-Post Analysis** or **Synthetic Control**.
- **Shadow Pricing:** Compare Engine Price vs Actual Price performance in simulation.