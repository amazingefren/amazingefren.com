import type { Risk } from './manifests/schema/risk.schema.ts';

export default {
  id: "ae",
  purpose: "My personal workspace, with a public site for sharing work and methods.",
  status: "prototype",
  design: {
    system: "design/design.manifest.ts",
    sdk: "Generate clients from versioned contracts.",
    infrastructure: "Cloudflare; first launch configuration and acceptance: cloudflare/deployment.manifest.ts.",
    deployment: "External CI proposed for selective submodule checkout; not configured.",
    prototypes: ["public-landing", "writing-studio", "dashboard", "guest-workspace", "system-explorer"],
    prototypeConvention: "manifests/prototypes/prototype.manifest.ts",
    direction: "Approved workspace composition and sun/moon themes follow AE Design. Public page composition stays in web/web.manifest.ts.",
    landing: "Public composition belongs to web/web.manifest.ts. Visual language, brand, tokens, and shared behavior belong to design/design.manifest.ts.",
    entry: "Public site first. Separate public navigation and workspace sidebar. Owner workspace opens on Dashboard.",
    guest: "First deployment protects guest and owner workspaces with the single owner passkey session. Public guest access is deferred.",
  },
  risks: [
  {
    id: "ae.dependency-compromise",
    owner: "amazingefren",
    scenario: "A malicious or compromised direct or transitive npm package executes during install, build, or runtime.",
    consequence: "Developer or CI credentials stolen, private source exposed, or malicious code shipped to visitors.",
    status: "open",
    inherent: { likelihood: 3, impact: 5, rationale: "Initial qualitative estimate; dependencies execute code with the permissions of their environment." },
    residual: null,
    treatment: {
      strategy: "reduce",
      action: "Minimize dependencies; verify package identity; review direct and transitive lockfile changes; use locked CI installs; deny install scripts by default with reviewed exceptions; isolate builds from private material and deployment credentials; scan advisories and provenance where available. These signals do not prove code safe. On compromise, stop releases, identify affected artifacts, revoke exposed credentials, and rebuild from reviewed inputs in a clean environment.",
      status: "proposed",
      implementations: [],
      evidence: []
    },
    resolution: null,
    reviewedOn: "2026-09-04",
    reviewTrigger: "Dependency or lockfile changes, new install scripts, security advisories, and before CI or deployment receives secrets."
  },
  {
    "id": "ae.provider-loss",
    "owner": "amazingefren",
    "scenario": "Cloudflare suspends the account or has an extended outage.",
    "consequence": "Site, APIs, and access to hosted data become unavailable.",
    "status": "open",
    "inherent": {
      "likelihood": 2,
      "impact": 5,
      "rationale": "Initial estimate, not measured frequency."
    },
    "residual": null,
    "treatment": {
      "strategy": "reduce",
      "action": "Keep encrypted backups outside the provider account; test D1/R2 restoration and an alternate runtime; retain independent domain control.",
      "status": "proposed",
      "implementations": [],
      "evidence": []
    },
    "resolution": null,
    "reviewedOn": "2026-09-04",
    "reviewTrigger": "Before auth or data goes live; on design, provider, recovery, or incident changes."
  },
  {
    "id": "ae.backup-failure",
    "owner": "amazingefren",
    "scenario": "Backups are missing, corrupt, or share the failed provider account.",
    "consequence": "Private source material is permanently lost.",
    "status": "open",
    "inherent": {
      "likelihood": 3,
      "impact": 5,
      "rationale": "Initial estimate, not measured frequency."
    },
    "residual": null,
    "treatment": {
      "strategy": "reduce",
      "action": "Define recovery time and data-loss targets; automate independent encrypted exports and verify restores.",
      "status": "proposed",
      "implementations": [],
      "evidence": []
    },
    "resolution": null,
    "reviewedOn": "2026-09-04",
    "reviewTrigger": "Before auth or data goes live; on design, provider, recovery, or incident changes."
  }
] satisfies readonly Risk[],
  frontend: { public: "RedwoodSDK SSR", interactive: "React", language: "TypeScript", styling: "scoped CSS and CSS Modules", runtime: "Cloudflare Workers", workspace: "npm" },
  authoring: { system: "studio", runtime: "ae-studio-engine", publication: "publishing", contracts: "contracts/writing/index.ts", notes: "workspace/ui/writing/Notes.tsx", writer: "workspace/ui/writing/Publications.tsx" },
  contentStorage: { sourceOfTruth: "D1", files: "R2", gitContent: "fixtures-and-approved-exports-only", publishingRequiresDeployment: false },
  access: {
    scope: "required",
    status: "declared",
    principle: "Read public content and approved system descriptions without the website UI.",
    channels: {
      "full-text-rss": "publishing/adapters/rss",
      "atom": "publishing/adapters/atom",
      "stable-permalinks": "publishing/domain/permalinks",
      "markdown-downloads": "publishing/adapters/exports/markdown",
      "no-javascript-html": "web/ui/reading",
      "json-system-catalog": "system-explorer/adapters/exports/json",
      "remote-mcp": "mcp/transport",
      "claude-connector-compatibility": "mcp/clients/claude",
      "cli": "cli/commands",
      "offline-bundles": "publishing/adapters/exports/offline-bundle",
      "onion-mirror": "integrations/adapters/onion",
      "ipfs-snapshots": "integrations/adapters/ipfs",
      "opml": "publishing/adapters/opml",
      "webmentions": "integrations/adapters/webmentions",
      "changelog-feed": "publishing/adapters/changelog"
},
    completion: "Ship each capability with all applicable bindings.",
    invariants: ["same-approved-revision", "same-access-rules", "no-private-data-in-public-exports", "source-provenance"],
  },
  patterns: ["functional-core", "ports-and-adapters", "composition-root", "thin-gateways", "explicit-results", "deny-by-default", "generated-bindings"],
  verification: {
    approach: "Implement first; verify declared obligations with independent expectations.",
    categories: ["contract", "access", "behavior", "failure", "integration"],
    unit: "system / operation / obligation",
    resultStates: ["not-run", "passed", "failed", "blocked"],
    lineCoverageTarget: null,
    limitation: "Current checks validate declarations and references. Runtime obligations remain untested; no benchmark runner exists.",
  },
  systems: "manifests/registry.ts",
  rules: "AGENTS.md",
  privacy: "privacy/privacy.manifest.ts",
  evidence: "evidence/evidence.manifest.ts",
  contracts: { work: "contracts/work", api: "contracts/api", events: "contracts/events", content: "contracts/content", studio: "contracts/studio" },
  structure: {
    "sdk": "sdk",
    "cli": "cli/commands",
    "infrastructure": "cloudflare",
    "workers": "cloudflare/workers",
    "pages": "cloudflare/pages",
    "d1": "cloudflare/d1",
    "r2": "cloudflare/r2",
    "deployment": ".github/workflows",
    "content": "content",
    "articles": "content/articles",
    "publications": "content/publications",
    "projects": "content/projects",
    "studioPrototype": "prototypes/studio",
    "explorerPrototype": "prototypes/system-explorer"
},
  privateMaterial: { repository: "ae-workbench", manifest: "ae-workbench.manifest.ts", requiredForPublicBuild: false },
  privateEngines: ["ae-resume-engine", "ae-publishing-engine", "ae-system-engine", "ae-studio-engine", "ae-eval-engine"],
} as const;
