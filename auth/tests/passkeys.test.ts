import assert from 'node:assert/strict';
import test from 'node:test';
import { createPasskeys } from '../adapters/webauthn/index.ts';
import { authenticator } from './support.ts';
const origin = 'https://example.com';
test('real WebAuthn registrations require RP, origin, UV, challenge, and same-origin context', async () => {
  const keys = createPasskeys(origin);
  const device = authenticator();
  const options = await keys.registrationOptions([]);
  assert.equal(
    (options as { authenticatorSelection: { residentKey: string } })
      .authenticatorSelection.residentKey,
    'required',
  );
  assert.equal(
    'authenticatorAttachment' in
      (options as { authenticatorSelection: object }).authenticatorSelection,
    false,
  );
  const valid = await keys.verifyRegistration(
    device.registration(options.challenge),
    options.challenge,
  );
  assert.equal(valid?.id, device.credential.id);
  for (const invalid of [
    { origin: 'https://evil.example' },
    { rp: 'evil.example' },
    { uv: false },
    { crossOrigin: true },
    { topOrigin: origin },
  ]) {
    assert.equal(
      await keys.verifyRegistration(
        device.registration(options.challenge, invalid),
        options.challenge,
      ),
      null,
      JSON.stringify(invalid),
    );
  }
  assert.equal(
    await keys.verifyRegistration(
      device.registration('wrong-challenge'),
      options.challenge,
    ),
    null,
  );
});
test('real signed assertions require correct signature, RP, origin, UV, challenge, owner, and context', async () => {
  const keys = createPasskeys(origin);
  const device = authenticator();
  const options = await keys.authenticationOptions();
  assert.equal(
    await keys.verifyAuthentication(
      device.authentication(options.challenge),
      options.challenge,
      device.credential,
    ),
    1,
  );
  for (const invalid of [
    { origin: 'https://evil.example' },
    { rp: 'evil.example' },
    { uv: false },
    { crossOrigin: true },
    { topOrigin: origin },
    { userHandle: 'c29tZW9uZS1lbHNl' },
    { corrupt: true },
  ]) {
    assert.equal(
      await keys.verifyAuthentication(
        device.authentication(options.challenge, invalid),
        options.challenge,
        device.credential,
      ),
      null,
      JSON.stringify(invalid),
    );
  }
  assert.equal(
    await keys.verifyAuthentication(
      device.authentication('wrong-challenge'),
      options.challenge,
      device.credential,
    ),
    null,
  );
  assert.equal(
    await keys.verifyAuthentication(
      device.authentication(options.challenge, { counter: 1 }),
      options.challenge,
      { ...device.credential, counter: 1 },
    ),
    null,
  );
});
