import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { isoCBOR } from '@simplewebauthn/server/helpers';
import type { AuthDatabase, AuthStatement, AuthValue } from '../ports/index.ts';
import { encode } from '../adapters/crypto/hash.ts';
export function testDatabase(): AuthDatabase & { sql: DatabaseSync } {
  const sql = new DatabaseSync(':memory:');
  sql.exec(
    readFileSync(
      new URL('../migrations/0001_auth.sql', import.meta.url),
      'utf8',
    ),
  );
  const runs = new WeakMap<
    AuthStatement,
    () => { meta: { changes: number } }
  >();
  function prepare(query: string, values: AuthValue[] = []): AuthStatement {
    const run = () => ({
      meta: { changes: Number(sql.prepare(query).run(...values).changes) },
    });
    const statement: AuthStatement = {
      bind: (...bound) => prepare(query, bound),
      async first<T>() {
        return (sql.prepare(query).get(...values) as T | undefined) ?? null;
      },
      async all<T>() {
        return { results: sql.prepare(query).all(...values) as T[] };
      },
      async run() {
        return run();
      },
    };
    runs.set(statement, run);
    return statement;
  }
  return {
    sql,
    prepare,
    async batch(statements) {
      sql.exec('BEGIN');
      try {
        const results = [];
        for (const statement of statements)
          results.push(runs.get(statement)!());
        sql.exec('COMMIT');
        return results;
      } catch (error) {
        sql.exec('ROLLBACK');
        throw error;
      }
    },
  };
}
function sha(value: Uint8Array | string): Buffer {
  return createHash('sha256').update(value).digest();
}
export function authenticator() {
  const key = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const jwk = key.publicKey.export({ format: 'jwk' });
  const credentialId = sha(Buffer.from(jwk.x!, 'base64url'));
  const publicKey = isoCBOR.encode(
    new Map<number, number | Uint8Array>([
      [1, 2],
      [3, -7],
      [-1, 1],
      [-2, Buffer.from(jwk.x!, 'base64url')],
      [-3, Buffer.from(jwk.y!, 'base64url')],
    ]),
  );
  const credential = {
    id: encode(credentialId),
    publicKey: encode(publicKey),
    counter: 0,
    transports: ['internal'],
  };
  function client(
    type: string,
    challenge: string,
    options: { origin?: string; crossOrigin?: boolean; topOrigin?: string },
  ) {
    return Buffer.from(
      JSON.stringify({
        type,
        challenge,
        origin: options.origin ?? 'https://example.com',
        crossOrigin: options.crossOrigin ?? false,
        ...(options.topOrigin ? { topOrigin: options.topOrigin } : {}),
      }),
    );
  }
  return {
    credential,
    registration(
      challenge: string,
      options: {
        origin?: string;
        rp?: string;
        uv?: boolean;
        crossOrigin?: boolean;
        topOrigin?: string;
      } = {},
    ) {
      const header = Buffer.alloc(37);
      sha(options.rp ?? 'example.com').copy(header);
      header[32] = options.uv === false ? 0x41 : 0x45;
      const length = Buffer.alloc(2);
      length.writeUInt16BE(credentialId.length);
      const authData = Buffer.concat([
        header,
        Buffer.alloc(16),
        length,
        credentialId,
        publicKey,
      ]);
      const attestationObject = isoCBOR.encode(
        new Map<string, string | Uint8Array | Map<string, string>>([
          ['fmt', 'none'],
          ['authData', authData],
          ['attStmt', new Map()],
        ]),
      );
      return {
        id: credential.id,
        rawId: credential.id,
        type: 'public-key' as const,
        clientExtensionResults: {},
        response: {
          clientDataJSON: encode(client('webauthn.create', challenge, options)),
          attestationObject: encode(attestationObject),
          transports: ['internal'],
        },
      };
    },
    authentication(
      challenge: string,
      options: {
        origin?: string;
        rp?: string;
        uv?: boolean;
        crossOrigin?: boolean;
        topOrigin?: string;
        userHandle?: string;
        counter?: number;
        corrupt?: boolean;
      } = {},
    ) {
      const authData = Buffer.alloc(37);
      sha(options.rp ?? 'example.com').copy(authData);
      authData[32] = options.uv === false ? 0x01 : 0x05;
      authData.writeUInt32BE(options.counter ?? 1, 33);
      const clientData = client('webauthn.get', challenge, options);
      const signature = sign(
        'sha256',
        Buffer.concat([authData, sha(clientData)]),
        key.privateKey,
      );
      if (options.corrupt) signature[signature.length - 1] ^= 1;
      return {
        id: credential.id,
        rawId: credential.id,
        type: 'public-key' as const,
        clientExtensionResults: {},
        response: {
          clientDataJSON: encode(clientData),
          authenticatorData: encode(authData),
          signature: encode(signature),
          userHandle: options.userHandle ?? encode(Buffer.from('amazingefren')),
        },
      };
    },
  };
}
