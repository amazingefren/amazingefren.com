import type { SystemManifest } from '../manifests/schema/system.schema.ts';

export default {
  kind: "system",
  "id": "evidence",
  "name": "AE Evidence",
  "purpose": "Publish approved evidence.",
  "owner": "amazingefren",
  "status": "declared",
  "scope": "required",
  "visibility": "public",
  "context": {
    "decisions": [
      "Private protocols, sources, results, and analysis live in ae-workbench.",
      "ae-system-engine owns future benchmark tooling; no runner exists.",
      "Benchmark scores and operation verification are separate."
    ],
    "openQuestions": [
      "Public evidence export contract."
    ]
  },
  "capabilities": [
    "hypothesis-tracking",
    "llm-benchmarks",
    "rubrics",
    "comparison-matrices",
    "analysis"
  ],
  "governance": {
    "permissionsDefined": [],
    "dataClassification": "public"
  },
  "risks": [],
  "dependencies": [
    "manifests"
  ],
  "schemaVersion": 4,
  "contracts": [],
  "operations": [],
  "events": [],
  "capabilityPaths": {
    "hypothesis-tracking": "evidence/approved/claims",
    "llm-benchmarks": "evidence/approved/benchmarks",
    "rubrics": "evidence/approved/rubrics",
    "comparison-matrices": "evidence/approved/matrices",
    "analysis": "evidence/approved/analysis"
  },
  "structure": {},
  "entrypoints": []
} as const satisfies SystemManifest;
