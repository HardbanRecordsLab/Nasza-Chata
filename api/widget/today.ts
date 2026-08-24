import type { Request, Response } from 'express';
import { getDbState } from '../../server/db';

export default async function handler(req: Request | any, res: Response | any) {
  try {
    const db = await getDbState();
    const todayStr = new Date().toISOString().split('T')[0];
    const allTasks = db.tasks || [];
    const completions = db.completions || [];
    const sosAlerts = db.sosAlerts || [];
    const wood = db.woodInventory || { estimatedM3: 8.5, logsInBoilerRoom: 18 };

    const tasksForToday = allTasks.map((t: any) => {
      const isCompleted = completions.some((c: any) =>
        c.taskId === t.id && (c.periodKey?.startsWith(todayStr) || c.completedAt?.startsWith(todayStr))
      );
      return {
        id: t.id,
        name: t.name,
        category: t.category,
        room: t.room,
        frequency: t.frequency,
        isCompleted,
      };
    });

    const activeSos = sosAlerts.filter((a: any) => a.status === 'active');
    const completedCount = tasksForToday.filter(t => t.isCompleted).length;

    return res.status(200).json({
      updatedAt: new Date().toISOString(),
      todayDate: todayStr,
      summary: {
        totalTasks: tasksForToday.length,
        completedTasks: completedCount,
        pendingTasks: tasksForToday.length - completedCount,
        woodM3: wood.estimatedM3,
        boilerLogs: wood.logsInBoilerRoom,
        hasActiveSos: activeSos.length > 0,
        activeSosTitle: activeSos[0]?.title || null,
      },
      tasks: tasksForToday,
      sos: activeSos,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Widget data error', details: err.message });
  }
}
