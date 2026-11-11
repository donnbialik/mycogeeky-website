// Cloudflare Pages Function: every request under /api/explorer/ is handled by the Explorer API.
// The implementation lives in explorer/server/ (see explorer/README.md for the security model).
export { onRequest } from '../../../explorer/server/api.js';
