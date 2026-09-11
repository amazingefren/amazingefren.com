export default {
  purpose: 'Govern first-deployment configuration and owner acceptance.',
  decisions: [
    'One Cloudflare Builds pipeline checks and builds both Workers, applies pending auth and content D1 migrations, then deploys owner before web. Each failed command stops the sequence; completed migrations and deployments are not rolled back together. Schema and API changes must support the preceding deployed version.',
    'The owner subprocess clears the ae-web CI name and tag overrides. The web subprocess retains those safeguards. The selected build token needs D1 Edit as well as Worker deployment permissions. Existing R2 and D1 resource bindings are reused.',
    'Owner requires Cloudflare-hosted builds with access to private submodules for application functionality. Keep pinned revisions and use HTTPS GitHub URLs for CI checkout. Push submodule commits before the parent revision. Validate checkout in Cloudflare before claiming automation is ready.',
    '2026-09-10: Owner marks this first deployment as initialization. First publication: https://amazingefren.com/readings/ae-intro.',
    'Owner requested continued first-deployment setup on 2026-09-10 and connected Wrangler. Account and active amazingefren.com zone verified before resource creation. Keep Worker observability disabled until collection is approved.',
    'Public web and private owner service use a shared dedicated AUTH_DB for passkeys and sessions. Content uses a separate WORKSPACE_OWNER_DB and private WRITING_ASSETS bucket.',
    'Production authentication uses the exact HTTPS AUTH_ORIGIN. Enroll on the permanent domain after TLS is active; localhost or preview passkeys do not migrate to that domain.',
    'Set AUTH_BOOTSTRAP_TOKEN as a Worker secret with at least 32 random bytes encoded as base64url. Never put it in URLs, source, logs, or command history. Enrollment closes permanently in D1 after the first passkey; remove the secret after enrollment.',
    'The web Worker has the sole public route. Disable workers.dev and preview URLs on both Workers; the owner service has no public routes.',
    'Use a fresh database with the consolidated initial migration. Existing local databases retain their migration history; export any needed records before choosing a new local database. Do not replay the initial migration over old tables.',
    'The owner must test 1Password enrollment, logout, repeat sign-in, and an independent backup passkey on the final domain before storing irreplaceable data.',
    'Cloudflare resources and initial schemas were created on 2026-09-10. Both Workers are deployed on the permanent HTTPS domain; live anonymous access checks passed. First owner passkey enrollment is confirmed and the bootstrap secret is removed. Repeat sign-in acceptance and restore drills remain pending.',
  ],
  capabilities: ['web', 'owner-auth', 'private-storage', 'deployment'],
  governance: {
    release:
      'Deployed with private access protected. First owner enrolled; repeat sign-in acceptance remains pending.',
    deploymentsAuthorized: true,
  },
  risks: [
    'Local tests do not prove provider configuration, backup recovery, or 1Password behavior.',
  ],
  contracts: {
    accountId: '9a90a6a9b628c0261f3882373dde0439',
    pipeline: {
      web: {
        config: 'web/wrangler.jsonc',
        builtConfig: 'web/dist/worker/wrangler.json',
        name: 'ae-web',
      },
      owner: {
        config: 'ae-studio-engine/wrangler.jsonc',
        name: 'ae-studio-engine-owner-service',
      },
      databases: [
        { name: 'ae-auth', config: 'ae-studio-engine/wrangler.jsonc' },
        { name: 'ae-workspace', config: 'ae-studio-engine/wrangler.jsonc' },
      ],
    },
    builds: {
      root: '/',
      nodeVersionFile: '.node-version',
      buildCommand: 'npm run build:deploy',
      deployCommand: 'npm run migrate && npm run deploy',
      previewBuilds: false,
    },
    origin: 'https://amazingefren.com',
    web: {
      config: 'web/wrangler.jsonc',
      database: 'AUTH_DB',
      service: 'WORKSPACE_OWNER_SERVICE',
      serviceName: 'ae-studio-engine-owner-service',
    },
    owner: {
      config: 'ae-studio-engine/wrangler.jsonc',
      databases: ['AUTH_DB', 'WORKSPACE_OWNER_DB'],
      bucket: 'WRITING_ASSETS',
    },
    migrations: {
      auth: 'auth/migrations',
      owner: 'ae-studio-engine/migrations',
    },
  },
  bindings: {
    preflight: 'npm run launch:check',
    build: 'npm run build:deploy',
    migrate: 'npm run migrate',
    deploy: 'npm run deploy',
    dryRun: 'npm run deploy:dry-run',
  },
  paths: {
    deployment: 'cloudflare/deployment/index.ts',
    deploymentContracts: 'cloudflare/deployment/contracts.ts',
    deploymentTypecheck: 'cloudflare/deployment/tsconfig.json',
    deploymentPlan: 'cloudflare/deployment/plan.ts',
    deploymentTests: 'cloudflare/deployment/plan.test.ts',
    check: 'cloudflare/check-launch.ts',
    review: 'ae-workbench/auth-launch-review/review.json',
  },
} as const;
