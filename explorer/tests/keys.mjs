// Test signing keys standing in for a Cloudflare Access team: real RS256 JWTs, verified by the real code path.
import crypto from 'node:crypto';
export const AUD = 'test-audience-tag';
export async function makeKeys() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'test-key', alg: 'RS256', use: 'sig' };
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  const sign = (email, over = {}) => {
    const head = b64({ alg: 'RS256', kid: 'test-key', typ: 'JWT' });
    const body = b64({ aud: [AUD], email, exp: Math.floor(Date.now() / 1000) + 600, iat: Math.floor(Date.now() / 1000), ...over });
    const s = crypto.sign('RSA-SHA256', Buffer.from(`${head}.${body}`), privateKey).toString('base64url');
    return `${head}.${body}.${s}`;
  };
  const other = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
  const forge = email => {       // signed with a key the server does not trust
    const head = b64({ alg: 'RS256', kid: 'test-key', typ: 'JWT' }); const body = b64({ aud: [AUD], email, exp: Math.floor(Date.now() / 1000) + 600 });
    return `${head}.${body}.${crypto.sign('RSA-SHA256', Buffer.from(`${head}.${body}`), other).toString('base64url')}`;
  };
  return { jwks: JSON.stringify({ keys: [jwk] }), sign, forge };
}
