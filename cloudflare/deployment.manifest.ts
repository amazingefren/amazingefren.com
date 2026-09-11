export default {
  purpose: 'Gate the first deployment until owner access and storage are configured.',
  decisions: [
    'Public web and private owner service use a shared dedicated AUTH_DB for passkeys and sessions. Content uses a separate WORKSPACE_OWNER_DB and private WRITING_ASSETS bucket.',
    'Production authentication uses the exact HTTPS AUTH_ORIGIN. Enroll on the permanent domain after TLS is active; localhost or preview passkeys do not migrate to that domain.',
    'Set AUTH_BOOTSTRAP_TOKEN as a Worker secret with at least 32 random bytes encoded as base64url. Never put it in URLs, source, logs, or command history. Enrollment closes permanently in D1 after the first passkey; remove the secret after enrollment.',
    'The web Worker has the sole public route. Disable workers.dev and preview URLs on both Workers; the owner service has no public routes.',
    'Use a fresh database with the consolidated initial migration. Existing local databases retain their migration history; export any needed records before choosing a new local database. Do not replay the initial migration over old tables.',
    'The owner must test 1Password enrollment, logout, repeat sign-in, and an independent backup passkey on the final domain before storing irreplaceable data.',
    'Cloudflare account connection, provisioning, secrets, remote migration application, deployment, and restore drills remain unperformed.'
  ],
  capabilities: ['web', 'owner-auth', 'private-storage'],
  governance: { release: 'Blocked until configuration checks and final-domain passkey acceptance pass.', deploymentsAuthorized: false },
  risks: ['Local tests do not prove provider configuration, backup recovery, or 1Password behavior.'],
  contracts: {
    origin: 'https://amazingefren.com',
    web: { config: 'web/wrangler.jsonc', database: 'AUTH_DB', service: 'WORKSPACE_OWNER_SERVICE', serviceName: 'ae-studio-engine-owner-service' },
    owner: { config: 'ae-studio-engine/wrangler.jsonc', databases: ['AUTH_DB', 'WORKSPACE_OWNER_DB'], bucket: 'WRITING_ASSETS' },
    migrations: { auth: 'auth/migrations', owner: 'ae-studio-engine/migrations' }
  },
  bindings: { preflight: 'npm run launch:check' },
  paths: { check: 'cloudflare/check-launch.ts', review: 'ae-workbench/auth-launch-review/review.json' }
} as const;
