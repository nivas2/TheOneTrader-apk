import { getMailer } from '../config/mailer';
import { env } from '../config/env';

const SUPPORT_EMAIL = 'hari@theonetrade.in';
const EMAIL_FROM = 'The One Trade <hari@theonetrade.in>';

const emailFooter = `
  <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #eee;">
    <p style="color: #999; font-size: 12px; margin: 0;">
      Need help? Contact us at <a href="mailto:${SUPPORT_EMAIL}" style="color: #00B090;">${SUPPORT_EMAIL}</a>
    </p>
    <p style="color: #999; font-size: 12px; margin: 4px 0 0;">
      &copy; ${new Date().getFullYear()} The One Trade. All rights reserved.
    </p>
  </div>
`;

export async function sendOtpEmail(email: string, code: string): Promise<void> {
  const resend = getMailer();
  await resend.emails.send({
    from: EMAIL_FROM,
    to: email,
    subject: 'Your Verification Code - The One Trade',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #00B090;">The One Trade</h2>
        <p>Your verification code is:</p>
        <div style="background: #f0f0f0; padding: 20px; text-align: center; font-size: 32px; letter-spacing: 8px; font-weight: bold; border-radius: 8px;">
          ${code}
        </div>
        <p style="color: #666; margin-top: 16px;">This code expires in 10 minutes.</p>
        ${emailFooter}
      </div>
    `,
  });
}

export async function sendLeadNotification(lead: { name: string; email: string; phone: string }): Promise<void> {
  const resend = getMailer();
  await resend.emails.send({
    from: EMAIL_FROM,
    to: env.ADMIN_EMAIL,
    subject: 'New Lead Captured - The One Trade',
    html: `
      <h3>New Lead</h3>
      <p><strong>Name:</strong> ${lead.name}</p>
      <p><strong>Email:</strong> ${lead.email}</p>
      <p><strong>Phone:</strong> ${lead.phone}</p>
    `,
  });
}

export async function sendPaymentConfirmation(email: string, planType: string, segment: string): Promise<void> {
  const resend = getMailer();
  await resend.emails.send({
    from: EMAIL_FROM,
    to: email,
    subject: 'Payment Receipt Received - The One Trade',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #00B090;">The One Trade</h2>
        <p>Thank you! We've received your payment receipt.</p>
        <p><strong>Plan:</strong> ${planType}</p>
        <p><strong>Segment:</strong> ${segment}</p>
        <p>Your subscription will be activated once our team verifies your payment. You'll receive a confirmation email shortly.</p>
        <p style="color: #666; font-size: 13px; margin-top: 16px;">If you have any questions about your payment, please contact us at <a href="mailto:${SUPPORT_EMAIL}" style="color: #00B090;">${SUPPORT_EMAIL}</a></p>
        ${emailFooter}
      </div>
    `,
  });
}

export async function sendPaymentAdminAlert(
  userName: string,
  userEmail: string,
  planType: string,
  segment: string,
  _screenshotPath: string
): Promise<void> {
  const resend = getMailer();
  await resend.emails.send({
    from: EMAIL_FROM,
    to: env.ADMIN_EMAIL,
    subject: `New Payment Receipt - ${userName}`,
    html: `
      <h3>New Payment Receipt</h3>
      <p><strong>User:</strong> ${userName} (${userEmail})</p>
      <p><strong>Plan:</strong> ${planType}</p>
      <p><strong>Segment:</strong> ${segment}</p>
      <p>Please review and approve in the admin panel.</p>
    `,
  });
}

export async function sendSubscriptionActivated(email: string, planType: string, segment: string, expiresAt: Date): Promise<void> {
  const resend = getMailer();
  await resend.emails.send({
    from: EMAIL_FROM,
    to: email,
    subject: 'Subscription Activated! - The One Trade',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #00B090;">The One Trade</h2>
        <p>Your subscription has been activated!</p>
        <p><strong>Plan:</strong> ${planType}</p>
        <p><strong>Segment:</strong> ${segment}</p>
        <p><strong>Expires:</strong> ${expiresAt.toLocaleDateString()}</p>
        <p>You can now access premium trading signals. Login to your dashboard to get started.</p>
        <p style="color: #666; font-size: 13px; margin-top: 16px;">If you need any assistance, reach out to us at <a href="mailto:${SUPPORT_EMAIL}" style="color: #00B090;">${SUPPORT_EMAIL}</a></p>
        ${emailFooter}
      </div>
    `,
  });
}
