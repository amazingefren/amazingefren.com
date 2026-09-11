import type { LaunchAccess } from './contracts/access.ts';
import type { SystemManifest } from '../manifests/schema/system.schema.ts';

export default {
  kind: "system",
  "id": "web",
  "name": "AE Web",
  "purpose": "My portfolio and a place to read.",
  "owner": "amazingefren",
  "status": "declared",
  "scope": "required",
  "visibility": "public",
  "context": {
    "decisions": [
      "First deployment: workspace, guest pages, guest APIs, owner APIs, and framework actions require the single owner passkey session. /auth/me stays unlinked. The synthetic guest implementation remains available only to the owner until a later release.",
      "Public / is the entry even for a workspace-shaped product. Use a hero-led page with immediate paths into readings and About me.",
      "Readings is the primary public destination, including while its publishing system is built. Keep the home reading action prominent. Public refinements use web/ui/shared/public-shell.css: 14px navigation and actions, 12px metadata, footer theme selection, and shared mobile margins. Owner rejected the compact reading empty state on 2026-09-09: retain the large title, editorial reading-room composition, decorative circles, and layout-demo link.",
      "Owner approved Open field for application implementation on 2026-09-09. Center the introduction in the main area. Use an unframed, contained background: broad bird grid with one corner-bracket detection box on the large middle bird and no crosshairs in light mode, galaxy in dark mode. Preserve the approved copy and primary Readings action. Artwork is illustrative, not measured telemetry.",
      "Keep hero text and destination links in semantic HTML, usable immediately without JavaScript. The home fits one viewport when space allows; short screens and text zoom can scroll without clipping.",
      "OpenField renders semantic HTML and inline SVG with the declared local galaxy image. Optional motion starts through observation-motion.ts: one simultaneous entrance with static bird silhouettes gliding from distinct positions. Only the large middle bird receives detection, with a quick ease-out into its final position. Flights last 1.08–1.49 seconds with a continuous ease-out. Birds start transparent before the scene mounts and fade in over the first 35 percent of the flight. The sequence settles after 1.6 seconds. Dark mode uses the original static galaxy image, with no animation or motion button. Reduced motion and no JavaScript show the final static scene; hidden documents pause. Dark startup defers the bird entrance until the effective theme becomes light; a completed entrance stays settled across theme switches. Keep content and links available immediately. Tests: web/tests/landing/observation-motion.test.ts.",
      "The hero introduces a workbench for research and ideas. Invite exploration and observation without claiming that writing is already published.",
      "Use design/design.manifest.ts for the visual language, brand, themes, tokens, shared controls, and interaction rules. Keep route content and public composition here.",
      "Primary destinations: Readings (/readings) and About me (/about). Resume stays accessible from About me.",
      "About uses a compact two-column profile: name and role beside the approved bio, with aligned resume downloads and contact details. Keep existing personal claims. Its component and styles live in web/ui/portfolio to limit shared-file edits.",
      "Public navigation is separate from the workspace sidebar. Never redirect an unknown visitor into the owner workspace.",
      "Navigation uses full documents so each shell receives its styles and bootstrap scripts. Public documents opt into native view transitions: content exits over 180ms and fades upward by 4px over 400ms after 60ms. Only one header, footer, and root snapshot is shown, without animation. Workspace documents do not opt in. Reduced-motion preferences and unsupported browsers use ordinary navigation.",
      "Workspace and auth routes are not linked from the public site.",
      "The approved Open field background stops at the header and footer; no window lip, CRT texture, or frame. The older ObservationField is retained only for archived prototype references.",
      "Use AE Design copy and interaction rules. Readings needs one empty state, and the article demo needs one demo label. Keep approved personal text. Review every public route in both themes and narrow layouts.",
      "Short labels and useful content; no prototype implementation explanations in visitor flows. Mark synthetic data with concise labels.",
      "Public builds need no private engines.",
      "Articles and navigation remain usable without JavaScript.",
      "Make shortcuts discoverable; never trap focus.",
      "Public content must be readable without this website.",
      "UI commands grant no server permissions. Allow shortcut remapping and disabling; never capture unrelated text inputs.",
      "Show an honest empty reading state until approved writing is available. A clearly labeled demonstration route documents the reading layout.",
      "Apply privacy/policy.json; never expose private material through analytics.",
      "Discovery files are empty placeholders, not active policies.",
      "llms.txt is a discovery proposal. agents.txt is reserved pending a defined consumer; repository AGENTS.md remains separate.",
      "RedwoodSDK server rendering on Cloudflare Workers; React for optional local theme controls.",
      "Keep authoring portable and dependency-light with server-rendered TSX while no approved articles exist; defer MDX compilation until publishing needs trusted source files.",
      "Use native HTML and scoped CSS or CSS Modules with shared design tokens.",
      "RedwoodSDK mounts manifest pages. Private pages need an authorization adapter.",
      "The public pages use server-rendered HTML with an RSC payload for optional theme controls. Domain rules stay outside UI.",
      "Only public presentation runs. No analytics, application data, or private engines.",
      "Theme selection is an optional local display preference. It is not sent to the server and does not enable analytics.",
      "Cloudflare observability stays disabled until its collection and retention scope is approved."
    ],
    "openQuestions": ["Define measurable mobile loading and frame-time budgets before a production release."]
  },
  "capabilities": [
    "portfolio",
    "observation-landing",
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
    "design",
    "publishing",
    "resume",
    "system-explorer",
    "privacy",
    "studio",
    "dashboard"
  ],
  "schemaVersion": 5,
  "launchAccess": {
    "ownerPrefixes": ["/workspace", "/guest", "/api/workspace", "/api/guest", "/api/work", "/api/writing", "/api/dashboard"],
    "signInPath": "/auth/me",
    "frameworkActions": "denied",
    "tests": ["web/tests/access/access.test.ts", "web/tests/access/writing-gateway.test.ts", "web/tests/runtime/launch.mjs"]
  },
  "contracts": ["web/contracts/access.ts"],
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
    { "path": "/privacy", "entrypoint": "web/adapters/http/public.tsx", "access": { "kind": "public" }, "status": "implemented" },
    {
      "path": "/",
      "entrypoint": "web/adapters/http/public.tsx",
      "access": {
        "kind": "public"
      },
      "status": "implemented"
    },
    {
      "path": "/readings",
      "entrypoint": "web/adapters/http/public.tsx",
      "access": {
        "kind": "public"
      },
      "status": "implemented"
    },
    {
      "path": "/readings/demo",
      "entrypoint": "web/adapters/http/public.tsx",
      "access": {
        "kind": "public"
      },
      "status": "implemented"
    },
    {
      "path": "/about",
      "entrypoint": "web/adapters/http/public.tsx",
      "access": {
        "kind": "public"
      },
      "status": "implemented"
    },
    {
      "path": "*",
      "entrypoint": "web/adapters/http/public.tsx",
      "access": {
        "kind": "public"
      },
      "status": "implemented"
    }
  ],
  "staticFiles": [
    { "path": "/assets/galaxy-illustrated.png", "source": "web/public/assets/galaxy-illustrated.png", "status": "ready" },
    {
      "path": "/assets/continuum-color.svg",
      "source": "web/public/assets/continuum-color.svg",
      "status": "ready"
    },
    {
      "path": "/assets/continuum-blue.svg",
      "source": "web/public/assets/continuum-blue.svg",
      "status": "ready"
    },
    {
      "path": "/assets/continuum-mono.svg",
      "source": "web/public/assets/continuum-mono.svg",
      "status": "ready"
    },
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
    },
    {
      "path": "/resume/Efren_Castro_Flagship_Resume.pdf",
      "source": "web/public/resume/Efren_Castro_Flagship_Resume.pdf",
      "status": "ready"
    },
    {
      "path": "/resume/Efren_Castro_Flagship_Resume.docx",
      "source": "web/public/resume/Efren_Castro_Flagship_Resume.docx",
      "status": "ready"
    },
    {
      "path": "/resume/Efren_Castro_Flagship_Resume.tex",
      "source": "web/public/resume/Efren_Castro_Flagship_Resume.tex",
      "status": "ready"
    }
  ],
  "capabilityPaths": {
    "portfolio": "web/ui/portfolio",
    "observation-landing": "web/ui/landing",
    "reading": "web/ui/reading",
    "keyboard-navigation": "web/ui/keyboard",
    "no-javascript-reading": "web/ui/reading"
  },
  "structure": {
    "publicShell": "web/ui/shared",
    "domain": "web/domain",
    "operations": "web/operations",
    "ports": "web/ports",
    "adapters": "web/adapters",
    "tests": "web/tests",
    "composition": "web/composition",
    "public": "web/public"
  },
  "entrypoints": [
    "web/vite.config.ts",
    "web/src/client.tsx",
    "web/composition/worker.tsx",
    "web/adapters/http/document.tsx",
    "web/package.json",
    "web/wrangler.jsonc"
  ]
} as const satisfies SystemManifest & { launchAccess: LaunchAccess };
