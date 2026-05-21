import { Resend } from 'resend';
import { sendPushNotification } from './push';

const resend = new Resend(process.env.AUTH_RESEND_KEY);

export async function sendEmailReminder(to: string, name: string) {
  await resend.emails.send({
    from: 'onboarding@resend.dev',
    to,
    subject: `Time for your balance exercises, ${name} 🌿`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h1 style="font-size: 28px; color: #2C1810;">Time to move, ${name}! 🌿</h1>
        <p style="font-size: 18px; color: #7A6355; margin: 16px 0;">
          Your daily balance exercises are ready. Just a few minutes keeps you steady and strong.
        </p>
        <a href="${process.env.NEXTAUTH_URL}" style="display: inline-block; background: #C4714A; color: white; font-size: 20px; font-weight: 600; padding: 16px 32px; border-radius: 16px; text-decoration: none;">
          Start Exercises
        </a>
      </div>
    `,
  });
}

export async function sendPushReminder(
  subscription: { endpoint: string; p256dh: string; auth: string },
  name: string
) {
  await sendPushNotification(subscription, {
    title: 'Time for your exercises! 🌿',
    body: `Hey ${name}, your daily balance routine is ready.`,
    url: '/',
  });
}
