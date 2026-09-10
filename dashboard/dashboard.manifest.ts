import type { SystemManifest } from '../manifests/schema/system.schema.ts';

export default {
  "kind": "system",
  "id": "dashboard",
  "name": "AE Dashboard",
  "purpose": "Show site activity, telemetry signals, trends, and data quality in the personal workspace.",
  "owner": "amazingefren",
  "status": "declared",
  "scope": "required",
  "visibility": "public",
  "context": {
    "decisions": [
      "Telemetry shares AE Design sun/moon themes, hover states, and copy rules. Keep evidence and remove repeated introductory labels.",
      "Dashboard telemetry remains available at /guest/telemetry and /workspace/telemetry. The workspace system owns the main dashboard routes.",
      "Show page views, honeypot trigger counts and rates, time windows, trend charts, source freshness, and unavailable states. Definitions live in metrics.manifest.ts.",
      "Owner dashboard reads authorized aggregates. Guest dashboard has the same layout with labeled synthetic data.",
      "Dashboard consumes typed telemetry ports; it does not silently enable analytics, deploy traps, or collect visitor data.",
      "Summary operations require valid calendar timestamps with explicit time zones and reject undeclared fields. Adapters normalize minute-precision form input to UTC; repeated window parameters are rejected. npm test runs dashboard tests.",
      "Audience analytics follows privacy/policy.json and opt-in consent. Operational security signals stay separate from audience analytics.",
      "A honeypot trigger is an observed signal, not proof of AI identity or hostile intent. Keep false positives and unknown classification visible.",
      "No invented live values: null for missing data, zero only for a measured zero. Rate denominators are eligible evaluated requests, not all visitors.",
      "No raw IPs, fingerprints, private documents, credentials, request payloads, or individual visitor histories in dashboard responses.",
      "Use the Commonplace workspace shell, minimal labels, accessible charts with text/table equivalents, and remappable Vim navigation."
    ],
    "openQuestions": [
      "Collector operation contracts, telemetry source adapters, retention, and a maximum query window must be defined before collection is enabled.",
      "Honeypot evaluation rules and false-positive protocol need evidence before agent-classification claims."
    ]
  },
  "capabilities": [
    "summary",
    "charts",
    "telemetry-sources"
  ],
  "governance": {
    "permissionsDefined": [
      "dashboard.read"
    ],
    "dataClassification": "private"
  },
  "risks": [],
  "dependencies": [
    "design",
    "auth",
    "privacy"
  ],
  "schemaVersion": 5,
  "views": [
    {
      "id": "owner",
      "directory": "dashboard/ui/owner",
      "testsDirectory": "dashboard/tests/views/owner",
      "implementation": null,
      "path": "/workspace/telemetry",
      "status": "declared",
      "audience": "owner",
      "access": {
        "kind": "authenticated",
        "permissions": [
          "dashboard.read"
        ],
        "ownership": "caller"
      },
      "data": "owner",
      "operations": [
        "dashboard.read-summary"
      ],
      "verification": [
        {
          "expectation": "Owner metrics require authorization before reads and cannot enter public caches or exports.",
          "tests": []
        }
      ]
    },
    {
      "id": "guest",
      "directory": "dashboard/ui/guest",
      "testsDirectory": "dashboard/tests/views/guest",
      "implementation": "dashboard/ui/guest/index.tsx",
      "path": "/guest/telemetry",
      "status": "declared",
      "audience": "guest",
      "access": {
        "kind": "public"
      },
      "data": "synthetic",
      "replicaOf": "owner",
      "isolation": "session",
      "sideEffects": "sandbox-only",
      "productionAccess": "denied",
      "fallback": "fail-closed",
      "operations": [
        "dashboard.read-guest-summary"
      ],
      "verification": [
        {
          "expectation": "Guest charts are labeled synthetic and cannot reveal owner counts, logs, sessions, or content.",
          "tests": ["dashboard/tests/views/guest/guest-dashboard.test.ts"]
        }
      ]
    }
  ],
  "contracts": [
    "dashboard/contracts/summary-input.schema.json",
    "dashboard/contracts/summary.schema.json",
    "contracts/api/errors.schema.json"
  ],
  "operations": [
    {
      "id": "dashboard.read-summary",
      "access": {
        "kind": "authenticated",
        "permissions": [
          "dashboard.read"
        ],
        "ownership": "caller"
      },
      "dataScope": "owner",
      "bindings": [
        {
          "id": "dashboard.read-summary.http",
          "surface": {
            "kind": "http",
            "method": "GET",
            "path": "/api/dashboard/summary"
          },
          "scope": "required",
          "status": "declared",
          "implementation": "dashboard/adapters/http/summary.ts",
          "tests": ["dashboard/tests/adapters/http/summary.test.ts"],
          "directory": "dashboard/adapters/http",
          "testsDirectory": "dashboard/tests/adapters/http"
        },
        {
          "id": "dashboard.read-summary.mcp",
          "surface": {
            "kind": "mcp-tool",
            "name": "dashboard_read_summary",
            "description": "Read owner dashboard summary.",
            "readOnly": true
          },
          "scope": "required",
          "status": "declared",
          "implementation": "dashboard/adapters/mcp/summary.ts",
          "tests": ["dashboard/tests/adapters/mcp/summary.test.ts"],
          "directory": "dashboard/adapters/mcp",
          "testsDirectory": "dashboard/tests/adapters/mcp"
        },
        {
          "id": "dashboard.read-summary.cli",
          "surface": {
            "kind": "cli",
            "command": "ae dashboard summary",
            "output": "json"
          },
          "scope": "required",
          "status": "declared",
          "implementation": "dashboard/adapters/cli/summary.ts",
          "tests": ["dashboard/tests/adapters/cli/summary.test.ts"],
          "directory": "dashboard/adapters/cli",
          "testsDirectory": "dashboard/tests/adapters/cli"
        }
      ],
      "status": "declared",
      "input": "dashboard/contracts/summary-input.schema.json",
      "output": "dashboard/contracts/summary.schema.json",
      "errors": "contracts/api/errors.schema.json",
      "implementation": "dashboard/operations/read-summary/index.ts",
      "verification": [
        {
          "id": "dashboard.read-summary.contract",
          "category": "contract",
          "expectation": "Return the time window, data scope, source, freshness, and typed metrics. Reject reversed or excessive windows.",
          "tests": ["dashboard/tests/operations/read-summary/read-summary.test.ts"]
        },
        {
          "id": "dashboard.read-summary.access",
          "category": "access",
          "expectation": "Authorize owner and dashboard.read before any telemetry read; deny guest credentials and foreign owner IDs.",
          "tests": ["dashboard/tests/operations/read-summary/read-summary.test.ts"]
        },
        {
          "id": "dashboard.read-summary.behavior",
          "category": "behavior",
          "expectation": "Missing or suppressed data uses null, not zero. A trigger is a signal, not verified agent identity. Ratios include their numerator and denominator.",
          "tests": ["dashboard/tests/operations/read-summary/read-summary.test.ts"]
        },
        {
          "id": "dashboard.read-summary.failure",
          "category": "failure",
          "expectation": "Collector gaps and failures remain unavailable or stale; no invented metrics or production fallback.",
          "tests": ["dashboard/tests/operations/read-summary/read-summary.test.ts"]
        }
      ],
      "directory": "dashboard/operations/read-summary",
      "testsDirectory": "dashboard/tests/operations/read-summary"
    },
    {
      "id": "dashboard.read-guest-summary",
      "access": {
        "kind": "public"
      },
      "dataScope": "synthetic",
      "bindings": [
        {
          "id": "dashboard.read-guest-summary.http",
          "surface": {
            "kind": "http",
            "method": "GET",
            "path": "/api/guest/dashboard/summary"
          },
          "scope": "required",
          "status": "declared",
          "implementation": "dashboard/adapters/http/summary.ts",
          "tests": ["dashboard/tests/adapters/http/summary.test.ts"],
          "directory": "dashboard/adapters/http",
          "testsDirectory": "dashboard/tests/adapters/http"
        },
        {
          "id": "dashboard.read-guest-summary.mcp",
          "surface": {
            "kind": "mcp-tool",
            "name": "guest_dashboard_read_summary",
            "description": "Read synthetic dashboard summary.",
            "readOnly": true
          },
          "scope": "required",
          "status": "declared",
          "implementation": "dashboard/adapters/mcp/summary.ts",
          "tests": ["dashboard/tests/adapters/mcp/summary.test.ts"],
          "directory": "dashboard/adapters/mcp",
          "testsDirectory": "dashboard/tests/adapters/mcp"
        },
        {
          "id": "dashboard.read-guest-summary.cli",
          "surface": {
            "kind": "cli",
            "command": "ae guest dashboard summary",
            "output": "json"
          },
          "scope": "required",
          "status": "declared",
          "implementation": "dashboard/adapters/cli/summary.ts",
          "tests": ["dashboard/tests/adapters/cli/summary.test.ts"],
          "directory": "dashboard/adapters/cli",
          "testsDirectory": "dashboard/tests/adapters/cli"
        }
      ],
      "status": "declared",
      "input": "dashboard/contracts/summary-input.schema.json",
      "output": "dashboard/contracts/summary.schema.json",
      "errors": "contracts/api/errors.schema.json",
      "implementation": "dashboard/operations/read-guest-summary/index.ts",
      "verification": [
        {
          "id": "dashboard.read-guest-summary.contract",
          "category": "contract",
          "expectation": "Return the time window, data scope, source, freshness, and typed metrics. Reject reversed or excessive windows.",
          "tests": ["dashboard/tests/operations/read-guest-summary/read-guest-summary.test.ts"]
        },
        {
          "id": "dashboard.read-guest-summary.access",
          "category": "access",
          "expectation": "Read only synthetic fixtures through isolated guest adapters; never query owner telemetry, including on fixture failure.",
          "tests": ["dashboard/tests/operations/read-guest-summary/read-guest-summary.test.ts"]
        },
        {
          "id": "dashboard.read-guest-summary.behavior",
          "category": "behavior",
          "expectation": "Missing or suppressed data uses null, not zero. A trigger is a signal, not verified agent identity. Ratios include their numerator and denominator.",
          "tests": ["dashboard/tests/operations/read-guest-summary/read-guest-summary.test.ts"]
        },
        {
          "id": "dashboard.read-guest-summary.failure",
          "category": "failure",
          "expectation": "Collector gaps and failures remain unavailable or stale; no invented metrics or production fallback.",
          "tests": ["dashboard/tests/operations/read-guest-summary/read-guest-summary.test.ts"]
        }
      ],
      "directory": "dashboard/operations/read-guest-summary",
      "testsDirectory": "dashboard/tests/operations/read-guest-summary"
    }
  ],
  "events": [],
  "capabilityPaths": {
    "summary": "dashboard/ui/summary",
    "charts": "dashboard/ui/charts",
    "telemetry-sources": "dashboard/ports/telemetry"
  },
  "structure": {
    "contracts": "dashboard/contracts",
    "tests": "dashboard/tests"
  },
  "entrypoints": [
    "dashboard/metrics.manifest.ts"
  ]
} as const satisfies SystemManifest;
