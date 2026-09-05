import type { SystemManifest } from '../manifests/schema/system.schema.ts';

export default {
  kind: "system",
  "id": "auth",
  "name": "AE Auth",
  "purpose": "Identity, sessions, roles, service credentials, and access evaluation.",
  "owner": "amazingefren",
  "status": "declared",
  "scope": "required",
  "visibility": "public",
  "context": {
    "decisions": [
      "Shared access evaluation for human and machine identities.",
      "Reusable public ae-auth-engine is proposed, not created."
    ],
    "openQuestions": [
      "Identity provider, permission vocabulary, and engine boundary."
    ]
  },
  "capabilities": [
    "identity",
    "authorization",
    "sessions"
  ],
  "governance": {
    "permissionsDefined": [
      "studio.read",
      "studio.write",
      "publishing.publish"
    ],
    "dataClassification": "private"
  },
  "risks": [
    {
      "id": "auth.password-guessing",
      "owner": "amazingefren",
      "scenario": "An attacker guesses a password or uses leaked credentials.",
      "consequence": "Unauthorized access.",
      "status": "open",
      "inherent": {
        "likelihood": 4,
        "impact": 5,
        "rationale": "Initial qualitative estimate for the intended platform; not measured incident frequency."
      },
      "residual": null,
      "treatment": {
        "strategy": "avoid",
        "action": "Use passkeys only; omit password login and password recovery. Verify no password fallback exists.",
        "status": "proposed",
        "implementations": [],
        "evidence": []
      },
      "resolution": null,
      "reviewedOn": "2026-09-04",
      "reviewTrigger": "Before auth or data goes live; on design, provider, recovery, or incident changes."
    },
    {
      "id": "auth.identity-provider-outage",
      "owner": "amazingefren",
      "scenario": "An external SSO provider is unavailable or suspends access.",
      "consequence": "Owner cannot sign in.",
      "status": "open",
      "inherent": {
        "likelihood": 3,
        "impact": 4,
        "rationale": "Initial qualitative estimate for the intended platform; not measured incident frequency."
      },
      "residual": null,
      "treatment": {
        "strategy": "avoid",
        "action": "Evaluate local WebAuthn verification without external SSO. Track hosting and authenticator dependencies separately.",
        "status": "proposed",
        "implementations": [],
        "evidence": []
      },
      "resolution": null,
      "reviewedOn": "2026-09-04",
      "reviewTrigger": "Before auth or data goes live; on design, provider, recovery, or incident changes."
    },
    {
      "id": "auth.credential-loss",
      "owner": "amazingefren",
      "scenario": "All usable passkeys are lost or their sync provider becomes unavailable.",
      "consequence": "Permanent owner lockout.",
      "status": "open",
      "inherent": {
        "likelihood": 3,
        "impact": 5,
        "rationale": "Initial qualitative estimate for the intended platform; not measured incident frequency."
      },
      "residual": null,
      "treatment": {
        "strategy": "reduce",
        "action": "Enroll independent backup hardware keys; define and drill recovery without an unprotected bypass.",
        "status": "proposed",
        "implementations": [],
        "evidence": []
      },
      "resolution": null,
      "reviewedOn": "2026-09-04",
      "reviewTrigger": "Before auth or data goes live; on design, provider, recovery, or incident changes."
    },
    {
      "id": "auth.enrollment-takeover",
      "owner": "amazingefren",
      "scenario": "An attacker claims initial owner enrollment or adds a credential.",
      "consequence": "Attacker gains owner permissions.",
      "status": "open",
      "inherent": {
        "likelihood": 3,
        "impact": 5,
        "rationale": "Initial qualitative estimate for the intended platform; not measured incident frequency."
      },
      "residual": null,
      "treatment": {
        "strategy": "reduce",
        "action": "Use controlled one-time bootstrap; require existing owner authorization for later enrollment and revocation.",
        "status": "proposed",
        "implementations": [],
        "evidence": []
      },
      "resolution": null,
      "reviewedOn": "2026-09-04",
      "reviewTrigger": "Before auth or data goes live; on design, provider, recovery, or incident changes."
    },
    {
      "id": "auth.session-theft",
      "owner": "amazingefren",
      "scenario": "An attacker steals a session after successful authentication.",
      "consequence": "Passkey protection is bypassed through the session.",
      "status": "open",
      "inherent": {
        "likelihood": 3,
        "impact": 5,
        "rationale": "Initial qualitative estimate for the intended platform; not measured incident frequency."
      },
      "residual": null,
      "treatment": {
        "strategy": "reduce",
        "action": "Use secure session cookies, expiration, revocation, and fresh verification for sensitive actions.",
        "status": "proposed",
        "implementations": [],
        "evidence": []
      },
      "resolution": null,
      "reviewedOn": "2026-09-04",
      "reviewTrigger": "Before auth or data goes live; on design, provider, recovery, or incident changes."
    },
    {
      "id": "auth.relying-party-loss",
      "owner": "amazingefren",
      "scenario": "The relying-party domain is lost or changes during migration.",
      "consequence": "Existing passkeys cannot authenticate at the replacement domain.",
      "status": "open",
      "inherent": {
        "likelihood": 2,
        "impact": 5,
        "rationale": "Initial qualitative estimate for the intended platform; not measured incident frequency."
      },
      "residual": null,
      "treatment": {
        "strategy": "reduce",
        "action": "Keep domain control independent of hosting; test migration retaining the relying-party ID.",
        "status": "proposed",
        "implementations": [],
        "evidence": []
      },
      "resolution": null,
      "reviewedOn": "2026-09-04",
      "reviewTrigger": "Before auth or data goes live; on design, provider, recovery, or incident changes."
    },
    {
      "id": "auth.agent-authority",
      "owner": "amazingefren",
      "scenario": "An agent receives broader or longer-lived access than needed.",
      "consequence": "Private data exposure or unauthorized changes.",
      "status": "open",
      "inherent": {
        "likelihood": 3,
        "impact": 5,
        "rationale": "Initial qualitative estimate for the intended platform; not measured incident frequency."
      },
      "residual": null,
      "treatment": {
        "strategy": "reduce",
        "action": "Use scoped expiring delegated credentials, revocation, and explicit approval for sensitive operations; do not give agents owner passkeys.",
        "status": "proposed",
        "implementations": [],
        "evidence": []
      },
      "resolution": null,
      "reviewedOn": "2026-09-04",
      "reviewTrigger": "Before auth or data goes live; on design, provider, recovery, or incident changes."
    }
  ],
  "dependencies": [],
  "schemaVersion": 4,
  "contracts": [],
  "operations": [],
  "events": [],
  "capabilityPaths": {
    "identity": "auth/domain/identity",
    "authorization": "auth/domain/authorization",
    "sessions": "auth/domain/sessions"
  },
  "structure": {
    "domain": "auth/domain",
    "operations": "auth/operations",
    "ports": "auth/ports",
    "adapters": "auth/adapters",
    "tests": "auth/tests",
    "composition": "auth/composition"
  },
  "entrypoints": []
} as const satisfies SystemManifest;
