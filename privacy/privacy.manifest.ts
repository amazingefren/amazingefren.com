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
      "The public /privacy summary describes browser theme storage, owner passkey sessions, inactive analytics, and the hosting boundary. It is not a claim that the proposed collection policy is enforced.",
      "Public theme selection is stored locally in the browser only; it is not an analytics signal or server field.",
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
    "privacy/policy.json",
    "privacy/ui/transparency/PrivacySummary.tsx"
  ]
} as const satisfies SystemManifest;
