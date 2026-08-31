import type { Request, Response } from 'express';
import { getDbState } from '../../server/db';
import { sendWebPushNotification } from '../../server/pushService';
import { getOccurrencesForDate } from '../../src/utils/recurrenceEngine';

export default async function handler(req: Request | any, res: Response | any) {
  // Vercel Cron uses GET; verify cron secret header for security
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized — brak CRON_SECRET' });
  }

  try {
    const db = await getDbState();
    const tasks = db.tasks || [];
    const completions = db.completions || [];
    const notifications = db.notifications || {};
    const todayStr = new Date().toISOString().split('T')[0];

    const activeSos = (db.sosAlerts || []).filter((a: any) => a.status === 'active');

    // Don't nag about chores while the house is empty (absence mode) — only SOS gets through
    if ((db as any).absenceMode?.active && activeSos.length === 0) {
      return res.status(200).json({ success: true, skipped: 'absence mode active', date: todayStr });
    }

    // Count only tasks actually scheduled for today that aren't done yet
    const todayOccurrences = getOccurrencesForDate(tasks as any, completions as any, new Date(), {
      onlyScheduled: true,
      includeOverdue: false,
    });
    const completedCount = todayOccurrences.filter(o => o.isCompleted).length;
    const pendingCount = todayOccurrences.filter(o => !o.isCompleted).length;

    // Wood inventory summary
    const wood = db.woodInventory || { estimatedM3: 0, logsInBoilerRoom: 0 };

    // Build briefing message
    const bodyParts: string[] = [];
    if (pendingCount > 0) {
      bodyParts.push(`📋 ${pendingCount} zadań do wykonania`);
    } else {
      bodyParts.push(`✅ Wszystko zrobione!`);
    }
    bodyParts.push(`🪵 Drewutnia: ${wood.estimatedM3} m³, Kotłownia: ${wood.logsInBoilerRoom} polan`);

    if (activeSos.length > 0) {
      bodyParts.push(`🚨 Aktywne awarie: ${activeSos.length}`);
    }

    const body = bodyParts.join(' • ');

    // Send to all subscribed profiles (check quiet hours per profile)
    const now = new Date();
    const currentHour = now.getHours();

    for (const [profileId, settings] of Object.entries(notifications) as any[]) {
      if (!settings?.webPushEnabled) continue;

      // Check quiet hours
      const quietStart = parseInt((settings.quietHoursStart || '22:00').split(':')[0], 10);
      const quietEnd = parseInt((settings.quietHoursEnd || '07:00').split(':')[0], 10);
      const inQuietHours = quietStart > quietEnd
        ? currentHour >= quietStart || currentHour < quietEnd
        : currentHour >= quietStart && currentHour < quietEnd;

      if (inQuietHours) continue;

      await sendWebPushNotification(
        {
          title: '🏡 Podsumowanie dnia w Chacie',
          body,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: `daily-briefing-${todayStr}`,
          type: 'info',
          url: '/?tab=today',
        },
        profileId
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Poranna odprawa wysłana.',
      date: todayStr,
      pendingCount,
      completedCount,
    });
  } catch (err: any) {
    console.error('Daily briefing cron error:', err);
    return res.status(500).json({ error: 'Błąd crona porannej odprawy', details: err.message });
  }
}
