import type { Request, Response } from 'express';
import { handleGetState, handleSyncState } from '../server/handlers/state';

export default async function handler(req: Request | any, res: Response | any) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const action = url.searchParams.get('action') || req.headers['x-action'];

  try {
    if (action === 'sync' || req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch { body = {}; }
      }
      if (!body || typeof body !== 'object') body = {};
      const result = await handleSyncState(body);
      return res.status(200).json(result);
    }
    const state = await handleGetState();
    return res.status(200).json(state || {});
  } catch (err: any) {
    console.error('[api/state] error:', err);
    return res.status(200).json({
      error: 'State degraded — using defaults',
      details: err?.message || String(err),
    });
  }
}
