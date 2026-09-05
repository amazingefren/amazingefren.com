import type { SystemManifest } from '../manifests/schema/system.schema.ts';

export default {
  kind: "system",
  "id": "web",
  "name": "AE Web",
  "purpose": "My portfolio and a place to read.",
  "owner": "amazingefren",
  "status": "prototype",
  "scope": "required",
  "visibility": "public",
  "context": {
    "decisions": [
      "Public builds need no private engines.",
      "Articles and navigation remain usable without JavaScript.",
      "Make shortcuts discoverable; never trap focus.",
      "Public content must be readable without this website.",
      "UI commands grant no server permissions. Allow shortcut remapping and disabling; never capture unrelated text inputs.",
      "Load the current publication list; no Git commit or build per article.",
      "Apply privacy/policy.json; never expose private material through analytics.",
      "Discovery files are empty placeholders, not active policies.",
      "llms.txt is a discovery proposal. agents.txt is reserved pending a defined consumer; repository AGENTS.md remains separate.",
      "Astro server rendering on Cloudflare Workers; React islands for interactive views.",
      "Use native HTML and scoped CSS or CSS Modules with shared design tokens.",
      "Astro mounts manifest pages. Private pages need an authorization adapter.",
      "Only Hello World runs. No analytics, application data, or private engines.",
      "Cloudflare observability stays disabled until its collection and retention scope is approved."
    ],
    "openQuestions": []
  },
  "capabilities": [
    "portfolio",
    "reading",
    "keyboard-navigation",
    "no-javascript-reading"
  ],
  "governance": {
    "permissionsDefined": [],
    "dataClassification": "public"
  },
  "risks": [],
  "dependencies": [
    "publishing",
    "resume",
    "system-explorer",
    "privacy"
  ],
  "schemaVersion": 4,
  "contracts": [],
  "operations": [],
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
    "directory": "web/ui/keyboard",
    "testsDirectory": "web/tests/keyboard"
  },
  "pages": [
    {
      "path": "/",
      "entrypoint": "web/adapters/http/home.astro",
      "access": {
        "kind": "public"
      },
      "status": "prototype"
    }
  ],
  "staticFiles": [
    {
      "path": "/robots.txt",
      "source": "web/public/robots.txt",
      "status": "placeholder"
    },
    {
      "path": "/llms.txt",
      "source": "web/public/llms.txt",
      "status": "placeholder"
    },
    {
      "path": "/llms-full.txt",
      "source": "web/public/llms-full.txt",
      "status": "placeholder"
    },
    {
      "path": "/agents.txt",
      "source": "web/public/agents.txt",
      "status": "placeholder"
    },
    {
      "path": "/sitemap.xml",
      "source": "web/public/sitemap.xml",
      "status": "placeholder"
    },
    {
      "path": "/.well-known/security.txt",
      "source": "web/public/.well-known/security.txt",
      "status": "placeholder"
    }
  ],
  "capabilityPaths": {
    "portfolio": "web/ui/portfolio",
    "reading": "web/ui/reading",
    "keyboard-navigation": "web/ui/keyboard",
    "no-javascript-reading": "web/ui/reading"
  },
  "structure": {
    "domain": "web/domain",
    "operations": "web/operations",
    "ports": "web/ports",
    "adapters": "web/adapters",
    "tests": "web/tests",
    "composition": "web/composition",
    "public": "web/public"
  },
  "entrypoints": [
    "web/astro.config.mjs",
    "web/package.json",
    "web/wrangler.jsonc"
  ]
} as const satisfies SystemManifest;
