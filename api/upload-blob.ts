import type { Request, Response } from 'express';
import { put } from '@vercel/blob';

export default async function handler(req: Request | any, res: Response | any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { file, filename, folder } = body;

    if (!file || !filename) {
      return res.status(400).json({ error: 'Brak pliku lub nazwy' });
    }

    // file is base64 data URL or raw base64
    const base64Data = file.replace(/^data:image\/\w+;base64,/, '').replace(/^data:video\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const path = `${folder || 'uploads'}/${filename}`;

    const blob = await put(path, buffer, {
      access: 'public',
      contentType: body.mimeType || 'image/jpeg',
    });

    return res.status(200).json({ url: blob.url, pathname: blob.pathname });
  } catch (err: any) {
    console.error('Blob upload error:', err);
    return res.status(500).json({ error: 'Błąd uploadu', details: err.message });
  }
}
