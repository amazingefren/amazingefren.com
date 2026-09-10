import type { SystemManifest } from '../../manifests/schema/system.schema.ts';

export interface DesignPattern {
  id: `design.${string}`;
  status: 'approved' | 'proposed' | 'legacy';
  purpose: string;
  implementation: string | null;
  rules: readonly string[];
}

export interface DesignManifest extends SystemManifest {
  languageVersion: number;
  copy: { rules: readonly string[]; forbiddenUiPhrases: readonly string[] };
  interaction: { rules: readonly string[]; forbiddenHoverTokens: readonly string[]; contrastPairs: readonly { foreground: string; background: string; minimum: number }[] };
  foundations: { source: string; stylesheet: string; rules: readonly string[] };
  brand: { contract: string; component: string; rules: readonly string[] };
  behaviors: readonly DesignPattern[];
  components: readonly DesignPattern[];
  patterns: readonly DesignPattern[];
  adoption: {
    consumers: readonly string[];
    stylesheet: string;
    componentEntrypoint: string;
    themeBootstrap: string;
    exceptions: readonly { path: string; reason: string }[];
    changeProcess: readonly string[];
  };
  verification: { command: string; tests: readonly string[]; limits: readonly string[] };
}
