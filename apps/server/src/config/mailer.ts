import { Resend } from 'resend';
import { env } from './env';

let resend: Resend;

export function getMailer(): Resend {
  if (!resend) {
    resend = new Resend(env.RESEND_API_KEY);
  }
  return resend;
}
