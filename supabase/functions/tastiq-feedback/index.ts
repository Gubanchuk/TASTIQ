import {createFeedbackEdgeHandler} from '../../../src/server/feedback-edge-handler.js';

// Deployment substitutes only a SHA-256 digest. The ingestion token stays in the TASTIQ server environment.
const tokenHash='__TASTIQ_FEEDBACK_TOKEN_HASH__';
let serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
try{serviceKey=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')??'{}').default??serviceKey;}catch{}
Deno.serve(createFeedbackEdgeHandler({tokenHash,projectUrl:Deno.env.get('SUPABASE_URL'),serviceKey}));
