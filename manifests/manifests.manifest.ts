import type { SystemManifest } from '../manifests/schema/system.schema.ts';

export default {
  kind: "system",
  "id": "manifests",
  "name": "AE Manifests",
  "purpose": "Public manifest schema and explicit system registry.",
  "owner": "amazingefren",
  "status": "declared",
  "scope": "required",
  "visibility": "public",
  "context": {
    "decisions": [
      "Colocated declarations; central discovery.",
      "Manifest kind selects its schema. Many manifests can share a kind; schemas compose reusable parts.",
      "System manifests describe software; convention manifests contain complete rules and examples.",
      "Use *.schema.ts for structures and *.manifest.ts for declarations. Registry keeps kinds separate.",
      "Risks live with their owner; platform risks live in ae.manifest.ts. Public summaries only; sensitive evidence stays private.",
      "Scores are qualitative likelihood times impact (1-5 each), not probabilities. Residual stays unknown until assessed. Empty catalogs do not mean risk-free.",
      "Private ae-system-engine owns code generation and full validation.",
      "Current public checker validates declarations and references, not runtime enforcement."
    ],
    "openQuestions": [
      "Compatibility policy and generated binding design."
    ]
  },
  "capabilities": [
    "system-description",
    "registry",
    "risk-catalog",
    "commit-records"
  ],
  "governance": {
    "permissionsDefined": [],
    "dataClassification": "public"
  },
  "risks": [],
  "dependencies": [],
  "schemaVersion": 4,
  "contracts": ["manifests/schema/system.schema.ts", "manifests/schema/convention.schema.ts", "manifests/schema/risk.schema.ts"],
  "operations": [],
  "events": [],
  "capabilityPaths": {
    "system-description": "manifests/schema",
    "registry": "manifests",
    "risk-catalog": "manifests/risks",
    "commit-records": "manifests/commits"
  },
  "structure": {},
  "entrypoints": [
    "manifests/schema/system.schema.ts",
    "manifests/registry.ts",
    "scripts/check-manifests.mjs"
  ]
} as const satisfies SystemManifest;
