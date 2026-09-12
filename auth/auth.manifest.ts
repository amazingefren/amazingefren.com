import type { SystemManifest } from '../manifests/schema/system.schema.ts';

export default {
  kind: 'system',
  id: 'auth',
  name: 'AE Auth',
  purpose: 'Single-owner passkey identity, sessions, and access evaluation.',
  owner: 'amazingefren',
  status: 'implemented',
  scope: 'required',
  visibility: 'public',
  context: {
    decisions: [
      '2026-09-11: Owner authorized revocable external-client draft credentials. Passkeys remain the only interactive owner sign-in. Client credentials grant publication draft reads/writes only, never publication release permission; management requires owner passkey session. Private engine stores hashes and verifies expiry/revocation before storage access.',
      'Only amazingefren can authenticate. Passkeys require user verification and discoverable credentials. ES256, RS256, and EdDSA are accepted consistently across runtimes. Passwords and SSO have no login or recovery path.',
      'AUTH_ORIGIN is one exact HTTPS origin. Its hostname is the relying-party ID. WebAuthn registration and authentication reject cross-origin contexts.',
      'Initial enrollment requires a secret of 43 to 256 characters sent in the POST body. Provision at least 32 random bytes encoded as base64url. A persistent singleton enrollment record permanently disables bootstrap after the first credential.',
      'Later enrollment requires the same valid owner session and passkey verification within five minutes. Enrollment permits up to ten passkeys, including independent backup keys.',
      'Sessions use random opaque 32-byte tokens; D1 stores SHA-256 hashes. Secure HttpOnly SameSite=Strict host cookies expire after twelve hours. Login rotates the current session. Logout revokes it.',
      'Challenges expire after five minutes, bind to a separate HttpOnly cookie, and are consumed atomically. D1 bounds active challenges, sessions, rate buckets, and request attempts.',
      'HTTP auth accepts only declared POST operations with exact Origin and same-origin Fetch Metadata. Inputs are limited to 16 KiB. Replies never cache.',
      'CF-Connecting-IP is a trusted Cloudflare runtime header for per-minute rate buckets. Deploy the handler only behind the Cloudflare runtime.',
      'The unlisted /auth/me page is public so the owner can authenticate; it exposes no workspace data and has no link in public navigation.',
      'Owner authorization comes only from the session verifier. Guest roles and forwarded identity or Access headers cannot grant owner access.',
      'Private services share AUTH_DB and receive only the owner session cookie over service bindings. Public builds do not require private engines.',
    ],
    openQuestions: [
      'Live 1Password registration, independent backup-key enrollment, and Cloudflare deployment validation remain required before launch.',
    ],
  },
  capabilities: ['identity', 'authorization', 'sessions'],
  governance: {
    permissionsDefined: [
      'studio.read',
      'studio.write',
      'publishing.publish',
      'studio.draft.read',
      'studio.draft.write',
      'studio.clients.manage',
    ],
    dataClassification: 'private',
  },
  risks: [
    {
      id: 'auth.password-guessing',
      owner: 'amazingefren',
      scenario: 'An attacker guesses a password or uses leaked credentials.',
      consequence: 'Unauthorized access.',
      status: 'open',
      inherent: {
        likelihood: 4,
        impact: 5,
        rationale:
          'Initial qualitative estimate for the intended platform; not measured incident frequency.',
      },
      residual: null,
      treatment: {
        strategy: 'avoid',
        action:
          'Use passkeys only; omit password login and password recovery. Verify no password fallback exists.',
        status: 'implemented',
        implementations: ['auth/composition/index.ts'],
        evidence: ['auth/tests/auth.test.ts', 'auth/tests/passkeys.test.ts'],
      },
      resolution: null,
      reviewedOn: '2026-09-10',
      reviewTrigger:
        'Before auth or data goes live; on design, provider, recovery, or incident changes.',
    },
    {
      id: 'auth.identity-provider-outage',
      owner: 'amazingefren',
      scenario: 'An external SSO provider is unavailable or suspends access.',
      consequence: 'Owner cannot sign in.',
      status: 'open',
      inherent: {
        likelihood: 3,
        impact: 4,
        rationale:
          'Initial qualitative estimate for the intended platform; not measured incident frequency.',
      },
      residual: null,
      treatment: {
        strategy: 'avoid',
        action:
          'Evaluate local WebAuthn verification without external SSO. Track hosting and authenticator dependencies separately.',
        status: 'implemented',
        implementations: ['auth/composition/index.ts'],
        evidence: ['auth/tests/auth.test.ts', 'auth/tests/passkeys.test.ts'],
      },
      resolution: null,
      reviewedOn: '2026-09-10',
      reviewTrigger:
        'Before auth or data goes live; on design, provider, recovery, or incident changes.',
    },
    {
      id: 'auth.credential-loss',
      owner: 'amazingefren',
      scenario:
        'All usable passkeys are lost or their sync provider becomes unavailable.',
      consequence: 'Permanent owner lockout.',
      status: 'open',
      inherent: {
        likelihood: 3,
        impact: 5,
        rationale:
          'Initial qualitative estimate for the intended platform; not measured incident frequency.',
      },
      residual: null,
      treatment: {
        strategy: 'reduce',
        action:
          'Enroll independent backup hardware keys; define and drill recovery without an unprotected bypass.',
        status: 'proposed',
        implementations: [],
        evidence: [],
      },
      resolution: null,
      reviewedOn: '2026-09-04',
      reviewTrigger:
        'Before auth or data goes live; on design, provider, recovery, or incident changes.',
    },
    {
      id: 'auth.enrollment-takeover',
      owner: 'amazingefren',
      scenario:
        'An attacker claims initial owner enrollment or adds a credential.',
      consequence: 'Attacker gains owner permissions.',
      status: 'open',
      inherent: {
        likelihood: 3,
        impact: 5,
        rationale:
          'Initial qualitative estimate for the intended platform; not measured incident frequency.',
      },
      residual: null,
      treatment: {
        strategy: 'reduce',
        action:
          'Use controlled one-time bootstrap; require existing owner authorization for later enrollment and revocation.',
        status: 'implemented',
        implementations: ['auth/composition/index.ts'],
        evidence: ['auth/tests/auth.test.ts', 'auth/tests/passkeys.test.ts'],
      },
      resolution: null,
      reviewedOn: '2026-09-10',
      reviewTrigger:
        'Before auth or data goes live; on design, provider, recovery, or incident changes.',
    },
    {
      id: 'auth.session-theft',
      owner: 'amazingefren',
      scenario: 'An attacker steals a session after successful authentication.',
      consequence: 'Passkey protection is bypassed through the session.',
      status: 'open',
      inherent: {
        likelihood: 3,
        impact: 5,
        rationale:
          'Initial qualitative estimate for the intended platform; not measured incident frequency.',
      },
      residual: null,
      treatment: {
        strategy: 'reduce',
        action:
          'Use secure session cookies, expiration, revocation, and fresh verification for sensitive actions.',
        status: 'implemented',
        implementations: ['auth/composition/index.ts'],
        evidence: ['auth/tests/auth.test.ts', 'auth/tests/passkeys.test.ts'],
      },
      resolution: null,
      reviewedOn: '2026-09-10',
      reviewTrigger:
        'Before auth or data goes live; on design, provider, recovery, or incident changes.',
    },
    {
      id: 'auth.relying-party-loss',
      owner: 'amazingefren',
      scenario: 'The relying-party domain is lost or changes during migration.',
      consequence:
        'Existing passkeys cannot authenticate at the replacement domain.',
      status: 'open',
      inherent: {
        likelihood: 2,
        impact: 5,
        rationale:
          'Initial qualitative estimate for the intended platform; not measured incident frequency.',
      },
      residual: null,
      treatment: {
        strategy: 'reduce',
        action:
          'Keep domain control independent of hosting; test migration retaining the relying-party ID.',
        status: 'proposed',
        implementations: [],
        evidence: [],
      },
      resolution: null,
      reviewedOn: '2026-09-04',
      reviewTrigger:
        'Before auth or data goes live; on design, provider, recovery, or incident changes.',
    },
    {
      id: 'auth.agent-authority',
      owner: 'amazingefren',
      scenario: 'An agent receives broader or longer-lived access than needed.',
      consequence: 'Private data exposure or unauthorized changes.',
      status: 'open',
      inherent: {
        likelihood: 3,
        impact: 5,
        rationale:
          'Initial qualitative estimate for the intended platform; not measured incident frequency.',
      },
      residual: null,
      treatment: {
        strategy: 'reduce',
        action:
          'Use scoped expiring delegated credentials, revocation, and explicit approval for sensitive operations; do not give agents owner passkeys.',
        status: 'proposed',
        implementations: [],
        evidence: [],
      },
      resolution: null,
      reviewedOn: '2026-09-04',
      reviewTrigger:
        'Before auth or data goes live; on design, provider, recovery, or incident changes.',
    },
  ],
  dependencies: [],
  schemaVersion: 5,
  contracts: ['auth/contracts/index.ts', 'auth/ports/index.ts'],
  operations: [
    {
      id: 'auth.registration-options',
      access: {
        kind: 'public',
      },
      bindings: [
        {
          id: 'auth.registration-options.http',
          scope: 'required',
          status: 'implemented',
          directory: 'auth/adapters/http',
          testsDirectory: 'auth/tests',
          implementation: 'auth/adapters/http/index.ts',
          tests: ['auth/tests/auth.test.ts'],
          surface: {
            kind: 'http',
            method: 'POST',
            path: '/api/auth/registration-options',
          },
        },
      ],
      status: 'implemented',
      input: 'auth/contracts/index.ts',
      output: 'auth/contracts/index.ts',
      errors: 'auth/contracts/index.ts',
      directory: 'auth/operations/passkeys',
      testsDirectory: 'auth/tests',
      implementation: 'auth/operations/passkeys/index.ts',
      verification: [
        {
          id: 'auth.registration-options.access',
          category: 'access',
          expectation:
            'Require the declared origin and ceremony authorization. Bootstrap works once; later enrollment requires fresh owner verification. Session identity comes from server storage.',
          tests: ['auth/tests/auth.test.ts'],
        },
        {
          id: 'auth.registration-options.behavior',
          category: 'behavior',
          expectation:
            'Verify passkey proofs, consume challenges once, expire or revoke sessions, and bound request storage.',
          tests: ['auth/tests/auth.test.ts', 'auth/tests/passkeys.test.ts'],
        },
      ],
    },
    {
      id: 'auth.registration-verify',
      access: {
        kind: 'public',
      },
      bindings: [
        {
          id: 'auth.registration-verify.http',
          scope: 'required',
          status: 'implemented',
          directory: 'auth/adapters/http',
          testsDirectory: 'auth/tests',
          implementation: 'auth/adapters/http/index.ts',
          tests: ['auth/tests/auth.test.ts'],
          surface: {
            kind: 'http',
            method: 'POST',
            path: '/api/auth/registration-verify',
          },
        },
      ],
      status: 'implemented',
      input: 'auth/contracts/index.ts',
      output: 'auth/contracts/index.ts',
      errors: 'auth/contracts/index.ts',
      directory: 'auth/operations/passkeys',
      testsDirectory: 'auth/tests',
      implementation: 'auth/operations/passkeys/index.ts',
      verification: [
        {
          id: 'auth.registration-verify.access',
          category: 'access',
          expectation:
            'Require the declared origin and ceremony authorization. Bootstrap works once; later enrollment requires fresh owner verification. Session identity comes from server storage.',
          tests: ['auth/tests/auth.test.ts'],
        },
        {
          id: 'auth.registration-verify.behavior',
          category: 'behavior',
          expectation:
            'Verify passkey proofs, consume challenges once, expire or revoke sessions, and bound request storage.',
          tests: ['auth/tests/auth.test.ts', 'auth/tests/passkeys.test.ts'],
        },
      ],
    },
    {
      id: 'auth.authentication-options',
      access: {
        kind: 'public',
      },
      bindings: [
        {
          id: 'auth.authentication-options.http',
          scope: 'required',
          status: 'implemented',
          directory: 'auth/adapters/http',
          testsDirectory: 'auth/tests',
          implementation: 'auth/adapters/http/index.ts',
          tests: ['auth/tests/auth.test.ts'],
          surface: {
            kind: 'http',
            method: 'POST',
            path: '/api/auth/authentication-options',
          },
        },
      ],
      status: 'implemented',
      input: 'auth/contracts/index.ts',
      output: 'auth/contracts/index.ts',
      errors: 'auth/contracts/index.ts',
      directory: 'auth/operations/passkeys',
      testsDirectory: 'auth/tests',
      implementation: 'auth/operations/passkeys/index.ts',
      verification: [
        {
          id: 'auth.authentication-options.access',
          category: 'access',
          expectation:
            'Require the declared origin and ceremony authorization. Bootstrap works once; later enrollment requires fresh owner verification. Session identity comes from server storage.',
          tests: ['auth/tests/auth.test.ts'],
        },
        {
          id: 'auth.authentication-options.behavior',
          category: 'behavior',
          expectation:
            'Verify passkey proofs, consume challenges once, expire or revoke sessions, and bound request storage.',
          tests: ['auth/tests/auth.test.ts', 'auth/tests/passkeys.test.ts'],
        },
      ],
    },
    {
      id: 'auth.authentication-verify',
      access: {
        kind: 'public',
      },
      bindings: [
        {
          id: 'auth.authentication-verify.http',
          scope: 'required',
          status: 'implemented',
          directory: 'auth/adapters/http',
          testsDirectory: 'auth/tests',
          implementation: 'auth/adapters/http/index.ts',
          tests: ['auth/tests/auth.test.ts'],
          surface: {
            kind: 'http',
            method: 'POST',
            path: '/api/auth/authentication-verify',
          },
        },
      ],
      status: 'implemented',
      input: 'auth/contracts/index.ts',
      output: 'auth/contracts/index.ts',
      errors: 'auth/contracts/index.ts',
      directory: 'auth/operations/passkeys',
      testsDirectory: 'auth/tests',
      implementation: 'auth/operations/passkeys/index.ts',
      verification: [
        {
          id: 'auth.authentication-verify.access',
          category: 'access',
          expectation:
            'Require the declared origin and ceremony authorization. Bootstrap works once; later enrollment requires fresh owner verification. Session identity comes from server storage.',
          tests: ['auth/tests/auth.test.ts'],
        },
        {
          id: 'auth.authentication-verify.behavior',
          category: 'behavior',
          expectation:
            'Verify passkey proofs, consume challenges once, expire or revoke sessions, and bound request storage.',
          tests: ['auth/tests/auth.test.ts', 'auth/tests/passkeys.test.ts'],
        },
      ],
    },
    {
      id: 'auth.logout',
      access: {
        kind: 'public',
      },
      bindings: [
        {
          id: 'auth.logout.http',
          scope: 'required',
          status: 'implemented',
          directory: 'auth/adapters/http',
          testsDirectory: 'auth/tests',
          implementation: 'auth/adapters/http/index.ts',
          tests: ['auth/tests/auth.test.ts'],
          surface: {
            kind: 'http',
            method: 'POST',
            path: '/api/auth/logout',
          },
        },
      ],
      status: 'implemented',
      input: 'auth/contracts/index.ts',
      output: 'auth/contracts/index.ts',
      errors: 'auth/contracts/index.ts',
      directory: 'auth/operations/passkeys',
      testsDirectory: 'auth/tests',
      implementation: 'auth/operations/passkeys/index.ts',
      verification: [
        {
          id: 'auth.logout.access',
          category: 'access',
          expectation:
            'Require the declared origin and ceremony authorization. Bootstrap works once; later enrollment requires fresh owner verification. Session identity comes from server storage.',
          tests: ['auth/tests/auth.test.ts'],
        },
        {
          id: 'auth.logout.behavior',
          category: 'behavior',
          expectation:
            'Verify passkey proofs, consume challenges once, expire or revoke sessions, and bound request storage.',
          tests: ['auth/tests/auth.test.ts', 'auth/tests/passkeys.test.ts'],
        },
      ],
    },
  ],
  events: [],
  capabilityPaths: {
    identity: 'auth/domain/identity',
    authorization: 'auth/domain/authorization',
    sessions: 'auth/domain/sessions',
  },
  structure: {
    domain: 'auth/domain',
    operations: 'auth/operations',
    ports: 'auth/ports',
    adapters: 'auth/adapters',
    tests: 'auth/tests',
    composition: 'auth/composition',
    contracts: 'auth/contracts',
    migrations: 'auth/migrations',
    ui: 'auth/ui',
  },
  entrypoints: [
    'auth/composition/index.ts',
    'auth/adapters/d1/session.ts',
    'auth/ui/Access.tsx',
  ],
  pages: [
    {
      path: '/auth/me',
      entrypoint: 'web/composition/auth.tsx',
      access: {
        kind: 'public',
      },
      status: 'implemented',
    },
  ],
} as const satisfies SystemManifest;
