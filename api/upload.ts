import type { Request, Response } from 'express';
import { put } from '@vercel/blob';

export default async function handler(req: Request | any, res: Response | any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    // Support both legacy {dataUrl, filename} and new {file, filename, folder, mimeType}
    const rawFile: string | undefined = body.file || body.dataUrl;
    const filename: string | undefined = body.filename;
    const folder: string = body.folder || 'uploads';
    const mimeType: string = body.mimeType || 'image/jpeg';

    if (!rawFile) {
      return res.status(400).json({ error: 'Brak danych pliku.' });
    }

    // If file is already a Blob URL (https://...vercel-storage...), just echo it
    if (rawFile.startsWith('https://')) {
      return res.status(200).json({ url: rawFile, pathname: rawFile });
    }

    // If BLOB_READ_WRITE_TOKEN is not set, fall back to echoing dataUrl (dev/preview)
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.warn('BLOB_READ_WRITE_TOKEN missing — returning dataUrl as-is');
      return res.status(200).json({ url: rawFile, filename: filename || 'file.jpg', warning: 'BLOB token missing' });
    }

    // Extract base64 payload (strip data URL prefix if present)
    const base64Data = rawFile.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const safeName = filename || `file-${Date.now()}.jpg`;
    const path = `${folder}/${safeName}`;

    const blob = await put(path, buffer, {
      access: 'public',
      contentType: mimeType,
    });

    return res.status(200).json({ url: blob.url, pathname: blob.pathname });
  } catch (err: any) {
    console.error('Blob upload error:', err);
    return res.status(500).json({ error: 'Błąd uploadu', details: err.message });
  }
}
