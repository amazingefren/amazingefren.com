import { ownerProjectOperations, publicProjectOperations } from '../studio/authoring/manifest.ts';
import type { SystemManifest } from '../manifests/schema/system.schema.ts';

export default {
  kind: "system",
  "id": "publishing",
  "name": "AE Publishing",
  "purpose": "Publish approved Studio revisions without Git deployments.",
  "owner": "amazingefren",
  "status": "declared",
  "scope": "required",
  "visibility": "public",
  "context": {
    "decisions": [
      "2026-09-09: Owner approved a separate zen publication writer for articles, pages, and books. Projects, ordered manuscripts, and explicit release review are distinct from quick personal notes.",
      "Application authoring and delivery use contracts/writing/index.ts. Launch integration verifies private persistence, approved publication, asset isolation, and withdrawal; evidence: ae-workbench/auth-launch-review/integration.json. First owner publication is live at /readings/ae-intro. Declared-only bindings remain unverified.",
      "HTTP, MCP, and studio invoke the same domain operations.",
      "Private engine owns transformations; approved outputs are public.",
      "Publish full-text feeds with stable entry IDs and canonical links.",
      "Export Markdown, metadata, citations, and local assets from the same approved revision.",
      "Keep stable permalinks and record substantive corrections.",
      "Verify HTML, feeds, API responses, and exports agree on revision and public visibility.",
      "Ship bindings with their operation; implement and independently verify each adapter.",
      "Git stores code and schemas; publishing needs no commit or rebuild.",
      "Edits stay private until published again.",
      "Export approved fields and assets only. Never implicitly publish notes, tasks, experiments, ideation, or source evidence.",
      "Use revision preconditions for edits and transitions; use idempotency keys for create, publish, and withdraw.",
      "Activate the public revision only when its public assets are ready. Record refresh jobs durably and retry failed feeds, exports, and mirrors.",
      "Public lists read the active publication index at request time; invalidate revision caches on transitions. Private responses must not enter shared caches.",
      "Withdrawal removes the public listing, not downloaded, syndicated, or independently pinned copies.",
      "Studio owns authoring; publishing takes an explicitly authorized, immutable revision.",
      "Publishing owns the public index, release snapshots, public assets, and distribution jobs."
    ],
    "openQuestions": [
      "Source-revision handoff contract and publication transaction boundary.",
      "Asset release, cache freshness, and distribution failure UX."
    ]
  },
  "capabilities": [
    "publication-projects",
    "application-delivery",
    "publication",
    "exports",
    "rss",
    "atom",
    "markdown-downloads",
    "offline-bundles",
    "subscriptions",
    "changelog"
  ],
  "governance": {
    "permissionsDefined": [],
    "dataClassification": "mixed"
  },
  "risks": [],
  "dependencies": [
    "auth",
    "studio"
  ],
  "schemaVersion": 5,
  "contracts": [
    "contracts/writing/index.ts",
    "contracts/api/content-list.schema.json",
    "contracts/api/content.schema.json",
    "contracts/api/errors.schema.json",
    "contracts/api/list-input.schema.json",
    "contracts/api/read-input.schema.json",
    "contracts/content/publication-receipt.schema.json",
    "contracts/content/publication-transition.schema.json"
  ],
  "operations": [
    ...ownerProjectOperations,
    ...publicProjectOperations,
    {
      "id": "publishing.list",
      "access": {
        "kind": "public"
      },
      "bindings": [
        {
          "id": "publishing.list.http",
          "surface": {
            "kind": "http",
            "method": "GET",
            "path": "/api/articles"
          },
          "scope": "required",
          "status": "declared",
          "implementation": null,
          "tests": [],
          "directory": "publishing/adapters/http",
          "testsDirectory": "publishing/tests/adapters/http"
        },
        {
          "id": "publishing.list.mcp-tool",
          "surface": {
            "kind": "mcp-tool",
            "name": "list_articles",
            "description": "List approved public articles.",
            "readOnly": true
          },
          "scope": "required",
          "status": "declared",
          "implementation": null,
          "tests": [],
          "directory": "publishing/adapters/mcp",
          "testsDirectory": "publishing/tests/adapters/mcp"
        },
        {
          "id": "publishing.list.cli",
          "surface": {
            "kind": "cli",
            "command": "ae articles list",
            "output": "json"
          },
          "scope": "required",
          "status": "declared",
          "implementation": null,
          "tests": [],
          "directory": "publishing/adapters/cli",
          "testsDirectory": "publishing/tests/adapters/cli"
        },
        {
          "id": "publishing.list.export",
          "surface": {
            "kind": "export",
            "format": "markdown",
            "path": "/exports/articles/index.md"
          },
          "scope": "required",
          "status": "declared",
          "implementation": null,
          "tests": [],
          "directory": "publishing/adapters/exports/markdown",
          "testsDirectory": "publishing/tests/adapters/exports/markdown"
        },
        {
          "id": "publishing.list.offline",
          "surface": {
            "kind": "export",
            "format": "offline-bundle",
            "path": "/exports/articles.zip"
          },
          "scope": "required",
          "status": "declared",
          "implementation": null,
          "tests": [],
          "directory": "publishing/adapters/exports/offline-bundle",
          "testsDirectory": "publishing/tests/adapters/exports/offline-bundle"
        },
        {
          "id": "publishing.list.onion",
          "surface": {
            "kind": "mirror",
            "network": "onion",
            "publicOnly": true,
            "localAssets": true
          },
          "scope": "required",
          "status": "declared",
          "implementation": null,
          "tests": [],
          "directory": "publishing/adapters/onion",
          "testsDirectory": "publishing/tests/adapters/onion"
        },
        {
          "id": "publishing.list.ipfs",
          "surface": {
            "kind": "mirror",
            "network": "ipfs",
            "publicOnly": true,
            "localAssets": true
          },
          "scope": "required",
          "status": "declared",
          "implementation": null,
          "tests": [],
          "directory": "publishing/adapters/ipfs",
          "testsDirectory": "publishing/tests/adapters/ipfs"
        },
        {
          "id": "publishing.list.rss",
          "surface": {
            "kind": "feed",
            "format": "rss",
            "path": "/feeds/articles.rss.xml",
            "fullText": true,
            "itemId": "id",
            "updatedAt": "updatedAt"
          },
          "scope": "required",
          "status": "declared",
          "implementation": null,
          "tests": [],
          "directory": "publishing/adapters/rss",
          "testsDirectory": "publishing/tests/adapters/rss"
        },
        {
          "id": "publishing.list.atom",
          "surface": {
            "kind": "feed",
            "format": "atom",
            "path": "/feeds/articles.atom.xml",
            "fullText": true,
            "itemId": "id",
            "updatedAt": "updatedAt"
          },
          "scope": "required",
          "status": "declared",
          "implementation": null,
          "tests": [],
          "directory": "publishing/adapters/atom",
          "testsDirectory": "publishing/tests/adapters/atom"
        }
      ],
      "status": "declared",
      "input": "contracts/api/list-input.schema.json",
      "output": "contracts/api/content-list.schema.json",
      "errors": "contracts/api/errors.schema.json",
      "implementation": null,
      "verification": [
        {
          "id": "publishing.list.contract",
          "category": "contract",
          "expectation": "Input and output conform to the referenced schemas.",
          "tests": []
        },
        {
          "id": "publishing.list.access",
          "category": "access",
          "expectation": "Only approved public data is returned; private fields never appear.",
          "tests": []
        },
        {
          "id": "publishing.list.behavior",
          "category": "behavior",
          "expectation": "All delivery bindings return the same approved revision.",
          "tests": []
        },
        {
          "id": "publishing.list.failure",
          "category": "failure",
          "expectation": "Invalid input and missing data produce defined failures.",
          "tests": []
        }
      ],
      "directory": "publishing/operations/list",
      "testsDirectory": "publishing/tests/operations/list"
    },
    {
      "id": "publishing.read",
      "access": {
        "kind": "public"
      },
      "bindings": [
        {
          "id": "publishing.read.http",
          "surface": {
            "kind": "http",
            "method": "GET",
            "path": "/api/articles/{id}"
          },
          "scope": "required",
          "status": "declared",
          "implementation": null,
          "tests": [],
          "directory": "publishing/adapters/http",
          "testsDirectory": "publishing/tests/adapters/http"
        },
        {
          "id": "publishing.read.mcp-tool",
          "surface": {
            "kind": "mcp-tool",
            "name": "read_articles",
            "description": "Read approved public articles.",
            "readOnly": true
          },
          "scope": "required",
          "status": "declared",
          "implementation": null,
          "tests": [],
          "directory": "publishing/adapters/mcp",
          "testsDirectory": "publishing/tests/adapters/mcp"
        },
        {
          "id": "publishing.read.cli",
          "surface": {
            "kind": "cli",
            "command": "ae articles read <id>",
            "output": "json"
          },
          "scope": "required",
          "status": "declared",
          "implementation": null,
          "tests": [],
          "directory": "publishing/adapters/cli",
          "testsDirectory": "publishing/tests/adapters/cli"
        },
        {
          "id": "publishing.read.export",
          "surface": {
            "kind": "export",
            "format": "markdown",
            "path": "/exports/articles/{id}.md"
          },
          "scope": "required",
          "status": "declared",
          "implementation": null,
          "tests": [],
          "directory": "publishing/adapters/exports/markdown",
          "testsDirectory": "publishing/tests/adapters/exports/markdown"
        },
        {
          "id": "publishing.read.mcp-resource",
          "surface": {
            "kind": "mcp-resource",
            "uriTemplate": "ae://articles/{id}",
            "mimeType": "text/markdown"
          },
          "scope": "required",
          "status": "declared",
          "implementation": null,
          "tests": [],
          "directory": "publishing/adapters/mcp",
          "testsDirectory": "publishing/tests/adapters/mcp"
        }
      ],
      "status": "declared",
      "input": "contracts/api/read-input.schema.json",
      "output": "contracts/api/content.schema.json",
      "errors": "contracts/api/errors.schema.json",
      "implementation": null,
      "verification": [
        {
          "id": "publishing.read.contract",
          "category": "contract",
          "expectation": "Input and output conform to the referenced schemas.",
          "tests": []
        },
        {
          "id": "publishing.read.access",
          "category": "access",
          "expectation": "Only approved public data is returned; private fields never appear.",
          "tests": []
        },
        {
          "id": "publishing.read.behavior",
          "category": "behavior",
          "expectation": "All delivery bindings return the same approved revision.",
          "tests": []
        },
        {
          "id": "publishing.read.failure",
          "category": "failure",
          "expectation": "Invalid input and missing data produce defined failures.",
          "tests": []
        }
      ],
      "directory": "publishing/operations/read",
      "testsDirectory": "publishing/tests/operations/read"
    },
    {
      "id": "publishing.publish",
      "access": {
        "kind": "authenticated",
        "permissions": [
          "publishing.publish"
        ],
        "ownership": "caller"
      },
      "bindings": [
        {
          "id": "publishing.publish.http",
          "surface": {
            "kind": "http",
            "method": "POST",
            "path": "/api/publications/{id}/publish"
          },
          "scope": "required",
          "status": "declared",
          "implementation": null,
          "tests": [],
          "directory": "publishing/adapters/http",
          "testsDirectory": "publishing/tests/adapters/http"
        },
        {
          "id": "publishing.publish.mcp-tool",
          "surface": {
            "kind": "mcp-tool",
            "name": "publish",
            "description": "Publish for the authenticated owner.",
            "readOnly": false
          },
          "scope": "required",
          "status": "declared",
          "implementation": null,
          "tests": [],
          "directory": "publishing/adapters/mcp",
          "testsDirectory": "publishing/tests/adapters/mcp"
        },
        {
          "id": "publishing.publish.cli",
          "surface": {
            "kind": "cli",
            "command": "ae publications publish <id>",
            "output": "json"
          },
          "scope": "required",
          "status": "declared",
          "implementation": null,
          "tests": [],
          "directory": "publishing/adapters/cli",
          "testsDirectory": "publishing/tests/adapters/cli"
        }
      ],
      "status": "declared",
      "input": "contracts/content/publication-transition.schema.json",
      "output": "contracts/content/publication-receipt.schema.json",
      "errors": "contracts/api/errors.schema.json",
      "directory": "publishing/operations/publish",
      "testsDirectory": "publishing/tests/operations/publish",
      "implementation": null,
      "verification": [
        {
          "id": "publishing.publish.contract",
          "category": "contract",
          "expectation": "Transition references the authorized source revision and returns a publication receipt without private material.",
          "tests": []
        },
        {
          "id": "publishing.publish.access",
          "category": "access",
          "expectation": "Anonymous callers and non-owners cannot read or change private material.",
          "tests": []
        },
        {
          "id": "publishing.publish.behavior",
          "category": "behavior",
          "expectation": "Draft edits remain private; only explicit publication changes the active public revision.",
          "tests": []
        },
        {
          "id": "publishing.publish.failure",
          "category": "failure",
          "expectation": "Conflicting revisions and retry failures do not overwrite work or expose drafts.",
          "tests": []
        }
      ]
    },
    {
      "id": "publishing.withdraw",
      "access": {
        "kind": "authenticated",
        "permissions": [
          "publishing.publish"
        ],
        "ownership": "caller"
      },
      "bindings": [
        {
          "id": "publishing.withdraw.http",
          "surface": {
            "kind": "http",
            "method": "POST",
            "path": "/api/publications/{id}/withdraw"
          },
          "scope": "required",
          "status": "declared",
          "implementation": null,
          "tests": [],
          "directory": "publishing/adapters/http",
          "testsDirectory": "publishing/tests/adapters/http"
        },
        {
          "id": "publishing.withdraw.mcp-tool",
          "surface": {
            "kind": "mcp-tool",
            "name": "withdraw",
            "description": "Withdraw for the authenticated owner.",
            "readOnly": false
          },
          "scope": "required",
          "status": "declared",
          "implementation": null,
          "tests": [],
          "directory": "publishing/adapters/mcp",
          "testsDirectory": "publishing/tests/adapters/mcp"
        },
        {
          "id": "publishing.withdraw.cli",
          "surface": {
            "kind": "cli",
            "command": "ae publications withdraw <id>",
            "output": "json"
          },
          "scope": "required",
          "status": "declared",
          "implementation": null,
          "tests": [],
          "directory": "publishing/adapters/cli",
          "testsDirectory": "publishing/tests/adapters/cli"
        }
      ],
      "status": "declared",
      "input": "contracts/content/publication-transition.schema.json",
      "output": "contracts/content/publication-receipt.schema.json",
      "errors": "contracts/api/errors.schema.json",
      "directory": "publishing/operations/withdraw",
      "testsDirectory": "publishing/tests/operations/withdraw",
      "implementation": null,
      "verification": [
        {
          "id": "publishing.withdraw.contract",
          "category": "contract",
          "expectation": "Transition references the authorized source revision and returns a publication receipt without private material.",
          "tests": []
        },
        {
          "id": "publishing.withdraw.access",
          "category": "access",
          "expectation": "Anonymous callers and non-owners cannot read or change private material.",
          "tests": []
        },
        {
          "id": "publishing.withdraw.behavior",
          "category": "behavior",
          "expectation": "Draft edits remain private; only explicit publication changes the active public revision.",
          "tests": []
        },
        {
          "id": "publishing.withdraw.failure",
          "category": "failure",
          "expectation": "Conflicting revisions and retry failures do not overwrite work or expose drafts.",
          "tests": []
        }
      ]
    }
  ],
  "events": [],
  "capabilityPaths": {
    "publication-projects": "publishing/projects",
    "application-delivery": "publishing/delivery",
    "publication": "publishing/domain/publication",
    "exports": "publishing/adapters/exports",
    "rss": "publishing/adapters/rss",
    "atom": "publishing/adapters/atom",
    "markdown-downloads": "publishing/adapters/exports/markdown",
    "offline-bundles": "publishing/adapters/exports/offline-bundle",
    "subscriptions": "publishing/domain/subscriptions",
    "changelog": "publishing/domain/changelog"
  },
  "structure": {
    "domain": "publishing/domain",
    "operations": "publishing/operations",
    "ports": "publishing/ports",
    "adapters": "publishing/adapters",
    "tests": "publishing/tests",
    "composition": "publishing/composition",
    "distribution": "publishing/operations/distribute",
    "database": "publishing/adapters/d1",
    "assets": "publishing/adapters/r2",
    "migrations": "publishing/migrations"
  },
  "entrypoints": []
} as const satisfies SystemManifest;
