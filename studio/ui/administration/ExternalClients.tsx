'use client';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { BrandMark, ThemeControl } from '../../../design/ui/index.ts';
import type {
  ExternalClient,
  ExternalEnvelope,
} from '../../../contracts/writing/external.ts';

type IssuedClient = { client: ExternalClient; token: string };

async function clientRequest<T>(
  method: string,
  body?: object,
  id?: string,
): Promise<T> {
  const response = await fetch(
    `/api/v1/studio/clients${id ? `?id=${encodeURIComponent(id)}` : ''}`,
    {
      method,
      credentials: 'same-origin',
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    },
  );
  const result = (await response.json()) as ExternalEnvelope<T>;
  if (!result.ok) throw new Error(result.error.message);
  if (!response.ok) throw new Error('Client access could not be changed.');
  return result.value;
}

export function ExternalClients() {
  const [clients, setClients] = useState<ExternalClient[]>([]);
  const [name, setName] = useState('Emacs');
  const [days, setDays] = useState('7');
  const [token, setToken] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const locked = useRef(false);
  async function load() {
    const value = await clientRequest<{ clients: ExternalClient[] }>('GET');
    setClients(value.clients);
  }
  useEffect(() => {
    void load().catch((cause) =>
      setError(
        cause instanceof Error
          ? cause.message
          : 'Client access could not load.',
      ),
    );
  }, []);
  async function perform(action: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true;
    setPending(true);
    setError('');
    setNotice('');
    try {
      await action();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Client access could not be changed.',
      );
    } finally {
      locked.current = false;
      setPending(false);
    }
  }
  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void perform(async () => {
      const issued = await clientRequest<IssuedClient>('POST', {
        name,
        expiresAt: new Date(
          Date.now() + Number(days) * 86_400_000,
        ).toISOString(),
      });
      setToken(issued.token);
      setClients((current) => [...current, issued.client]);
      setNotice('Credential created. Store it in Emacs auth-source.');
    });
  }
  return (
    <main
      className="ae-workspace ws-main"
      style={{
        maxWidth: '760px',
        margin: 'auto',
        padding: 'var(--ae-space-32)',
      }}
    >
      <header className="studio-actions">
        <BrandMark variant="theme" />
        <ThemeControl />
      </header>
      <p>
        <a href="/workspace/connections">← Connections</a>
      </p>
      <h1>Emacs access</h1>
      <p>
        Credentials can read and save publication drafts. Publishing requires
        owner review.
      </p>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <form onSubmit={create} className="zen-panel-content">
        <label>
          Name
          <input
            value={name}
            required
            maxLength={80}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label>
          Expires in
          <select
            value={days}
            onChange={(event) => setDays(event.target.value)}
          >
            <option value="1">1 day</option>
            <option value="7">7 days</option>
            <option value="30">30 days</option>
          </select>
        </label>
        <button className="ws-primary" disabled={pending || !name.trim()}>
          Create credential
        </button>
      </form>
      {token && (
        <section className="zen-panel-content" aria-label="New credential">
          <label>
            Credential · shown once
            <input
              readOnly
              value={token}
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <div className="studio-actions">
            <button
              disabled={pending}
              onClick={() =>
                void perform(async () => {
                  await navigator.clipboard.writeText(token);
                  setNotice('Credential copied.');
                })
              }
            >
              Copy
            </button>
            <button onClick={() => setToken('')}>Hide credential</button>
          </div>
        </section>
      )}
      <section className="zen-panel-content">
        <h2>Active credentials</h2>
        {clients.length ? (
          clients.map((client) => (
            <div className="studio-actions" key={client.id}>
              <span>
                {client.name} · expires{' '}
                <time dateTime={client.expiresAt}>
                  {new Date(client.expiresAt).toLocaleDateString()}
                </time>
              </span>
              <button
                disabled={pending}
                onClick={() =>
                  void perform(async () => {
                    await clientRequest('DELETE', undefined, client.id);
                    setClients((current) =>
                      current.filter((item) => item.id !== client.id),
                    );
                    setNotice('Credential revoked.');
                  })
                }
              >
                Revoke
              </button>
            </div>
          ))
        ) : (
          <p>No active credentials.</p>
        )}
        <button disabled={pending} onClick={() => void perform(load)}>
          Refresh
        </button>
      </section>
      <p>
        <a href="/auth/me">Verify owner access</a>
      </p>
    </main>
  );
}
