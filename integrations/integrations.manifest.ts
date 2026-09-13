import type { SystemManifest } from '../manifests/schema/system.schema.ts';

export default {
  kind: 'system',
  id: 'integrations',
  name: 'AE Integrations',
  purpose: 'Adapt external services to versioned AE contracts.',
  owner: 'amazingefren',
  status: 'declared',
  visibility: 'public',
  decisions: [
    'Typed ports isolate external services.',
    'Serve the same approved static bundle on a separate Tor-capable host.',
    'Keep mirror assets local; reading must need no clearnet services.',
    'Require portable IPFS releases; design pinning, updates, and deletion limits.',
    'Apply privacy/policy.json; never expose private material through analytics.',
  ],
  capabilities: [
    'adapters',
    'webhooks',
    'onion-mirror',
    'ipfs-snapshots',
    'webmentions',
  ],
  governance: {
    permissionsDefined: [],
    dataClassification: 'mixed',
  },
  risks: [],
  dependencies: ['auth', 'publishing', 'privacy'],
  schemaVersion: 6,
  operations: [],
  capabilityPaths: {
    adapters: 'integrations/adapters',
    webhooks: 'integrations/adapters/webhooks',
    'onion-mirror': 'integrations/adapters/onion',
    'ipfs-snapshots': 'integrations/adapters/ipfs',
    webmentions: 'integrations/adapters/webmentions',
  },
  structure: {
    domain: 'integrations/domain',
    operations: 'integrations/operations',
    ports: 'integrations/ports',
    adapters: 'integrations/adapters',
    tests: 'integrations/tests',
    composition: 'integrations/composition',
  },
} as const satisfies SystemManifest;
