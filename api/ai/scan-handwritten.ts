import type { Request, Response } from 'express';
import { handleScanHandwritten } from '../../server/handlers/scan-handwritten';

export default async function handler(req: Request | any, res: Response | any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const result = await handleScanHandwritten(body);
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(500).json({ error: 'Nie udało się przeanalizować zdjęcia.', details: err.message });
  }
}
