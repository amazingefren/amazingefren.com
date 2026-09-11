'use client';
import { useRef, useState } from 'react';
import {
  startAuthentication,
  startRegistration,
} from '@simplewebauthn/browser';
import { BrandMark } from '../../design/ui/BrandMark.tsx';
import { ThemeControl } from '../../design/ui/ThemeControl.tsx';

type AuthenticationOptions = Parameters<
  typeof startAuthentication
>[0]['optionsJSON'];
type RegistrationOptions = Parameters<
  typeof startRegistration
>[0]['optionsJSON'];

async function request<T>(operation: string, body: object = {}): Promise<T> {
  const response = await fetch(`/api/auth/${operation}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    if (response.status === 429)
      throw new Error('Too many attempts. Wait a minute, then try again.');
    if (response.status === 503)
      throw new Error('Owner access is unavailable. Try again later.');
    throw new Error('Access could not be verified. Try again.');
  }
  return response.json() as Promise<T>;
}
async function authenticate() {
  const optionsJSON = await request<AuthenticationOptions>(
    'authentication-options',
  );
  const response = await startAuthentication({ optionsJSON });
  await request('authentication-verify', { response });
}

export function Access({ initialSignedIn }: { initialSignedIn: boolean }) {
  const [signedIn, setSignedIn] = useState(initialSignedIn);
  const [secret, setSecret] = useState('');
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  async function perform(action: 'signin' | 'setup' | 'add' | 'logout') {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setError('');
    setNotice(
      action === 'setup'
        ? 'Choose 1Password to save your passkey.'
        : action === 'add'
          ? 'Verify your existing passkey, then save another.'
          : action === 'logout'
            ? 'Signing out…'
            : 'Complete the passkey prompt to continue.',
    );
    try {
      if (action === 'logout') {
        await request('logout');
        setSignedIn(false);
        setNotice('');
      } else {
        if (action === 'signin' || action === 'add') await authenticate();
        if (action === 'setup' || action === 'add') {
          const optionsJSON = await request<RegistrationOptions>(
            'registration-options',
            action === 'setup' ? { bootstrapToken: secret } : {},
          );
          const response = await startRegistration({ optionsJSON });
          await request('registration-verify', { response });
        }
        setSignedIn(true);
        setSecret('');
        setNotice(
          action === 'add'
            ? 'Passkey added.'
            : action === 'setup'
              ? 'Your first passkey is ready.'
              : '',
        );
      }
    } catch (cause) {
      setNotice('');
      setError(
        cause instanceof Error && cause.name === 'NotAllowedError'
          ? 'The passkey request was canceled. Try again.'
          : cause instanceof Error && cause.message.startsWith('WebAuthn')
            ? 'Passkeys are unavailable in this browser.'
            : cause instanceof Error
              ? cause.message
              : 'Access could not be verified. Try again.',
      );
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }
  return (
    <div className="ae-auth">
      <header>
        <div className="identity">
          <BrandMark variant="theme" />
          <span>amazingefren</span>
        </div>
        <ThemeControl />
      </header>
      <main>
        <section
          className="access-panel"
          aria-labelledby="access-title"
          aria-busy={pending}
        >
          <p className="eyebrow">Personal workspace</p>
          <h1 id="access-title">
            {signedIn ? 'You’re signed in.' : 'Owner access'}
          </h1>
          {signedIn ? (
            <>
              <p>amazingefren</p>
              <a className="primary" href="/workspace/dashboard">
                Open workspace <span aria-hidden="true">↗</span>
              </a>
              <div className="secondary-actions">
                <button
                  className="neutral"
                  disabled={pending}
                  onClick={() => perform('add')}
                >
                  Add passkey
                </button>
                <button
                  className="quiet"
                  disabled={pending}
                  onClick={() => perform('logout')}
                >
                  Sign out
                </button>
              </div>
            </>
          ) : (
            <>
              <p>Sign in with your passkey.</p>
              <button
                className="primary"
                disabled={pending}
                onClick={() => perform('signin')}
              >
                {pending ? 'Waiting for passkey…' : 'Use passkey'}
              </button>
              <details>
                <summary>First-time setup</summary>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void perform('setup');
                  }}
                >
                  <p>
                    Enter your one-time setup key, then save a passkey in
                    1Password.
                  </p>
                  <label htmlFor="setup-key">Setup key</label>
                  <input
                    id="setup-key"
                    type="password"
                    autoComplete="off"
                    required
                    minLength={43}
                    maxLength={256}
                    disabled={pending}
                    value={secret}
                    onChange={(event) => setSecret(event.target.value)}
                  />
                  <button className="neutral" disabled={pending} type="submit">
                    Create passkey
                  </button>
                </form>
              </details>
            </>
          )}
          {notice && (
            <p className="status" role="status">
              {notice}
            </p>
          )}
          {error && (
            <p className="status error" role="alert">
              {error}
            </p>
          )}
          <noscript>
            <p>Enable JavaScript to use a passkey.</p>
          </noscript>
        </section>
      </main>
      <footer>
        <a href="/">Back home</a>
      </footer>
    </div>
  );
}
