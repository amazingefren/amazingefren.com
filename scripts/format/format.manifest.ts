export default {
  id: 'ae.format',
  purpose: 'Format authored code without changing agent instructions.',
  decisions: [
    'Sweep tracked source in the parent and initialized submodules.',
    'Commit hooks format staged source; failures warn and allow the commit.',
    'Preserve partial staging through lint-staged; do not stage unrelated edits.',
    'Install hooks explicitly because npm install scripts are disabled.',
    'Keep generated output, personal writing, and raw research data intact.',
  ],
  capabilities: {
    sweep: {
      operation: 'ae.format.sweep',
      bindings: ['mise run format', 'npm run format'],
    },
    check: {
      operation: 'ae.format.check',
      bindings: ['mise run format-check', 'npm run format:check'],
    },
    setup: {
      operation: 'ae.format.setup',
      bindings: ['mise run hooks', 'npm run hooks'],
    },
  },
  governance: { access: 'local-repository', enforcement: 'optional' },
  risks: [
    'Hooks may be absent or skipped; formatting is not a deployment gate.',
  ],
  prettier: {
    config: '.prettierrc.json',
    extensions: [
      '.ts',
      '.tsx',
      '.js',
      '.jsx',
      '.mjs',
      '.cjs',
      '.css',
      '.html',
      '.json',
      '.jsonc',
    ],
  },
  python: {
    extension: '.py',
    command: 'ruff',
    arguments: ['format', '--isolated'],
  },
  excluded: [
    '(^|/)(node_modules|dist|\\.context)/',
    '(^|/)(package-lock\\.json|worker-configuration\\.d\\.ts)$',
    '\\.generated\\.json$',
    '^design/foundations/tokens\\.css$',
    '^ae-workbench/dashboard-fresh/design-components\\.mjs$',
    '^ae-workbench/(auth-launch|dashboard-fresh|galaxy-webgl|observation-window|public-transitions|watching-sky)/build/',
    '^ae-workbench/(?!.*(?:^|/)(?:package|tsconfig)\\.json$).*\\.json$',
  ],
  paths: {
    sweep: 'scripts/format/index.mjs',
    hook: 'scripts/format/hook.mjs',
    setup: 'scripts/format/setup.mjs',
    preCommit: '.husky/pre-commit',
  },
} as const;
