import type { Request, Response } from 'express';
import { getDbState } from '../server/db';

export default async function handler(req: Request | any, res: Response | any) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const action = url.searchParams.get('action') || req.headers['x-action'];

  try {
    switch (action) {
      case 'calendar.ics':
        return await handleIcsExport(res);
      case 'backup.json':
        return await handleBackupExport(res);
      case 'yearly-chronicle':
        return await handleYearlyChronicle(req, res);
      default:
        return res.status(400).json({ error: 'Unknown action. Use ?action=calendar.ics|backup.json|yearly-chronicle' });
    }
  } catch (err: any) {
    return res.status(500).json({ error: 'Export error', details: err.message });
  }
}

async function handleIcsExport(res: Response) {
  const db = await getDbState();
  const now = new Date();
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Nasza Chata//PL',
    'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Nasza Chata',
    'X-WR-TIMEZONE:Europe/Warsaw',
  ];

  (db.tasks || []).forEach((t: any, idx: number) => {
    ics.push(
      'BEGIN:VEVENT',
      `UID:chata-${t.id}-${idx}@naszachata.pl`,
      `DTSTAMP:${now.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `SUMMARY:🏡 ${t.name}`,
      `DESCRIPTION:${t.description || ''} (${t.frequency}, ${t.room})`,
      `CATEGORIES:${t.category}`,
      'END:VEVENT'
    );
  });

  ics.push('END:VCALENDAR');
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="nasza-chata.ics"');
  return res.status(200).send(ics.join('\r\n'));
}

async function handleBackupExport(res: Response) {
  const db = await getDbState();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="nasza-chata-backup.json"');
  return res.status(200).send(JSON.stringify(db, null, 2));
}

async function handleYearlyChronicle(req: Request, res: Response) {
  const db = await getDbState();
  const zones = (db as any).visualZones || [];
  const months = ['Sty','Lut','Mar','Kwi','Maj','Cze','Lip','Sie','Wrz','Paź','Lis','Gru'];
  const chronicle = zones.map((z: any) => ({
    zoneId: z.id,
    name: z.name,
    zoneType: z.zoneType,
    months: months.map((m, i) => {
      const entries = (z.entries || []).filter((e: any) => {
        const d = new Date(e.capturedAt);
        return d.getMonth() === i;
      });
      return { month: m, entries: entries.length, latest: entries[entries.length - 1] || null };
    }),
  }));
  return res.status(200).json({ year: new Date().getFullYear(), zones: chronicle });
}
