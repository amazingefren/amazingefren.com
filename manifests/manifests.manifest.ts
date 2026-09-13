import type { SystemManifest } from '../manifests/schema/system.schema.ts';

export default {
  kind: 'system',
  id: 'manifests',
  name: 'AE Manifests',
  purpose: 'Public manifest schema and explicit system registry.',
  owner: 'amazingefren',
  status: 'declared',
  visibility: 'public',
  decisions: [
    'Colocated manifests own contracts and access; the registry provides discovery. The public checker validates declarations and references, not runtime enforcement.',
    'Optional decisions state current constraints that typed fields cannot express. Requests, approval history, and unresolved work belong in the private workbench.',
    'Declare keyboard profiles only for implemented shortcuts. AE Design owns shared keyboard safety rules.',
    'Private ae-system-engine owns generation and full validation; public checks work without it.',
    'An empty risk catalog does not mean the system is risk-free.',
  ],
  capabilities: [
    'system-description',
    'registry',
    'risk-catalog',
    'commit-records',
    'prototype-orchestration',
  ],
  governance: {
    permissionsDefined: [],
    dataClassification: 'public',
  },
  risks: [],
  schemaVersion: 6,
  contracts: [
    'manifests/schema/system.schema.ts',
    'manifests/schema/convention.schema.ts',
    'manifests/schema/risk.schema.ts',
    'manifests/schema/view.schema.ts',
    'manifests/schema/operation.schema.ts',
  ],
  operations: [],
  capabilityPaths: {
    'system-description': 'manifests/schema',
    registry: 'manifests',
    'risk-catalog': 'manifests/risks',
    'commit-records': 'manifests/commits',
    'prototype-orchestration': 'manifests/prototypes',
  },
  entrypoints: [
    'manifests/schema/system.schema.ts',
    'manifests/registry.ts',
    'scripts/check-manifests.mjs',
  ],
} as const satisfies SystemManifest;
