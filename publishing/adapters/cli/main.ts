import { boundedBytes } from '../../../web/adapters/http/body.ts';
import { maximumOfflineBundleBytes } from '../../domain/offline-bundle/index.ts';

const [command, flag, target, ...rest] = process.argv.slice(2);
const path =
  command === 'download'
    ? '/exports/publications.zip'
    : command === 'subscriptions'
      ? '/readings/subscriptions.opml'
      : null;
try {
  if (
    !path ||
    rest.length ||
    (flag !== undefined && (flag !== '--origin' || !target))
  )
    throw new Error(
      'Use download or subscriptions, with optional --origin URL.',
    );
  const origin = new URL(target ?? 'https://amazingefren.com');
  if (
    origin.username ||
    origin.password ||
    origin.pathname !== '/' ||
    origin.search ||
    origin.hash ||
    (origin.protocol !== 'https:' &&
      !(
        origin.protocol === 'http:' &&
        ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname)
      ))
  )
    throw new Error('Use an HTTPS origin or local development origin.');
  if (command === 'download' && process.stdout.isTTY)
    throw new Error('Redirect standard output to a ZIP file.');
  const response = await fetch(new URL(path, origin), {
    redirect: 'error',
    signal: AbortSignal.timeout(30_000),
  });
  const expected = command === 'download' ? 'application/zip' : 'text/x-opml';
  if (
    !response.ok ||
    response.headers.get('content-type')?.split(';')[0] !== expected
  ) {
    await response.body?.cancel();
    throw new Error(`Publication export is unavailable (${response.status}).`);
  }
  const result = await boundedBytes(response, maximumOfflineBundleBytes);
  if (!result.ok) throw new Error(result.error.message);
  process.stdout.write(result.value);
} catch (error) {
  process.stderr.write(
    `${error instanceof Error ? error.message : 'Publication export failed.'}\n`,
  );
  process.exitCode = 1;
}
