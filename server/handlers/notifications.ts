import { sendWebPushNotification, getVapidPublicKey } from '../pushService';

// --- Push Subscriptions ---
export async function handleSubscribe(profileId: string, subscription: any) {
  const { savePushSubscription, getPushSubscriptions } = await import('../db');

  if (!subscription || !subscription.endpoint) {
    throw new Error('Brak poprawnego obiektu subskrypcji.');
  }

  await savePushSubscription(profileId || 'all', subscription);
  const subs = await getPushSubscriptions();

  return {
    status: 'ok',
    message: 'Subskrypcja zarejestrowana.',
    totalSubscribers: subs.length,
  };
}

// --- Send Push ---
export async function handleSendPush(payload: {
  title?: string;
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  type?: string;
  url?: string;
  targetProfileId?: string;
  respectPref?: 'sosAlerts' | 'woodAlerts';
}) {
  const result = await sendWebPushNotification(
    {
      title: payload.title || '🏡 Nasza Chata',
      body: payload.body || 'Powiadomienie z Chaty.',
      icon: payload.icon || '/icon-192.png',
      badge: payload.badge || '/icon-192.png',
      tag: payload.tag || 'chata-alert',
      type: payload.type || 'info',
      url: payload.url || '/',
    },
    payload.targetProfileId,
    payload.respectPref
  );

  return {
    success: true,
    message: `Wysłano ${result.sentCount} powiadomień Web Push (${result.failedCount} niepowodzeń).`,
    result,
  };
}

// --- Test Push ---
export async function handleTestPush(payload: {
  title?: string;
  body?: string;
  tag?: string;
  type?: string;
  profileName?: string;
  targetProfileId?: string;
}) {
  const pushPayload = {
    title: payload.title || '🏡 Nasza Chata: Test powiadomienia',
    body: payload.body || `Witaj ${payload.profileName || 'w domu'}! Powiadomienia w Chacie działają poprawnie.`,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: payload.tag || 'chata-test-' + Date.now(),
    type: payload.type || 'info',
    url: '/',
    timestamp: Date.now(),
  };

  const pushResult = await sendWebPushNotification(pushPayload, payload.targetProfileId);

  return {
    success: true,
    message: pushResult.sentCount > 0
      ? `Wysłano rzeczywiste powiadomienie Web Push do ${pushResult.sentCount} urządzeń.`
      : 'Zarejestrowano test. Zasubskrybuj urządzenie, aby odbierać powiadomienia w tle.',
    payload: pushPayload,
    pushResult,
  };
}

// --- VAPID Key ---
export function handleGetVapidKey() {
  return { publicKey: getVapidPublicKey() };
}
