import type { Request, Response } from 'express';
import { handleGetState } from '../../server/handlers/notifications';

export default async function handler(req: Request | any, res: Response | any) {
  try {
    const state = await handleGetState();
    return res.status(200).json(state);
  } catch (err: any) {
    return res.status(500).json({ error: 'Błąd pobierania stanu bazy', details: err.message });
  }
}
