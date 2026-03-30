import type { Article, Trend, NewsletterData } from '@/lib/types';

export function renderNewsletter(data: NewsletterData): string {
  const { articles, date, executiveBrief, trends, subjectLine, preheaderText } = data;

  const redArticles = articles.filter((a) => a.urgency === 'red').sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
  const yellowArticles = articles.filter((a) => a.urgency === 'yellow').sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
  const total = articles.length;
  const deepCount = articles.filter((a) => a.deep_summary).length;

  const redCards = redArticles.map((a) => renderRedCard(a)).join('');
  const yellowCards = yellowArticles.map((a) => renderYellowCard(a)).join('');
  const trendSection = trends.length > 0 ? renderTrends(trends) : '';
  const fullList = articles.map((a) => `📰 <a href="${escHtml(a.url)}" style="color:#2563EB;">${escHtml(a.title)}</a> — ${escHtml(a.source || '')}<br>`).join('\n            ');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${escHtml(subjectLine)}</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,Arial,'맑은 고딕',sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#F3F4F6;">${escHtml(preheaderText)}</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;">
    <tr><td align="center" style="padding:16px;">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td style="background:#1E40AF;padding:20px 24px;">
          <h1 style="margin:0;color:#FFFFFF;font-size:20px;">ACRYL Intelligence Brief</h1>
          <p style="margin:4px 0 0;color:#BFDBFE;font-size:13px;">${escHtml(date)}</p>
        </td></tr>
        <tr><td style="background:#EFF6FF;padding:20px 24px;border-left:4px solid #1E40AF;">
          <h2 style="margin:0 0 12px;font-size:16px;color:#1E3A5F;">🎯 오늘의 핵심</h2>
          <div style="font-size:14px;line-height:1.8;color:#1F2937;">${escHtml(executiveBrief)}</div>
        </td></tr>
        <tr><td style="background:#FFFFFF;padding:12px 24px;border-bottom:1px solid #E5E7EB;">
          <span style="color:#6B7280;font-size:12px;">📊 ${total}건 · 🔴${redArticles.length} 🟡${yellowArticles.length} 🟢${total - redArticles.length - yellowArticles.length} · 심층 ${deepCount}건</span>
        </td></tr>
        ${redArticles.length > 0 ? `<tr><td style="background:#FFFFFF;padding:20px 24px;">
          <h2 style="margin:0 0 16px;font-size:16px;color:#DC2626;">🔴 긴급 대응 필요</h2>
          ${redCards}
        </td></tr>` : ''}
        ${yellowArticles.length > 0 ? `<tr><td style="background:#FFFFFF;padding:20px 24px;border-top:1px solid #E5E7EB;">
          <h2 style="margin:0 0 16px;font-size:16px;color:#D97706;">🟡 주의 관찰</h2>
          ${yellowCards}
        </td></tr>` : ''}
        ${trendSection}
        <tr><td style="background:#F9FAFB;padding:20px 24px;border-top:1px solid #E5E7EB;">
          <h2 style="margin:0 0 12px;font-size:14px;color:#6B7280;">📋 전체 기사 (${total}건)</h2>
          <div style="font-size:12px;line-height:2;color:#4B5563;">
            ${fullList}
          </div>
        </td></tr>
        <tr><td style="padding:20px 24px;text-align:center;">
          <p style="font-size:11px;color:#9CA3AF;margin:0;">
            Powered by Claude AI · ACRYL Intelligence Brief v3.0<br>
            본 브리프는 AI 자동 분석 결과이며 투자 조언이 아닙니다.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function renderRedCard(a: Article): string {
  const findings = (a.key_findings || []).map((f) =>
    `<div style="font-size:12px;color:#1D4ED8;">▸ ${escHtml(f)}</div>`
  ).join('');

  const actions = (a.action_items || []).map((act) =>
    `<div style="font-size:13px;color:#78350F;">${escHtml(act)}</div>`
  ).join('');

  const actionCard = actions ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;">
                <tr><td style="padding:8px 12px;background:#FEF3C7;">
                  <div style="font-size:12px;font-weight:bold;color:#92400E;">▶ Action</div>
                  ${actions}
                </td></tr>
              </table>` : '';

  return `<table width="100%" cellpadding="0" cellspacing="0" style="border-left:4px solid #EF4444;margin-bottom:16px;">
            <tr><td style="padding:12px 16px;background:#FEF2F2;">
              <div style="font-size:11px;color:#DC2626;font-weight:bold;">${escHtml(a.category || '')} · ${a.relevance_score || 0}/10</div>
              <div style="font-size:16px;font-weight:600;color:#1F2937;margin:4px 0;">
                <a href="${escHtml(a.url)}" style="color:#1F2937;text-decoration:none;">${escHtml(a.title)}</a>
              </div>
              <div style="font-size:12px;color:#6B7280;">${escHtml(a.source || '')} · ${escHtml(a.published_at || '')}</div>
              ${a.deep_summary ? `<div style="font-size:14px;color:#374151;margin-top:8px;line-height:1.6;">${escHtml(a.deep_summary)}</div>` : ''}
              ${findings ? `<div style="margin-top:8px;padding-left:12px;border-left:2px solid #3B82F6;">${findings}</div>` : ''}
              ${actionCard}
            </td></tr>
          </table>`;
}

function renderYellowCard(a: Article): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="border-left:4px solid #F59E0B;margin-bottom:12px;">
            <tr><td style="padding:10px 16px;">
              <a href="${escHtml(a.url)}" style="font-size:14px;color:#1F2937;text-decoration:none;font-weight:600;">${escHtml(a.title)}</a>
              <div style="font-size:12px;color:#6B7280;margin-top:2px;">${escHtml(a.source || '')} · ${escHtml(a.category || '')}</div>
              ${a.impact_comment ? `<div style="font-size:13px;color:#4B5563;margin-top:4px;">${escHtml(a.impact_comment)}</div>` : ''}
            </td></tr>
          </table>`;
}

function renderTrends(trends: Trend[]): string {
  const cards = trends.map((t) => `
          <div style="margin-bottom:12px;padding:10px 16px;background:#F0FDF4;border-left:4px solid #22C55E;">
            <div style="font-size:14px;font-weight:600;color:#166534;">${escHtml(t.trend_title)} <span style="font-size:11px;color:#6B7280;">(${t.strength})</span></div>
            <div style="font-size:13px;color:#374151;margin-top:4px;line-height:1.5;">${escHtml(t.trend_description)}</div>
          </div>`
  ).join('');

  return `<tr><td style="background:#FFFFFF;padding:20px 24px;border-top:1px solid #E5E7EB;">
          <h2 style="margin:0 0 16px;font-size:16px;color:#16A34A;">📈 트렌드</h2>
          ${cards}
        </td></tr>`;
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
