import type { Article, Trend, NewsletterData } from '@/lib/types';

export function renderNewsletter(data: NewsletterData): string {
  const { articles, date, executiveBrief, trends, subjectLine, preheaderText } = data;

  const sorted = [...articles].sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
  const redArticles = sorted.filter((a) => a.urgency === 'red');
  const yellowArticles = sorted.filter((a) => a.urgency === 'yellow');
  const highArticles = sorted.filter((a) => (a.relevance_score || 0) >= 6);
  const lowArticles = sorted.filter((a) => (a.relevance_score || 0) < 6);
  const total = articles.length;
  const deepCount = articles.filter((a) => a.deep_summary).length;

  const briefText = executiveBrief && !executiveBrief.includes('오류') && !executiveBrief.includes('시간 초과')
    ? executiveBrief
    : buildAutoBrief(sorted);

  const redCards = redArticles.map((a) => renderRedCard(a)).join('');
  const yellowCards = yellowArticles.map((a) => renderYellowCard(a)).join('');
  const trendSection = trends.length > 0 ? renderTrends(trends) : '';
  const mainArticles = renderArticleTable(highArticles);
  const otherArticles = lowArticles.length > 0 ? renderCompactList(lowArticles) : '';

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${esc(subjectLine)}</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,Arial,'맑은 고딕',sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#F3F4F6;">${esc(preheaderText)}</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;">
    <tr><td align="center" style="padding:8px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- HEADER -->
        <tr><td style="background:#1E40AF;padding:20px 24px;">
          <h1 style="margin:0;color:#FFFFFF;font-size:20px;">ACRYL Intelligence Brief</h1>
          <p style="margin:4px 0 0;color:#BFDBFE;font-size:13px;">${esc(date)}</p>
        </td></tr>

        <!-- BLUF -->
        <tr><td style="background:#EFF6FF;padding:20px 24px;border-left:4px solid #1E40AF;">
          <h2 style="margin:0 0 12px;font-size:16px;color:#1E3A5F;">🎯 오늘의 핵심</h2>
          <div style="font-size:14px;line-height:1.8;color:#1F2937;white-space:pre-line;">${esc(briefText)}</div>
        </td></tr>

        <!-- STATS -->
        <tr><td style="background:#FFFFFF;padding:12px 24px;border-bottom:1px solid #E5E7EB;">
          <span style="color:#6B7280;font-size:12px;">📊 ${total}건 · 🔴${redArticles.length} 🟡${yellowArticles.length} 🟢${total - redArticles.length - yellowArticles.length} · 심층 ${deepCount}건</span>
        </td></tr>

        ${redArticles.length > 0 ? `<!-- RED -->
        <tr><td style="background:#FFFFFF;padding:20px 24px;">
          <h2 style="margin:0 0 16px;font-size:16px;color:#DC2626;">🔴 긴급 대응 필요</h2>
          ${redCards}
        </td></tr>` : ''}

        ${yellowArticles.length > 0 ? `<!-- YELLOW -->
        <tr><td style="background:#FFFFFF;padding:20px 24px;border-top:1px solid #E5E7EB;">
          <h2 style="margin:0 0 16px;font-size:16px;color:#D97706;">🟡 주의 관찰</h2>
          ${yellowCards}
        </td></tr>` : ''}

        ${trendSection}

        <!-- MAIN ARTICLES -->
        <tr><td style="background:#F9FAFB;padding:20px 24px;border-top:1px solid #E5E7EB;">
          <h2 style="margin:0 0 16px;font-size:15px;color:#374151;">📋 주요 기사 (${highArticles.length}건)</h2>
          ${mainArticles}
        </td></tr>

        ${otherArticles ? `<!-- OTHER ARTICLES -->
        <tr><td style="background:#F9FAFB;padding:12px 24px;border-top:1px solid #E5E7EB;">
          <h2 style="margin:0 0 8px;font-size:13px;color:#9CA3AF;">📰 기타 기사 (${lowArticles.length}건)</h2>
          ${otherArticles}
        </td></tr>` : ''}

        <!-- FOOTER -->
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

function buildAutoBrief(articles: Article[]): string {
  const sorted = [...articles].sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
  const top5 = sorted.slice(0, 5);
  if (top5.length === 0) return '오늘 수집된 기사가 없습니다.';
  const lines = top5.map((a, i) => {
    const detail = a.impact_comment || a.summary || '';
    return `${i + 1}. [${a.category || '기타'}] ${a.title}\n   ${detail}`;
  });
  return lines.join('\n\n');
}

function renderArticleTable(articles: Article[]): string {
  const sorted = [...articles].sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));

  const cards = sorted.map((a) => {
    const urgencyDot = a.urgency === 'red' ? '🔴' : a.urgency === 'yellow' ? '🟡' : '🟢';
    const urgencyColor = a.urgency === 'red' ? '#DC2626' : a.urgency === 'yellow' ? '#D97706' : '#16A34A';
    const summary = [a.impact_comment, a.summary].filter(Boolean).join(' ');

    return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;background:#FFFFFF;border-radius:6px;border:1px solid #F3F4F6;">
      <tr><td style="padding:12px 14px;">
        <div style="font-size:14px;font-weight:600;color:#1F2937;line-height:1.4;">
          ${urgencyDot} <a href="${esc(a.url)}" style="color:#1F2937;text-decoration:none;">${esc(a.title)}</a>
        </div>
        <div style="margin-top:4px;font-size:12px;color:#6B7280;">
          <span style="color:${urgencyColor};font-weight:600;">${a.relevance_score || '-'}/10</span>
          · ${esc(a.source || '')} · ${esc(a.category || '')}
        </div>
        ${summary ? `<div style="margin-top:6px;font-size:13px;color:#4B5563;line-height:1.6;">${esc(summary)}</div>` : ''}
      </td></tr>
    </table>`;
  }).join('');

  return cards;
}

function renderRedCard(a: Article): string {
  const findings = (a.key_findings || []).map((f) =>
    `<div style="font-size:12px;color:#1D4ED8;">▸ ${esc(f)}</div>`
  ).join('');

  const actions = (a.action_items || []).map((act) =>
    `<div style="font-size:13px;color:#78350F;">${esc(act)}</div>`
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
      <div style="font-size:11px;color:#DC2626;font-weight:bold;">${esc(a.category || '')} · ${a.relevance_score || 0}/10</div>
      <div style="font-size:16px;font-weight:600;color:#1F2937;margin:4px 0;">
        <a href="${esc(a.url)}" style="color:#1F2937;text-decoration:none;">${esc(a.title)}</a>
      </div>
      <div style="font-size:12px;color:#6B7280;">${esc(a.source || '')} · ${esc(a.published_at || '')}</div>
      ${a.deep_summary ? `<div style="font-size:14px;color:#374151;margin-top:8px;line-height:1.6;">${esc(a.deep_summary)}</div>` : ''}
      ${a.impact_comment ? `<div style="font-size:13px;color:#4B5563;margin-top:6px;line-height:1.5;">${esc(a.impact_comment)}</div>` : ''}
      ${findings ? `<div style="margin-top:8px;padding-left:12px;border-left:2px solid #3B82F6;">${findings}</div>` : ''}
      ${actionCard}
    </td></tr>
  </table>`;
}

function renderCompactList(articles: Article[]): string {
  return articles.map((a) =>
    `<div style="padding:4px 0;font-size:12px;line-height:1.5;color:#6B7280;border-bottom:1px solid #F3F4F6;">
      <a href="${esc(a.url)}" style="color:#4B5563;text-decoration:none;">${esc(a.title)}</a> — ${esc(a.source || '')}
    </div>`
  ).join('');
}

function renderYellowCard(a: Article): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="border-left:4px solid #F59E0B;margin-bottom:12px;">
    <tr><td style="padding:10px 16px;">
      <a href="${esc(a.url)}" style="font-size:14px;color:#1F2937;text-decoration:none;font-weight:600;">${esc(a.title)}</a>
      <div style="font-size:12px;color:#6B7280;margin-top:2px;">${esc(a.source || '')} · ${esc(a.category || '')} · ${a.relevance_score || '-'}/10</div>
      ${a.impact_comment ? `<div style="font-size:13px;color:#4B5563;margin-top:4px;line-height:1.5;">${esc(a.impact_comment)}</div>` : ''}
      ${a.summary ? `<div style="font-size:12px;color:#6B7280;margin-top:4px;line-height:1.5;">${esc(a.summary)}</div>` : ''}
    </td></tr>
  </table>`;
}

function renderTrends(trends: Trend[]): string {
  const cards = trends.map((t) => `
    <div style="margin-bottom:12px;padding:10px 16px;background:#F0FDF4;border-left:4px solid #22C55E;">
      <div style="font-size:14px;font-weight:600;color:#166534;">${esc(t.trend_title)} <span style="font-size:11px;color:#6B7280;">(${t.strength})</span></div>
      <div style="font-size:13px;color:#374151;margin-top:4px;line-height:1.5;">${esc(t.trend_description)}</div>
    </div>`
  ).join('');

  return `<tr><td style="background:#FFFFFF;padding:20px 24px;border-top:1px solid #E5E7EB;">
    <h2 style="margin:0 0 16px;font-size:16px;color:#16A34A;">📈 트렌드</h2>
    ${cards}
  </td></tr>`;
}

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
