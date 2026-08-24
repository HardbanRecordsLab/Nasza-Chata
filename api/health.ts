import type { Request, Response } from 'express';
import { getPgPool } from '../server/db';

export default async function handler(req: Request | any, res: Response | any) {
  const hasPg = !!getPgPool();
  return res.status(200).json({
    status: 'ok',
    time: new Date().toISOString(),
    aiReady: !!process.env.GEMINI_API_KEY,
    database: hasPg ? 'postgresql/neon' : 'local-storage/memory',
  });
}
