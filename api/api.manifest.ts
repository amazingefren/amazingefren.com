import type { SystemManifest } from '../manifests/schema/system.schema.ts';

export default {
  kind: "system",
  "id": "api",
  "name": "AE API",
  "purpose": "Compose HTTP interfaces over system operations.",
  "owner": "amazingefren",
  "status": "declared",
  "scope": "required",
  "visibility": "public",
  "context": {
    "decisions": [
      "Thin HTTP gateway; domain logic stays in owning systems.",
      "Expose public reading and catalog discovery without browser sessions.",
      "Use the same contracts and access decisions as MCP and CLI clients."
    ],
    "openQuestions": [
      "Versioning and error contracts."
    ]
  },
  "capabilities": [
    "http-interface",
    "public-content-access",
    "public-system-access"
  ],
  "governance": {
    "permissionsDefined": [],
    "dataClassification": "mixed"
  },
  "risks": [],
  "dependencies": [
    "auth",
    "publishing",
    "system-explorer",
    "studio"
  ],
  "schemaVersion": 4,
  "contracts": [],
  "operations": [],
  "events": [],
  "capabilityPaths": {
    "http-interface": "api/gateway",
    "public-content-access": "api/gateway",
    "public-system-access": "api/gateway"
  },
  "structure": {
    "domain": "api/domain",
    "operations": "api/operations",
    "ports": "api/ports",
    "adapters": "api/adapters",
    "tests": "api/tests",
    "composition": "api/composition"
  },
  "entrypoints": []
} as const satisfies SystemManifest;
