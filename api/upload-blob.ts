import type { Request, Response } from 'express';
import { put } from '@vercel/blob';

export default async function handler(req: Request | any, res: Response | any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const rawFile: string | undefined = body.file || body.dataUrl;
    const filename: string | undefined = body.filename;
    const folder: string = body.folder || 'uploads';
    const mimeType: string = body.mimeType || 'image/jpeg';

    if (!rawFile || !filename) {
      return res.status(400).json({ error: 'Brak pliku lub nazwy' });
    }

    if (rawFile.startsWith('https://')) {
      return res.status(200).json({ url: rawFile, pathname: rawFile });
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.warn('BLOB_READ_WRITE_TOKEN missing — returning dataUrl as-is');
      return res.status(200).json({ url: rawFile, pathname: rawFile, warning: 'BLOB token missing' });
    }

    const base64Data = rawFile.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const path = `${folder}/${filename}`;
    const blob = await put(path, buffer, { access: 'public', contentType: mimeType });
    return res.status(200).json({ url: blob.url, pathname: blob.pathname });
  } catch (err: any) {
    console.error('Blob upload error:', err);
    return res.status(500).json({ error: 'Błąd uploadu', details: err.message });
  }
}
