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
  const url = new URL(req.url, `http://${req.headers.host}`);
  const format = url.searchParams.get('format') || (req.headers.accept?.includes('text/html') ? 'html' : 'json');
  const db = await getDbState();
  const zones = (db as any).visualZones || [];
  const months = ['Sty','Lut','Mar','Kwi','Maj','Cze','Lip','Sie','Wrz','Paź','Lis','Gru'];
  const year = new Date().getFullYear();
  const chronicle = zones.map((z: any) => ({
    zoneId: z.id,
    name: z.name,
    zoneType: z.zoneType,
    months: months.map((m, i) => {
      const entries = (z.entries || []).filter((e: any) => {
        const d = new Date(e.capturedAt);
        return d.getMonth() === i && d.getFullYear() === year;
      });
      return { month: m, entries: entries.length, latest: entries[entries.length - 1] || null };
    }),
  }));

  if (format === 'html') {
    const html = buildChronicleHtml(year, months, chronicle);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  }
  return res.status(200).json({ year, zones: chronicle });
}

function buildChronicleHtml(year: number, months: string[], chronicle: any[]): string {
  const rows = chronicle.map((z: any) => {
    const cells = z.months.map((m: any) => {
      if (!m.latest) return `<td class="empty">—</td>`;
      const e = m.latest;
      const isVideo = e.mediaType === 'video';
      const thumb = e.thumbnailUrl || e.mediaUrl;
      const caption = `${e.angleLabel || ''} • ${new Date(e.capturedAt).toLocaleDateString('pl-PL')}`;
      return `<td><div class="cell">${
        isVideo
          ? `<a href="${e.mediaUrl}" target="_blank" class="video-badge">▶ wideo</a><img src="${thumb}" alt="" loading="lazy" />`
          : `<img src="${e.mediaUrl}" alt="" loading="lazy" />`
      }<span class="cap">${caption}</span><span class="badge">${m.entries} wpis(ów)</span></div></td>`;
    }).join('');
    return `<tr><th>${z.name}<br/><span class="zone-type">${z.zoneType}</span></th>${cells}</tr>`;
  }).join('');

  const header = months.map(m => `<th>${m}</th>`).join('');

  return `<!doctype html>
<html lang="pl"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Kronika wizualna ${year} — Nasza Chata</title>
<style>
  *{box-sizing:border-box} body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;margin:0;padding:24px;background:#FDFCF0;color:#2D4F1E}
  h1{font-size:22px;margin:0 0 4px} .sub{font-size:12px;color:#78350F;opacity:.8;margin-bottom:16px}
  .actions{display:flex;gap:8px;margin-bottom:16px}
  .btn{padding:10px 16px;border-radius:12px;border:1px solid #78350F22;background:#2D4F1E;color:#FDFCF0;font-weight:700;font-size:13px;cursor:pointer}
  .btn.sec{background:white;color:#78350F}
  table{width:100%;border-collapse:collapse;font-size:11px;background:white;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)}
  th,td{border:1px solid #78350F18;padding:6px;text-align:center;vertical-align:top}
  th{background:#2D4F1E;color:#FDFCF0;font-size:11px;min-width:90px}
  th.zone-type{font-weight:400;opacity:.7;font-size:10px}
  td.empty{color:#999;background:#f9f5eb}
  .cell{display:flex;flex-direction:column;gap:4px;align-items:center}
  .cell img{width:90px;height:64px;object-fit:cover;border-radius:8px;border:1px solid #78350F18}
  .cap{font-size:9px;color:#78350F;opacity:.8;max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .badge{font-size:8px;background:#D97706;color:white;padding:1px 5px;border-radius:99px}
  .video-badge{font-size:9px;background:#D97706;color:white;padding:2px 6px;border-radius:99px;text-decoration:none}
  @media print{body{padding:0;background:white} .actions{display:none} table{box-shadow:none} @page{margin:12mm;size:A4 landscape}}
  @media (max-width:900px){table{display:block;overflow:auto}}
</style></head><body>
<h1>🏡 Kronika wizualna ${year} — Nasza Chata</h1>
<p class="sub">Strefa × miesiąc — ostatnie zdjęcie/wideo z każdego miesiąca. Wydruk: Ctrl/Cmd+P.</p>
<div class="actions"><button class="btn" onclick="window.print()">🖨️ Drukuj / Zapisz PDF</button><a class="btn sec" href="/api/export?action=yearly-chronicle" target="_blank">Pobierz JSON</a><a class="btn sec" href="/">← Wróć do appki</a></div>
<table><thead><tr><th>Strefa</th>${header}</tr></thead><tbody>${rows || '<tr><td colspan="13" style="padding:24px;text-align:center;color:#78350F88">Brak stref wizualnych — dodaj je w zakładce „Dom / Ogród”.</td></tr>'}</tbody></table>
<p class="sub" style="margin-top:12px">Wygenerowano ${new Date().toLocaleString('pl-PL')} • Nasza Chata — ${year}</p>
</body></html>`;
}
