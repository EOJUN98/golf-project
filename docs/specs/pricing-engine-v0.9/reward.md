# TUGOL Reward Spec (v0.9)

## 1. Purpose
Defines the Objective Function ($R$) for optimization.

## 2. Reward Function
$$ R = w_1 \cdot R_{Rev} + w_2 \cdot R_{Occ} + w_3 \cdot R_{Vel} + w_4 \cdot R_{Acc} - P_{Cancel} $$

| Component | Description | Weight (Proxy) |
| :--- | :--- | :--- |
| **$R_{Rev}$** | Revenue (Final Price) | High (Primary) |
| **$R_{Occ}$** | Occupancy (Binary: Booked=1) | Medium |
| **$R_{Vel}$** | Booking Velocity (Speed) | Low |
| **$R_{Acc}$** | Host Acceptance (RECO mode) | High (Trust) |
| **$P_{Cancel}$**| Cancellation Penalty | Negative |

## 3. Mode-Specific Weights

### RECO Mode (Trust Building)
- Focus on **Acceptance**.
- $R \approx 0.7 \cdot R_{Acc} + 0.3 \cdot R_{Rev}$

### AUTO Mode (Revenue Gen)
- Focus on **Revenue & Occupancy**.
- $R \approx 0.6 \cdot R_{Rev} + 0.3 \cdot R_{Occ} + 0.1 \cdot R_{Vel}$

## 4. Constraints (Penalty)
- **Governance Violation:** Reward = -Infinity.
- **High Volatility:** Penalty for changing price too frequently.