import { readFile } from 'node:fs/promises';
import manifest from './deployment.manifest.ts';

type Configuration = {
  name?: string;
  account_id?: string;
  workers_dev?: boolean;
  preview_urls?: boolean;
  routes?: unknown[];
  vars?: Record<string, string>;
  d1_databases?: {
    binding: string;
    database_name?: string;
    database_id?: string;
    migrations_dir?: string;
  }[];
  r2_buckets?: { binding: string; bucket_name?: string }[];
  services?: { binding: string; service: string }[];
};
const failures: string[] = [];
async function config(path: string): Promise<Configuration> {
  try {
    return JSON.parse(
      await readFile(new URL(`../${path}`, import.meta.url), 'utf8'),
    ) as Configuration;
  } catch {
    failures.push(`${path}: configuration unavailable`);
    return {};
  }
}
const web = await config(manifest.contracts.web.config);
const owner = await config(manifest.contracts.owner.config);
for (const [name, value] of [
  ['web', web],
  ['owner', owner],
] as const) {
  if (value.workers_dev !== false || value.preview_urls !== false)
    failures.push(`${name}: disable workers.dev and preview URLs`);
}
for (const [target, value] of [
  [manifest.contracts.pipeline.web, web],
  [manifest.contracts.pipeline.owner, owner],
] as const) {
  if (
    value.name !== target.name ||
    value.account_id !== manifest.contracts.accountId
  )
    failures.push(
      `${target.name}: configure the declared Worker name and account`,
    );
}
if (owner.routes?.length) failures.push('owner: remove public routes');
if (!web.routes?.length)
  failures.push('web: configure the permanent public domain');
if (web.vars?.AUTH_ORIGIN !== manifest.contracts.origin)
  failures.push('web: configure the permanent HTTPS AUTH_ORIGIN');
function database(value: Configuration, binding: string, name: string) {
  const entry = value.d1_databases?.find((item) => item.binding === binding);
  if (
    !entry?.database_id ||
    !/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(
      entry.database_id,
    ) ||
    /^0+-0+-0+-0+-0+$/.test(entry.database_id)
  )
    failures.push(
      `${name}: configure ${binding} with a provisioned D1 database`,
    );
  return entry;
}
const webAuth = database(web, 'AUTH_DB', 'web');
const ownerAuth = database(owner, 'AUTH_DB', 'owner');
const content = database(owner, 'WORKSPACE_OWNER_DB', 'owner');
if (webAuth?.database_id !== ownerAuth?.database_id)
  failures.push('auth: both Workers must use the same AUTH_DB');
if (content?.database_id && content.database_id === webAuth?.database_id)
  failures.push('storage: separate auth and content databases');
if (webAuth?.migrations_dir !== '../auth/migrations')
  failures.push('web: set AUTH_DB migrations_dir to ../auth/migrations');
if (ownerAuth?.migrations_dir !== '../auth/migrations')
  failures.push('owner: set AUTH_DB migrations_dir to ../auth/migrations');
for (const [entry, target] of [
  [ownerAuth, manifest.contracts.pipeline.databases[0]],
  [content, manifest.contracts.pipeline.databases[1]],
] as const) {
  if (
    entry?.database_name !== target.name ||
    target.config !== manifest.contracts.owner.config
  )
    failures.push(`storage: migration target does not match ${target.name}`);
}
if (content?.migrations_dir !== 'migrations')
  failures.push('owner: set WORKSPACE_OWNER_DB migrations_dir to migrations');
if (
  !owner.r2_buckets?.some(
    (item) => item.binding === 'WRITING_ASSETS' && item.bucket_name,
  )
)
  failures.push('owner: configure the private WRITING_ASSETS bucket');
if (
  !web.services?.some(
    (item) =>
      item.binding === manifest.contracts.web.service &&
      item.service === manifest.contracts.web.serviceName,
  )
)
  failures.push('web: configure WORKSPACE_OWNER_SERVICE');
for (const [name, value] of [
  ['web', web],
  ['owner', owner],
] as const)
  if (value.vars?.AUTH_BOOTSTRAP_TOKEN)
    failures.push(
      `${name}: bootstrap token must be a secret, not a plain variable`,
    );
if (failures.length) {
  process.stderr.write(`${failures.join('\n')}\n`);
  process.exitCode = 1;
} else
  process.stdout.write(
    'Local configuration is ready. Verify remote bindings, secret, migrations, TLS, passkeys, and recovery before release.\n',
  );
