import webpush from 'web-push';

const { VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env;
if (!VAPID_EMAIL || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  throw new Error('Missing VAPID env vars: VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY must all be set');
}

webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

export async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; url?: string }
): Promise<void> {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload)
    );
  } catch (err) {
    const pushErr = err as { statusCode?: number; message?: string };
    const error = Object.assign(new Error(pushErr.message ?? 'Push failed'), { statusCode: pushErr.statusCode });
    throw error;
  }
}

export { webpush };
