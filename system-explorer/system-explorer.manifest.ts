import type { SystemManifest } from '../manifests/schema/system.schema.ts';

export default {
  kind: "system",
  "id": "system-explorer",
  "name": "AE System Explorer",
  "purpose": "Explore approved systems, contracts, connections, and governance.",
  "owner": "amazingefren",
  "status": "declared",
  "scope": "required",
  "visibility": "public",
  "context": {
    "decisions": [
      "Offer approved system descriptions, contracts, and verification metadata as JSON and readable text.",
      "Expose approved catalog fields only, including private engine projections. Never project workbench.",
      "Include source revisions; distinguish declared governance from verified behavior.",
      "Ship bindings with their operation; implement and independently verify each adapter.",
      "UI commands grant no server permissions. Allow shortcut remapping and disabling; never capture unrelated text inputs."
    ],
    "openQuestions": [
      "Graph and operation verification views."
    ]
  },
  "capabilities": [
    "system-discovery",
    "architecture-exploration",
    "portable-system-catalog"
  ],
  "governance": {
    "permissionsDefined": [],
    "dataClassification": "public"
  },
  "risks": [],
  "dependencies": [
    "manifests"
  ],
  "schemaVersion": 5,
  "contracts": [
    "contracts/api/catalog-list.schema.json",
    "contracts/api/catalog.schema.json",
    "contracts/api/errors.schema.json",
    "contracts/api/list-input.schema.json",
    "contracts/api/read-input.schema.json"
  ],
  "operations": [
    {
      "id": "system-explorer.list",
      "access": {
        "kind": "public"
      },
      "bindings": [
        {
          "id": "system-explorer.list.http",
          "surface": {
            "kind": "http",
            "method": "GET",
            "path": "/api/systems"
          },
          "scope": "required",
          "status": "declared",
          "implementation": null,
          "tests": [],
          "directory": "system-explorer/adapters/http",
          "testsDirectory": "system-explorer/tests/adapters/http"
        },
        {
          "id": "system-explorer.list.mcp-tool",
          "surface": {
            "kind": "mcp-tool",
            "name": "list_systems",
            "description": "List approved public systems.",
            "readOnly": true
          },
          "scope": "required",
          "status": "declared",
          "implementation": null,
          "tests": [],
          "directory": "system-explorer/adapters/mcp",
          "testsDirectory": "system-explorer/tests/adapters/mcp"
        },
        {
          "id": "system-explorer.list.cli",
          "surface": {
            "kind": "cli",
            "command": "ae systems list",
            "output": "json"
          },
          "scope": "required",
          "status": "declared",
          "implementation": null,
          "tests": [],
          "directory": "system-explorer/adapters/cli",
          "testsDirectory": "system-explorer/tests/adapters/cli"
        },
        {
          "id": "system-explorer.list.export",
          "surface": {
            "kind": "export",
            "format": "json",
            "path": "/exports/systems/index.json"
          },
          "scope": "required",
          "status": "declared",
          "implementation": null,
          "tests": [],
          "directory": "system-explorer/adapters/exports/json",
          "testsDirectory": "system-explorer/tests/adapters/exports/json"
        },
        {
          "id": "system-explorer.list.offline",
          "surface": {
            "kind": "export",
            "format": "offline-bundle",
            "path": "/exports/systems.zip"
          },
          "scope": "required",
          "status": "declared",
          "implementation": null,
          "tests": [],
          "directory": "system-explorer/adapters/exports/offline-bundle",
          "testsDirectory": "system-explorer/tests/adapters/exports/offline-bundle"
        },
        {
          "id": "system-explorer.list.onion",
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
          "directory": "system-explorer/adapters/onion",
          "testsDirectory": "system-explorer/tests/adapters/onion"
        },
        {
          "id": "system-explorer.list.ipfs",
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
          "directory": "system-explorer/adapters/ipfs",
          "testsDirectory": "system-explorer/tests/adapters/ipfs"
        }
      ],
      "status": "declared",
      "input": "contracts/api/list-input.schema.json",
      "output": "contracts/api/catalog-list.schema.json",
      "errors": "contracts/api/errors.schema.json",
      "implementation": null,
      "verification": [
        {
          "id": "system-explorer.list.contract",
          "category": "contract",
          "expectation": "Input and output conform to the referenced schemas.",
          "tests": []
        },
        {
          "id": "system-explorer.list.access",
          "category": "access",
          "expectation": "Only approved public data is returned; private fields never appear.",
          "tests": []
        },
        {
          "id": "system-explorer.list.behavior",
          "category": "behavior",
          "expectation": "All delivery bindings return the same approved revision.",
          "tests": []
        },
        {
          "id": "system-explorer.list.failure",
          "category": "failure",
          "expectation": "Invalid input and missing data produce defined failures.",
          "tests": []
        }
      ],
      "directory": "system-explorer/operations/list",
      "testsDirectory": "system-explorer/tests/operations/list"
    },
    {
      "id": "system-explorer.read",
      "access": {
        "kind": "public"
      },
      "bindings": [
        {
          "id": "system-explorer.read.http",
          "surface": {
            "kind": "http",
            "method": "GET",
            "path": "/api/systems/{id}"
          },
          "scope": "required",
          "status": "declared",
          "implementation": null,
          "tests": [],
          "directory": "system-explorer/adapters/http",
          "testsDirectory": "system-explorer/tests/adapters/http"
        },
        {
          "id": "system-explorer.read.mcp-tool",
          "surface": {
            "kind": "mcp-tool",
            "name": "read_systems",
            "description": "Read approved public systems.",
            "readOnly": true
          },
          "scope": "required",
          "status": "declared",
          "implementation": null,
          "tests": [],
          "directory": "system-explorer/adapters/mcp",
          "testsDirectory": "system-explorer/tests/adapters/mcp"
        },
        {
          "id": "system-explorer.read.cli",
          "surface": {
            "kind": "cli",
            "command": "ae systems read <id>",
            "output": "json"
          },
          "scope": "required",
          "status": "declared",
          "implementation": null,
          "tests": [],
          "directory": "system-explorer/adapters/cli",
          "testsDirectory": "system-explorer/tests/adapters/cli"
        },
        {
          "id": "system-explorer.read.export",
          "surface": {
            "kind": "export",
            "format": "json",
            "path": "/exports/systems/{id}.json"
          },
          "scope": "required",
          "status": "declared",
          "implementation": null,
          "tests": [],
          "directory": "system-explorer/adapters/exports/json",
          "testsDirectory": "system-explorer/tests/adapters/exports/json"
        },
        {
          "id": "system-explorer.read.mcp-resource",
          "surface": {
            "kind": "mcp-resource",
            "uriTemplate": "ae://systems/{id}",
            "mimeType": "application/json"
          },
          "scope": "required",
          "status": "declared",
          "implementation": null,
          "tests": [],
          "directory": "system-explorer/adapters/mcp",
          "testsDirectory": "system-explorer/tests/adapters/mcp"
        }
      ],
      "status": "declared",
      "input": "contracts/api/read-input.schema.json",
      "output": "contracts/api/catalog.schema.json",
      "errors": "contracts/api/errors.schema.json",
      "implementation": null,
      "verification": [
        {
          "id": "system-explorer.read.contract",
          "category": "contract",
          "expectation": "Input and output conform to the referenced schemas.",
          "tests": []
        },
        {
          "id": "system-explorer.read.access",
          "category": "access",
          "expectation": "Only approved public data is returned; private fields never appear.",
          "tests": []
        },
        {
          "id": "system-explorer.read.behavior",
          "category": "behavior",
          "expectation": "All delivery bindings return the same approved revision.",
          "tests": []
        },
        {
          "id": "system-explorer.read.failure",
          "category": "failure",
          "expectation": "Invalid input and missing data produce defined failures.",
          "tests": []
        }
      ],
      "directory": "system-explorer/operations/read",
      "testsDirectory": "system-explorer/tests/operations/read"
    }
  ],
  "events": [],
  "keyboard": {
    "preset": "vim",
    "scope": "required",
    "status": "declared",
    "modes": [
      "normal"
    ],
    "remappable": true,
    "disableSingleCharacterShortcuts": true,
    "preserveBrowserShortcuts": true,
    "ignoreEditableTargetsOutsideEditor": true,
    "implementation": null,
    "tests": [],
    "bindings": [
      {
        "mode": "normal",
        "keys": "j",
        "action": "move-down"
      },
      {
        "mode": "normal",
        "keys": "k",
        "action": "move-up"
      },
      {
        "mode": "normal",
        "keys": "h",
        "action": "move-left"
      },
      {
        "mode": "normal",
        "keys": "l",
        "action": "move-right"
      },
      {
        "mode": "normal",
        "keys": "gg",
        "action": "go-start"
      },
      {
        "mode": "normal",
        "keys": "G",
        "action": "go-end"
      },
      {
        "mode": "normal",
        "keys": "/",
        "action": "search"
      },
      {
        "mode": "normal",
        "keys": "n",
        "action": "next-match"
      },
      {
        "mode": "normal",
        "keys": "N",
        "action": "previous-match"
      },
      {
        "mode": "normal",
        "keys": "?",
        "action": "show-bindings"
      },
      {
        "mode": "normal",
        "keys": "Escape",
        "action": "clear-mode"
      }
    ],
    "directory": "system-explorer/ui/keyboard",
    "testsDirectory": "system-explorer/tests/keyboard"
  },
  "capabilityPaths": {
    "system-discovery": "system-explorer/domain/catalog",
    "architecture-exploration": "system-explorer/ui/graph",
    "portable-system-catalog": "system-explorer/adapters/exports/json"
  },
  "structure": {
    "domain": "system-explorer/domain",
    "operations": "system-explorer/operations",
    "ports": "system-explorer/ports",
    "adapters": "system-explorer/adapters",
    "tests": "system-explorer/tests",
    "composition": "system-explorer/composition"
  },
  "entrypoints": []
} as const satisfies SystemManifest;
