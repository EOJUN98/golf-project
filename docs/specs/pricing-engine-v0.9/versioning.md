# TUGOL Versioning Spec (v0.9)

## 1. Version Roadmap

| Version | Phase | Goal | Key Features |
| :--- | :--- | :--- | :--- |
| **v0.9** | **Validation** | Data & Trust | RECO Mode, Basic Rules, Data Logging, Dashboard. |
| **v1.0** | **Pilot** | Automation | AUTO Mode (Opt-in), Contextual Bandit, Chain Config. |
| **v2.0** | **SaaS/Scale** | Expansion | Multi-Chain Transfer, Global Policy, API Gateway. |
| **v3.0** | **RL Core** | Optimization | Full Offline RL, Simulator, LTV Optimization. |
| **v4.0** | **Market Infra** | Coordination | Supply/Demand Balancing, Network Effects. |

## 2. Current Status (v0.9)
- **Focus:** Building the Data Pipeline and gaining Host Trust via RECO.
- **Limitations:** No active Bandit exploration. AUTO mode is disabled or simulated only.
- **Target:** 2~4 Validation Sites.

## 3. Migration Strategy
- **v0.9 → v1.0:**
  - Enable `feature_flags.auto_pricing`.
  - Deploy `Bandit Model` trained on v0.9 logs.
  - Expand Config to support Chain-level policies.