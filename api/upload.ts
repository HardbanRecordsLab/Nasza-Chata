import type { Request, Response } from 'express';

export default async function handler(req: Request | any, res: Response | any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { dataUrl, filename } = body;
    if (!dataUrl) {
      return res.status(400).json({ error: 'Brak danych pliku.' });
    }
    return res.status(200).json({ url: dataUrl, filename: filename || 'proof.jpg' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Błąd uploadu', details: err.message });
  }
}
