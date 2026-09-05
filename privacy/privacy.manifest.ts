import type { SystemManifest } from '../manifests/schema/system.schema.ts';

export default {
  kind: "system",
  "id": "privacy",
  "name": "AE Privacy",
  "purpose": "Govern consent, opt-in metrics, minimal data, and transparent controls.",
  "owner": "amazingefren",
  "status": "declared",
  "scope": "required",
  "visibility": "public",
  "context": {
    "decisions": [
      "HTTPS reading works without analytics consent. Mirrors never enable analytics.",
      "Metric labels describe participating browsers or sessions, not unique people.",
      "Policy is a design contract; it still needs implementation and independent verification."
    ],
    "openQuestions": [
      "Collector operation contracts and retention configuration before implementation."
    ]
  },
  "capabilities": [
    "consent",
    "transparency",
    "minimization",
    "retention",
    "verification"
  ],
  "governance": {
    "permissionsDefined": [],
    "dataClassification": "mixed"
  },
  "risks": [],
  "dependencies": [],
  "schemaVersion": 5,
  "contracts": [],
  "operations": [],
  "events": [],
  "capabilityPaths": {
    "consent": "privacy/ui/consent",
    "transparency": "privacy/ui/transparency",
    "minimization": "privacy/domain/minimization",
    "retention": "privacy/domain/retention",
    "verification": "privacy/tests"
  },
  "structure": {
    "policy": "privacy",
    "tests": "privacy/tests"
  },
  "entrypoints": [
    "privacy/policy.json"
  ]
} as const satisfies SystemManifest;
