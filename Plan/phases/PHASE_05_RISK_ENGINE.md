# Phase 5 - Risk Engine

## Goal
Produce explainable deterministic and similarity-based risk signals for all four risk types.

## Build
- Common `RiskDetector` interface
- Upcoding detector (severity mismatch, peer comparison, amount deviation)
- Cloning detector with pgvector (narrative embedding, similarity threshold)
- Phantom Billing detector (procedure-evidence matching)
- Abnormal LOS detector (peer median comparison, deviation scoring)
- Composite risk scoring (max + bonus for multiple indicators)
- Risk findings persistence in `risk_findings` table
- Batch analysis command (`npm run analyze`)
- Evaluation against hidden ground truth (precision, recall, F1 per detector)
- Notification creation on critical risk detection
- Audit log entry on analysis trigger

## Detection thresholds

| Risk Type | LOW | MEDIUM | HIGH | CRITICAL |
|---|---|---|---|---|
| Upcoding | < 50 | 50-74 | 75-89 | >= 90 |
| Cloning (similarity) | < 85% | 85-91% | 92-94% | >= 95% |
| Phantom Billing | < 50 | 50-74 | 75-89 | >= 90 |
| Abnormal LOS | < 1.5σ | 1.5-2σ | 2-3σ | > 3σ |

## Exit criteria
- Four detectors execute independently.
- Findings persist with evidence references.
- Composite scoring works when multiple detectors flag the same claim.
- Metrics are calculated from ground truth (target: F1 >= 0.7 per detector).
- No Gemini dependency is required for base detection.
- Notifications are created for critical findings.
- Unit tests cover all four detectors.

## Vibecoding prompt
Implement Phase 5 only. Build four risk detectors (Upcoding, Cloning, Phantom Billing, Abnormal LOS) behind a common RiskDetector interface. Include composite risk scoring with bonus for multiple indicators. Prefer deterministic rules and pgvector similarity. Persist structured findings and compute evaluation metrics from hidden synthetic labels. Create notification events for critical findings. Add unit tests for all detectors.
