import type { Request, Response } from 'express';
import { getDbState } from '../../server/db';

export default async function handler(req: Request | any, res: Response | any) {
  try {
    const db = await getDbState();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="nasza-chata-backup.json"');
    return res.status(200).send(JSON.stringify(db, null, 2));
  } catch (err: any) {
    return res.status(500).json({ error: 'Błąd eksportu backupu', details: err.message });
  }
}
