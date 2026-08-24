import type { Request, Response } from 'express';
import { getDbState } from '../../server/db';

export default async function handler(req: Request | any, res: Response | any) {
  try {
    const db = await getDbState();
    const now = new Date();
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Nasza Chata//Planer Domowy//PL',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Nasza Chata — Obowiązki',
      'X-WR-TIMEZONE:Europe/Warsaw',
    ];

    const tasks = db.tasks && db.tasks.length > 0 ? db.tasks : [];
    tasks.forEach((t: any, idx: number) => {
      const uid = `chata-task-${t.id}-${idx}@naszachata.pl`;
      const dtStamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      icsContent.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${dtStamp}`,
        `SUMMARY:🏡 ${t.name}`,
        `DESCRIPTION:${t.description || ''} (Częstotliwość: ${t.frequency}, Pokój: ${t.room})`,
        `CATEGORIES:${t.category}`,
        'END:VEVENT'
      );
    });

    icsContent.push('END:VCALENDAR');

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="nasza-chata-obowiazki.ics"');
    return res.status(200).send(icsContent.join('\r\n'));
  } catch (err: any) {
    return res.status(500).json({ error: 'Błąd generowania .ics', details: err.message });
  }
}
