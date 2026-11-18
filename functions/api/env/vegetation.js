// Cloudflare Pages Function: GET /api/env/vegetation?lat=&lon= (used by the Ecology Profile tool).
// Implementation and safety notes: env/server/env-api.js
import { vegetation } from '../../../env/server/env-api.js';
export const onRequestGet = vegetation;
