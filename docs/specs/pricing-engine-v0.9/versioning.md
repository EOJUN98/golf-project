# Versioning Spec v0.9

> **Scope:** Roadmap and Feature Flags for Engine Evolution.

## 1. Version History

| Version | Codename | Focus | Key Features | Status |
| :--- | :--- | :--- | :--- | :--- |
| **v0.9** | **Validation** | Data & Trust | `RECO` Mode, Data Pipeline, Basic Rule Engine, Host Dashboard | **Target** |
| **v1.0** | **Pilot** | Automation | `AUTO` Mode (Opt-in), Contextual Bandit, Chain Config | Planned |
| **v2.0** | **Scale** | Intelligence | Full RL, Multi-Chain Transfer Learning, SaaS API | Future |

## 2. Migration Strategy (v0.9 → v1.0)

### Feature Flags
Use flags to enable v1.0 features in v0.9 codebase for specific Pilot courses.

```json
{
  "enable_bandit_logic": false, // v1.0 feature
  "enable_auto_pricing": false, // v1.0 feature
  "enable_advanced_logging": true // v0.9 feature
}
```

### Data Compatibility
-   v0.9 Logs must be forward-compatible with v1.0 RL Training.
-   Ensure `State` vector captures all necessary features even if not used by v0.9 logic.

## 3. Release Cycle
-   **Sprint:** 2 weeks.
-   **Validation Phase:** 8-12 weeks (v0.9).
-   **Pilot Phase:** 3-6 months (v1.0).
