// Cloudflare Pages Function: GET /api/env/soil?lat=&lon= (used by the Ecology Profile tool).
// Implementation and safety notes: env/server/env-api.js
import { soil } from '../../../env/server/env-api.js';
export const onRequestGet = soil;
