import type { Request, Response } from 'express';
import { handleGetState, handleSyncState } from '../server/handlers/notifications';

export default async function handler(req: Request | any, res: Response | any) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const action = url.searchParams.get('action') || req.headers['x-action'];

  try {
    if (action === 'sync' || req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      return res.status(200).json(await handleSyncState(body));
    }
    return res.status(200).json(await handleGetState());
  } catch (err: any) {
    return res.status(500).json({ error: 'State error', details: err.message });
  }
}
