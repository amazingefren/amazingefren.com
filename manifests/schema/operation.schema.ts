import type { AccessRule } from './access.schema.ts';
import type { DeliveryBinding } from './binding.schema.ts';

export interface Operation {
  id: string;
  access: AccessRule;
  dataScope?: 'owner' | 'published' | 'synthetic';
  bindings: readonly DeliveryBinding[];
  status: 'declared' | 'implemented';
  input: string;
  output: string;
  errors: string;
  directory: string;
  testsDirectory: string;
  implementation: string | null;
  verification: readonly {
    id: string;
    category: 'contract' | 'access' | 'behavior' | 'failure' | 'integration';
    expectation: string;
    tests: readonly string[];
  }[];
}
