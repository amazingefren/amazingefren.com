import type { GuestTelemetryPort } from './index.ts';

export function createSyntheticGuestTelemetry(): GuestTelemetryPort {
  return {
    async read({ window }) {
      return {
        kind: 'snapshot',
        snapshot: {
          source: 'synthetic-public-fixture',
          observedAt: new Date(window.toMs).toISOString(),
          metrics: {
            'page-views': {
              status: 'available',
              numerator: 24,
              denominator: null,
              source: 'synthetic-public-fixture',
            },
            'honeypot-triggers': {
              status: 'available',
              numerator: 2,
              denominator: null,
              source: 'synthetic-public-fixture',
            },
            'honeypot-trigger-rate': {
              status: 'available',
              numerator: 2,
              denominator: 24,
              source: 'synthetic-public-fixture',
            },
          },
        },
      };
    },
  };
}
