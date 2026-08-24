import type { Request, Response } from 'express';
import { getDbState } from '../../server/db';
import { sendWebPushNotification } from '../../server/pushService';

export default async function handler(req: Request | any, res: Response | any) {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized — brak CRON_SECRET' });
  }

  try {
    const db = await getDbState();
    const wood = db.woodInventory || { estimatedM3: 0, logsInBoilerRoom: 0, totalCapacityM3: 15 };
    const notifications = db.notifications || {};

    const alerts: string[] = [];

    // Check boiler room logs
    if (wood.logsInBoilerRoom < 15) {
      alerts.push(`⚠️ Mało polan w kotłowni: ${wood.logsInBoilerRoom} szt.`);
    }

    // Check overall wood supply
    if (wood.estimatedM3 < 5) {
      alerts.push(`🪵 Niski zapas drewutni: ${wood.estimatedM3} m³ / ${wood.totalCapacityM3} m³`);
    }

    if (alerts.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Zapas drewna w normie. Powiadomienie nie wymagane.',
        wood,
      });
    }

    const body = alerts.join(' • ');

    // Send to all profiles with wood alerts enabled
    const now = new Date();
    const currentHour = now.getHours();

    for (const [profileId, settings] of Object.entries(notifications) as any[]) {
      if (!settings?.webPushEnabled) continue;

      const quietStart = parseInt((settings.quietHoursStart || '22:00').split(':')[0], 10);
      const quietEnd = parseInt((settings.quietHoursEnd || '07:00').split(':')[0], 10);
      const inQuietHours = quietStart > quietEnd
        ? currentHour >= quietStart || currentHour < quietEnd
        : currentHour >= quietStart && currentHour < quietEnd;

      if (inQuietHours) continue;

      await sendWebPushNotification(
        {
          title: '🪵 Alert: Stan drewutni i kotłowni',
          body,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: 'wood-supply-check',
          type: 'warning',
          url: '/?tab=house',
        },
        profileId
      );
    }

    return res.status(200).json({
      success: true,
      message: `Wysłano alert o stanie drewna: ${body}`,
      alerts,
      wood,
    });
  } catch (err: any) {
    console.error('Wood supply check cron error:', err);
    return res.status(500).json({ error: 'Błąd crona sprawdzania drewna', details: err.message });
  }
}
