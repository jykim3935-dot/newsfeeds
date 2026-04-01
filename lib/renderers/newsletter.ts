import type { Article, Trend, NewsletterData } from '@/lib/types';

export function renderNewsletter(data: NewsletterData): string {
  const { articles, date, executiveBrief, trends, subjectLine, preheaderText } = data;

  const acrylArticles = articles.filter((a) => a.impact_comment === 'ACRYL 자사 관련');
  const external = articles.filter((a) => a.impact_comment !== 'ACRYL 자사 관련');
  const relevant = external.filter((a) => (a.relevance_score || 0) >= 5);
  const diversified = diversifyArticles(relevant);

  const highArticles = diversified.filter((a) => (a.relevance_score || 0) >= 7);
  const lowArticles = diversified.filter((a) => (a.relevance_score || 0) >= 5 && (a.relevance_score || 0) < 7);
  const total = diversified.length;

  const briefText = executiveBrief && !executiveBrief.includes('오류') && !executiveBrief.includes('시간 초과')
    ? executiveBrief : buildAutoBrief(diversified);

  const mainCards = highArticles.map((a) => renderCard(a)).join('');
  const otherCards = lowArticles.map((a) => renderMiniCard(a)).join('');
  const trendSection = trends.length > 0 ? renderTrends(trends) : '';
  const acrylSection = acrylArticles.length > 0 ? renderAcrylSection(acrylArticles) : '';

  // 통계
  const redCount = diversified.filter((a) => a.urgency === 'red').length;
  const yellowCount = diversified.filter((a) => a.urgency === 'yellow').length;
  const greenCount = total - redCount - yellowCount;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${esc(subjectLine)}</title>
</head>
<body style="margin:0;padding:0;background:#F0F2F5;font-family:-apple-system,'Segoe UI','Noto Sans KR',sans-serif;-webkit-text-size-adjust:100%;color:#1A1A1A;">
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#F0F2F5;">${esc(preheaderText)}</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F2F5;">
    <tr><td align="center" style="padding:12px 8px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;width:100%;">

        <!-- HEADER -->
        <tr><td style="background:#1E40AF;padding:20px;border-radius:12px 12px 0 0;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td><h1 style="margin:0;color:#FFFFFF;font-size:18px;font-weight:700;">ACRYL Intelligence Brief</h1></td>
            </tr>
            <tr><td style="padding-top:4px;">
              <span style="color:#93C5FD;font-size:12px;">${esc(date)}</span>
              <span style="color:#60A5FA;font-size:12px;margin-left:8px;">📊 ${total}건 · 🔴${redCount} 🟡${yellowCount} 🟢${greenCount}</span>
            </td></tr>
          </table>
        </td></tr>

        <!-- BRIEF -->
        <tr><td style="background:#FFFFFF;padding:20px;border-bottom:1px solid #E5E7EB;">
          <div style="font-size:13px;font-weight:700;color:#1E40AF;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px;">오늘의 핵심</div>
          <div style="font-size:14px;line-height:1.8;color:#374151;white-space:pre-line;">${esc(briefText)}</div>
        </td></tr>

        ${highArticles.length > 0 ? `
        <!-- MAIN ARTICLES -->
        <tr><td style="background:#FFFFFF;padding:16px 20px 4px;">
          <div style="font-size:13px;font-weight:700;color:#374151;margin-bottom:12px;text-transform:uppercase;letter-spacing:0.5px;">📌 주요 기사 (${highArticles.length})</div>
        </td></tr>
        <tr><td style="background:#FFFFFF;padding:0 20px 16px;">
          ${mainCards}
        </td></tr>` : ''}

        ${otherCards ? `
        <!-- OTHER -->
        <tr><td style="background:#F9FAFB;padding:16px 20px 4px;border-top:1px solid #E5E7EB;">
          <div style="font-size:12px;font-weight:600;color:#9CA3AF;margin-bottom:8px;">기타 참고 (${lowArticles.length})</div>
        </td></tr>
        <tr><td style="background:#F9FAFB;padding:0 20px 16px;">
          ${otherCards}
        </td></tr>` : ''}

        ${trendSection}
        ${acrylSection}

        <!-- FOOTER -->
        <tr><td style="padding:16px 20px;text-align:center;border-radius:0 0 12px 12px;background:#F9FAFB;">
          <p style="font-size:11px;color:#9CA3AF;margin:0;line-height:1.6;">
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

// === 카드 렌더링 ===

function renderCard(a: Article): string {
  const urgencyBg = a.urgency === 'red' ? '#FEF2F2' : a.urgency === 'yellow' ? '#FFFBEB' : '#F9FAFB';
  const urgencyColor = a.urgency === 'red' ? '#DC2626' : a.urgency === 'yellow' ? '#D97706' : '#6B7280';
  const urgencyLabel = a.urgency === 'red' ? '긴급' : a.urgency === 'yellow' ? '주의' : '참고';
  const catLabel = getCatLabel(a.category || '');
  const impact = a.impact_comment && a.impact_comment !== '일반 기술 뉴스' ? a.impact_comment : '';
  const summary = a.summary || '';

  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;border-radius:10px;overflow:hidden;border:1px solid #E5E7EB;">
    <tr><td style="padding:14px 16px;background:${urgencyBg};">
      <!-- 태그 -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
        <tr>
          <td>
            <span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;color:#FFF;background:${urgencyColor};">${urgencyLabel}</span>
            <span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:500;color:#374151;background:#E5E7EB;margin-left:4px;">${esc(catLabel)}</span>
          </td>
          <td align="right" style="font-size:12px;font-weight:700;color:${urgencyColor};">${a.relevance_score || '-'}/10</td>
        </tr>
      </table>
      <!-- 제목 -->
      <div style="font-size:15px;font-weight:600;color:#111;line-height:1.5;margin-bottom:4px;">
        <a href="${esc(a.url)}" style="color:#111;text-decoration:none;">${esc(a.title)}</a>
      </div>
      <!-- 출처 -->
      <div style="font-size:12px;color:#9CA3AF;margin-bottom:6px;">${esc(a.source || '')} · ${esc(a.published_at || '')}</div>
      <!-- 시사점 -->
      ${impact ? `<div style="font-size:12px;color:${urgencyColor};font-weight:600;margin-bottom:6px;">💡 ${esc(impact)}</div>` : ''}
      <!-- 기사 내용 -->
      ${summary ? `<div style="font-size:13px;color:#4B5563;line-height:1.7;background:#FFFFFF;padding:10px 12px;border-radius:6px;">${esc(summary.length > 300 ? summary.slice(0, 300) + '…' : summary)}</div>` : ''}
    </td></tr>
  </table>`;
}

function renderMiniCard(a: Article): string {
  const catLabel = getCatLabel(a.category || '');
  const summary = a.summary || '';
  const shortSummary = summary.length > 150 ? summary.slice(0, 150) + '…' : summary;
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:6px;">
    <tr><td style="padding:10px 12px;background:#FFFFFF;border-radius:8px;border:1px solid #F3F4F6;">
      <div style="font-size:13px;font-weight:500;color:#1F2937;line-height:1.4;">
        <a href="${esc(a.url)}" style="color:#1F2937;text-decoration:none;">${esc(a.title)}</a>
      </div>
      <div style="font-size:11px;color:#9CA3AF;margin-top:3px;">
        <span style="color:#6B7280;font-weight:500;">${esc(catLabel)}</span> · ${esc(a.source || '')} · ${a.relevance_score || '-'}/10
      </div>
      ${shortSummary ? `<div style="font-size:12px;color:#6B7280;margin-top:5px;line-height:1.5;">${esc(shortSummary)}</div>` : ''}
    </td></tr>
  </table>`;
}

function renderAcrylSection(articles: Article[]): string {
  const items = articles.map((a) =>
    `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:4px;">
      <tr><td style="padding:6px 12px;background:#EFF6FF;border-radius:6px;">
        <a href="${esc(a.url)}" style="color:#1E40AF;text-decoration:none;font-size:13px;font-weight:500;">${esc(a.title)}</a>
        <span style="font-size:11px;color:#6B7280;margin-left:6px;">${esc(a.source || '')}</span>
      </td></tr>
    </table>`
  ).join('');

  return `<tr><td style="background:#F9FAFB;padding:16px 20px;border-top:1px solid #E5E7EB;">
    <div style="font-size:12px;font-weight:600;color:#1E40AF;margin-bottom:8px;">🏢 ACRYL 자사 관련 (${articles.length})</div>
    ${items}
  </td></tr>`;
}

function renderTrends(trends: Trend[]): string {
  const cards = trends.map((t) =>
    `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
      <tr><td style="padding:12px 14px;background:#F0FDF4;border-radius:8px;">
        <div style="font-size:14px;font-weight:600;color:#166534;margin-bottom:4px;">${esc(t.trend_title)}</div>
        <div style="font-size:12px;color:#4B5563;line-height:1.5;">${esc(t.trend_description)}</div>
      </td></tr>
    </table>`
  ).join('');

  return `<tr><td style="background:#FFFFFF;padding:16px 20px;border-top:1px solid #E5E7EB;">
    <div style="font-size:13px;font-weight:700;color:#16A34A;margin-bottom:12px;text-transform:uppercase;letter-spacing:0.5px;">📈 트렌드</div>
    ${cards}
  </td></tr>`;
}

// === 유틸 ===

function diversifyArticles(articles: Article[]): Article[] {
  const sorted = [...articles].sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
  const categoryCount: Record<string, number> = {};
  return sorted.filter((a) => {
    const cat = a.category || 'tech';
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    return categoryCount[cat] <= 5;
  });
}

function buildAutoBrief(articles: Article[]): string {
  if (articles.length === 0) return '오늘 수집된 기사가 없습니다.';

  const categories: Record<string, Article[]> = {};
  for (const a of articles) {
    const cat = a.category || 'tech';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(a);
  }

  const sections: string[] = [];
  let idx = 1;
  for (const [cat, catArticles] of Object.entries(categories)) {
    const top = catArticles.slice(0, 2);
    const label = getCatLabel(cat);
    for (const a of top) {
      const summary = a.impact_comment || a.summary || '';
      const text = summary.length > 150 ? summary.slice(0, 150) + '…' : summary;
      sections.push(`${idx}. [${label}] ${a.title}\n   ${text}`);
      idx++;
      if (idx > 8) break;
    }
    if (idx > 8) break;
  }
  return sections.join('\n\n');
}

function getCatLabel(cat: string): string {
  const labels: Record<string, string> = {
    competitive: '경쟁', market: '시장', tech: '기술',
    regulation: '정책', investment: '투자', customer: '파트너',
  };
  return labels[cat] || cat;
}

function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
