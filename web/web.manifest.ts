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
      "Public / is the entry even for a workspace-shaped product. Use a hero-led page with immediate paths into readings and About me.",
      "The landing uses a large rounded SVG research field, without an eye outline or text labels. Theme-specific inner shadows and edge highlights place the scene behind the page. Static CRT scanlines, phosphor texture, and edge shading cover the artwork only; no flicker. Dark mode shows an illustrative bird lab on warm light-mode paper, with tracking paths and no clouds; light mode shows an approved atlas-style illustrated galaxy with faint coordinate guides. These are visual studies, not measured results. CSS follows explicit and system themes.",
      "Keep hero text and destination links in semantic HTML, usable immediately without JavaScript. The home fits one viewport when space allows; short screens and text zoom can scroll without clipping.",
      "Render the research field as static inline SVG with the declared local galaxy image. It needs no JavaScript, animation, GPU context, or third-party runtime assets. Keep text contrast and keyboard focus clear in both themes.",
      "The hero introduces a workbench for research and ideas. Invite exploration and observation without claiming that writing is already published.",
      "Approved Shared circles AE mark. Public pages share the artwork blue radial background; light mode uses pale blue and warm paper. Theme choices stay local.",
      "Shared dark artwork tokens preserve the amber, orange, red, and plum gradient for reuse beyond the landing.",
      "Primary destinations: Readings (/readings), About me (/about), and Workbench (/guest/dashboard). Workbench opens the synthetic guest dashboard. Resume stays accessible from About me.",
      "Public navigation is separate from the workspace sidebar. Never redirect an unknown visitor into the owner workspace.",
      "Owner workspace routes are not linked from the public site. The public Workbench link opens the declared guest dashboard.",
      "Light-mode window depth uses a page-colored recessed lip outside the dark galaxy; the inner shadow alone cannot define the edge against dark artwork.",
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
    "publishing",
    "resume",
    "system-explorer",
    "privacy",
    "studio",
    "dashboard"
  ],
  "schemaVersion": 5,
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
} as const satisfies SystemManifest;
