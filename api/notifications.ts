import type { Request, Response } from 'express';
import { handleGetVapidKey, handleSubscribe, handleSendPush, handleTestPush } from '../server/handlers/notifications';

export default async function handler(req: Request | any, res: Response | any) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const action = url.searchParams.get('action') || req.headers['x-action'];

  try {
    switch (action) {
      case 'vapid-public-key':
        return res.status(200).json(handleGetVapidKey());

      case 'subscribe':
        if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
        const subBody = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        return res.status(200).json(await handleSubscribe(subBody.profileId, subBody.subscription));

      case 'send-push':
        if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
        const pushBody = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        return res.status(200).json(await handleSendPush(pushBody));

      case 'test':
        if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
        const testBody = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        return res.status(200).json(await handleTestPush(testBody));

      default:
        return res.status(400).json({ error: 'Unknown action. Use ?action=vapid-public-key|subscribe|send-push|test' });
    }
  } catch (err: any) {
    return res.status(500).json({ error: 'Notifications error', details: err.message });
  }
}
