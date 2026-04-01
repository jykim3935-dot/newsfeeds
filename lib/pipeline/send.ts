import { getSupabaseAdmin } from '@/lib/clients/supabase';
import { renderNewsletter } from '@/lib/renderers/newsletter';
import { generateSubjectLine } from '@/lib/renderers/subject-line';
import { sendEmail } from '@/lib/clients/resend';
import { logger } from '@/lib/utils/logger';
import type { Article, Trend } from '@/lib/types';

export async function runSend(batchId: string, testEmail?: string): Promise<{ sent: number; warnings: string[] }> {
  const warnings: string[] = [];

  try {
    const supabase = getSupabaseAdmin();

    const { data: articles } = await supabase.from('articles').select('*')
      .eq('batch_id', batchId).order('relevance_score', { ascending: false });

    const { data: runData } = await supabase.from('pipeline_runs').select('executive_brief')
      .eq('batch_id', batchId).single();

    const { data: trends } = await supabase.from('trends').select('*')
      .eq('batch_id', batchId);

    const arts = (articles || []) as Article[];
    if (arts.length === 0) return { sent: 0, warnings: ['No articles'] };

    const date = new Date().toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
    });
    const { subject, preheader } = generateSubjectLine(arts, date);
    const html = renderNewsletter({
      articles: arts, date, executiveBrief: runData?.executive_brief || '',
      trends: (trends || []) as Trend[], subjectLine: subject, preheaderText: preheader,
    });

    let recipients: string[];
    if (testEmail) {
      recipients = [testEmail];
    } else {
      const { data: rd } = await supabase.from('recipients').select('email').eq('enabled', true);
      recipients = (rd || []).map((r) => r.email);
    }

    let sent = 0;
    if (recipients.length > 0) {
      const r = await sendEmail({ to: recipients, subject, html });
      if (r.success) sent = recipients.length;
      else warnings.push(`Email: ${r.error}`);
    }

    logger.info('send', `Sent to ${sent} recipients`);
    return { sent, warnings };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    warnings.push(`Send step failed: ${msg}`);
    logger.error('send', `Send failed: ${msg}`);
    return { sent: 0, warnings };
  }
}
