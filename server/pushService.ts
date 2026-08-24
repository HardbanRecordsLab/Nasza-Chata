import webpush from 'web-push';
import { getPushSubscriptions, removePushSubscription, PushSubscriptionRecord } from './db';

// VAPID configuration — keys MUST be set in environment variables
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:kamil@naszachata.pl';

if (!vapidPublicKey || !vapidPrivateKey) {
  console.warn(
    '[WebPush] VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY not set. Push notifications disabled.'
  );
} else {
  try {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  } catch (e) {
    console.warn('[WebPush] Error configuring VAPID details:', e);
  }
}

export function getVapidPublicKey(): string {
  if (!vapidPublicKey) {
    throw new Error('VAPID_PUBLIC_KEY not configured. Push notifications are disabled.');
  }
  return vapidPublicKey;
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  type?: string;
  url?: string;
  timestamp?: number;
  actions?: Array<{ action: string; title: string }>;
}

export interface SendPushResult {
  totalSubscribers: number;
  sentCount: number;
  failedCount: number;
  expiredCleaned: number;
  results: Array<{ id: string; success: boolean; error?: string }>;
}

/**
 * Send real Web Push notification to all or specific profile subscriptions
 */
export async function sendWebPushNotification(
  payload: PushPayload,
  targetProfileId?: string
): Promise<SendPushResult> {
  if (!vapidPublicKey || !vapidPrivateKey) {
    return { totalSubscribers: 0, sentCount: 0, failedCount: 0, expiredCleaned: 0, results: [] };
  }

  const subscriptions = await getPushSubscriptions();
  const relevantSubs = targetProfileId && targetProfileId !== 'all'
    ? subscriptions.filter(s => s.profileId === targetProfileId || s.profileId === 'all')
    : subscriptions;

  const notificationData = JSON.stringify({
    title: payload.title || '🏡 Nasza Chata',
    body: payload.body || 'Powiadomienie z Chaty.',
    icon: payload.icon || '/icon-192.png',
    badge: payload.badge || '/icon-192.png',
    tag: payload.tag || 'chata-alert',
    type: payload.type || 'info',
    timestamp: payload.timestamp || Date.now(),
    data: { url: payload.url || '/' },
    actions: payload.actions || [
      { action: 'open', title: 'Otwórz Chate' },
      { action: 'dismiss', title: 'Zamknij' },
    ],
  });

  const results: Array<{ id: string; success: boolean; error?: string }> = [];
  let sentCount = 0;
  let failedCount = 0;
  let expiredCleaned = 0;

  for (const sub of relevantSubs) {
    try {
      if (!sub.subscription || !sub.subscription.endpoint) {
        continue;
      }
      await webpush.sendNotification(sub.subscription, notificationData);
      sentCount++;
      results.push({ id: sub.id, success: true });
    } catch (err: any) {
      failedCount++;
      const statusCode = err.statusCode || err.status;
      results.push({ id: sub.id, success: false, error: err.message || 'Push delivery failed' });

      // If subscription expired or gone (410 / 404), cleanup from database
      if (statusCode === 410 || statusCode === 404) {
        expiredCleaned++;
        await removePushSubscription(sub.subscription.endpoint);
      }
    }
  }

  return {
    totalSubscribers: relevantSubs.length,
    sentCount,
    failedCount,
    expiredCleaned,
    results,
  };
}
