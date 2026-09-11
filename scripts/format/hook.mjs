import { fileURLToPath } from 'node:url';

try {
  const { default: lintStaged } = await import('lint-staged');
  const formatter = fileURLToPath(new URL('./index.mjs', import.meta.url));
  const ok = await lintStaged({
    config: {
      '*': `${JSON.stringify(process.execPath)} ${JSON.stringify(formatter)} --files`,
    },
    concurrent: false,
  });
  if (!ok) console.warn('Formatting skipped after an error; commit continues.');
} catch (error) {
  console.warn(`Formatting unavailable; commit continues: ${error.message}`);
}
