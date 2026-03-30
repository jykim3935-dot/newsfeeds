import { Resend } from 'resend';
import { logger } from '@/lib/utils/logger';

let resendClient: Resend | null = null;
function getResend(): Resend {
  if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY);
  return resendClient;
}

interface SendEmailOptions {
  to: string[];
  subject: string;
  html: string;
}

export async function sendEmail(opts: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  const from = 'intel@acryl.ai';
  try {
    await getResend().emails.send({
      from: `ACRYL Intel <${from}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    logger.info('sendEmail', `Sent to ${opts.to.length} recipients`);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('sendEmail', msg);
    return { success: false, error: msg };
  }
}
