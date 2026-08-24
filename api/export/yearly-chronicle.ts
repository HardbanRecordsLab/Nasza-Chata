import type { Request, Response } from 'express';
import { getDbState } from '../../server/db';

export default async function handler(req: Request | any, res: Response | any) {
  try {
    const db = await getDbState();
    const visualZones = db.visualZones || [];

    // Build chronicle: zone × month grid
    const months = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'];
    const now = new Date();
    const currentYear = now.getFullYear();

    const chronicle = visualZones.map((zone: any) => {
      const monthEntries: Record<number, any> = {};
      (zone.entries || []).forEach((entry: any) => {
        const d = new Date(entry.capturedAt);
        if (d.getFullYear() === currentYear) {
          const month = d.getMonth();
          // Keep closest to mid-month
          const dayOfMonth = d.getDate();
          const existing = monthEntries[month];
          if (!existing || Math.abs(dayOfMonth - 15) < Math.abs(new Date(existing.capturedAt).getDate() - 15)) {
            monthEntries[month] = entry;
          }
        }
      });

      return {
        zoneId: zone.id,
        zoneName: zone.name,
        zoneType: zone.zoneType,
        months: months.map((name, idx) => ({
          month: name,
          monthIndex: idx,
          entry: monthEntries[idx] || null,
        })),
        totalEntries: Object.keys(monthEntries).length,
      };
    });

    return res.status(200).json({
      year: currentYear,
      chronicle,
      generatedAt: now.toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Błąd generowania kroniki', details: err.message });
  }
}
