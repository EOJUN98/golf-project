# TUGOL Pricing Engine Spec v0.9 (Overview)

> **Version:** v0.9 (Validation-Ready)
> **Status:** Spec Freeze
> **Target:** Small Validation Cohort (2~4 sites)

## 0. Overview
- **System:** TUGOL Pricing Engine
- **Purpose:** To provide data-driven dynamic pricing for golf tee-times, evolving from a rule-based advisor to an autonomous market coordination AI.
- **Core Mission:** Balance **Revenue Maximization** (Host) with **Booking Experience** (User) through a **Dual Engine Architecture**.

## 1. Domain & Problem
- **Inventory:** 18-hole Perishable Slots (Time + Space).
- **Stakeholders:**
  - **Host (Supply):** Golf Course, HQ/Chain. Needs revenue & control.
  - **User (Demand):** Golfer. Needs fair price & availability.
  - **Platform:** TUGOL. Needs liquidity & transaction volume.
- **Problem:** Traditional pricing is static, manual, and gut-feeling based. It fails to capture real-time demand elasticity.

## 2. Pricing Modes (The "Control" Spectrum)
| Mode | Description | Role | Usage |
| :--- | :--- | :--- | :--- |
| **MANUAL** | Host sets price manually. | Engine as Observer | High-risk days, Special events, Override. |
| **RECO** | Engine suggests, Host decides. | Engine as Advisor | Default mode for Validation. Training ground for Acceptance. |
| **AUTO** | Engine sets price automatically. | Engine as Agent | `LAST_MINUTE`, `TWILIGHT` (Opt-in). Pilot target. |

## 3. Mode Transition Strategy
- **Initial State:** `RECO` is default for all segments.
- **Transition:** `RECO` → `AUTO` is triggered per segment based on **Acceptance Stability**.
- **Constraint:** Sensitive segments like `WEEKEND_PRIME` may remain `RECO` or `MANUAL` permanently based on Host Policy.

## 4. Market Model (Dual Engine)
- **Booking-driven Pricing:** Booking Engine provides demand signals (velocity, search volume) to train the Pricing Engine.
- **Pricing-driven Booking:** Pricing Engine provides optimal prices to boost conversion rates in the Booking Engine.

## 5. Input Features (Summary)
- **Time:** Season, Weekday/Weekend, Slot (Morning/Day/Twilight), Lead-time.
- **Environment:** Weather (Temp, Rain, Wind, PM10).
- **Demand:** Booking Velocity, Search Volume, Conversion Rate, Cancel Rate.
- **Price:** Base Price, Historical Discount, Competitor Price (v1.0).
- **Policy:** Host Config, Chain Policy, Override History.

## 6. Validation & Pilot Plan
- **Validation (v0.9):** 
  - 2~4 Sites.
  - 8~12 Weeks.
  - Focus: Data Collection (Elasticity, Acceptance) & Trust Building.
- **Pilot (v1.0):**
  - Expansion to Chain.
  - Focus: `AUTO` adoption & Revenue Uplift validation.

## 7. RL Transition Roadmap
- **Step 1:** Rule-based Baseline (Current).
- **Step 2:** Contextual Bandit (Validation/Pilot).
- **Step 3:** Partial RL (SaaS/Chain).
- **Step 4:** Full Market Coordination Agent (Endgame).