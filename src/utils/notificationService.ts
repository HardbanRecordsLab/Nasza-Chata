// Web Push and Notification Management Service for Nasza Chata

export type NotificationPermissionStatus = 'default' | 'granted' | 'denied' | 'unsupported';

export interface PushNotificationOptions {
  title: string;
  body: string;
  tag?: string;
  icon?: string;
  badge?: string;
  data?: Record<string, any>;
  vibrate?: number[];
  actions?: Array<{ action: string; title: string }>;
}

let swRegistration: ServiceWorkerRegistration | null = null;

// Register Service Worker on startup
export async function initServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    swRegistration = registration;
    console.log('✅ ServiceWorker registered with scope:', registration.scope);
    return registration;
  } catch (err) {
    console.warn('⚠️ ServiceWorker registration failed:', err);
    return null;
  }
}

// Get current permission status
export function getNotificationPermissionStatus(): NotificationPermissionStatus {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission as NotificationPermissionStatus;
}

// Request permission to send web push notifications
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  try {
    const result = await Notification.requestPermission();
    if (result === 'granted') {
      // Also register SW if not already
      if (!swRegistration && 'serviceWorker' in navigator) {
        swRegistration = await navigator.serviceWorker.ready.catch(() => null);
      }
      return true;
    }
    return false;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return false;
  }
}

// Dispatch notification (via active ServiceWorker for mobile/background support, or window.Notification)
export async function sendWebNotification(options: PushNotificationOptions): Promise<boolean> {
  if (getNotificationPermissionStatus() !== 'granted') {
    return false;
  }

  const {
    title,
    body,
    tag = 'chata-task-' + Date.now(),
    icon = '/icon.svg',
    badge = '/icon.svg',
    data = { url: '/' },
    actions = [
      { action: 'open', title: 'Otwórz Chate' },
      { action: 'dismiss', title: 'Ukryj' },
    ],
  } = options;

  try {
    // 1. Try Service Worker showNotification (supports actions and background wake)
    if ('serviceWorker' in navigator) {
      const reg = swRegistration || (await navigator.serviceWorker.ready);
      if (reg && reg.showNotification) {
        await reg.showNotification(title, {
          body,
          tag,
          icon,
          badge,
          data,
          actions,
          vibrate: [200, 100, 200],
        } as any);
        return true;
      }
    }

    // 2. Fallback to standard Notification API
    if ('Notification' in window) {
      const n = new Notification(title, {
        body,
        tag,
        icon,
        badge,
        data,
      });
      n.onclick = () => {
        window.focus();
        n.close();
      };
      return true;
    }
  } catch (err) {
    console.warn('Failed to dispatch notification:', err);
  }

  return false;
}

// Helper to convert VAPID public key to Uint8Array for PushManager
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Register push subscription with browser's PushManager and backend DB
 */
export async function registerPushSubscription(profileId: string): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false;
  }

  try {
    const reg = swRegistration || (await navigator.serviceWorker.ready);
    if (!reg || !reg.pushManager) {
      return false;
    }

    // 1. Fetch server VAPID key
    let vapidPublicKey = '';
    try {
      const res = await fetch('/api/notifications?action=vapid-public-key');
      const data = await res.json();
      vapidPublicKey = data.publicKey;
    } catch {
      // Fallback default VAPID
      vapidPublicKey = 'BHbwXzwGI-sY9KqG_N1lszcVyspcW-rqrcPhDnp1Jn6wBPzYAZQolVKgYTzZ3dOjmsi2hWl1FSj1SLB7Zj92YGE';
    }

    let subscription = await reg.pushManager.getSubscription();
    if (!subscription && vapidPublicKey) {
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });
    }

    if (subscription) {
      // Send subscription to server
      await fetch('/api/notifications?action=subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId,
          subscription: subscription.toJSON ? subscription.toJSON() : subscription,
        }),
      });
      console.log('✅ Registered Push Subscription for profile:', profileId);
      return true;
    }
  } catch (err) {
    console.warn('⚠️ PushManager subscription error:', err);
  }

  return false;
}

// Quick Helper Notifications

export async function sendMorningBriefingNotification(pendingTasksCount: number, profileName: string) {
  return sendWebNotification({
    title: `☀️ Dzień dobry, ${profileName}! Plan na dziś w Chacie`,
    body: `Na dzisiejszej liście masz ${pendingTasksCount} ${
      pendingTasksCount === 1 ? 'obowiązek' : pendingTasksCount < 5 ? 'obowiązki' : 'obowiązków'
    }. Sprawdź drewutnię i zaplanuj dzień.`,
    tag: 'chata-morning-briefing',
    data: { url: '/?tab=today' },
  });
}

export async function sendTaskReminderNotification(taskName: string, room: string, profileName: string) {
  return sendWebNotification({
    title: `🔔 Przypomnienie o zadaniu: ${taskName}`,
    body: `${profileName}, czas na zaplanowany obowiązek w pomieszczeniu: ${room}.`,
    tag: `task-reminder-${taskName}`,
    data: { url: '/?tab=today' },
  });
}

export async function sendSosEmergencyNotification(title: string, room: string, reportedBy: string) {
  return sendWebNotification({
    title: `🚨 PILNA AWARIA (SOS): ${title}`,
    body: `${reportedBy} zgłasza problem w miejscu: ${room}. Wymagana pilna reakcja domowników!`,
    tag: 'chata-sos-alert',
    data: { url: '/?action=sos' },
  });
}

export async function sendWoodSupplyAlertNotification(logsInBoiler: number, totalM3: number) {
  return sendWebNotification({
    title: `🪵 Niski zapas drewna w kotłowni!`,
    body: `Zostało tylko ${logsInBoiler} polan przy piecu (zapas w drewutni: ${totalM3.toFixed(1)} m³). Warto przynieść kosz drewna!`,
    tag: 'chata-wood-alert',
    data: { url: '/?tab=house' },
  });
}

export async function sendWeatherChoreAlertNotification(weatherAdvice: string) {
  return sendWebNotification({
    title: `🌦️ Pogoda a obowiązki w ogrodzie`,
    body: weatherAdvice,
    tag: 'chata-weather-alert',
    data: { url: '/?tab=today' },
  });
}
