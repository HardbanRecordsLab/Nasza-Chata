import type { Request, Response } from 'express';
import { handleSyncState } from '../../server/handlers/notifications';

export default async function handler(req: Request | any, res: Response | any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const incoming = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const result = await handleSyncState(incoming);
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(500).json({ error: 'Błąd synchronizacji', details: err.message });
  }
}
