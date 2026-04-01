import type { Article, Trend, NewsletterData } from '@/lib/types';

export function renderNewsletter(data: NewsletterData): string {
  const { articles, date, executiveBrief, trends, subjectLine, preheaderText } = data;

  const acrylArticles = articles.filter((a) => a.impact_comment === 'ACRYL 자사 관련');
  const external = articles.filter((a) => a.impact_comment !== 'ACRYL 자사 관련');
  const relevant = external.filter((a) => (a.relevance_score || 0) >= 5);
  const diversified = diversifyArticles(relevant);
  const highArticles = diversified.filter((a) => (a.relevance_score || 0) >= 7);
  const lowArticles = diversified.filter((a) => (a.relevance_score || 0) >= 5 && (a.relevance_score || 0) < 7);

  const briefText = executiveBrief && !executiveBrief.includes('오류') && !executiveBrief.includes('시간 초과')
    ? executiveBrief : buildAutoBrief(diversified);

  const redCount = diversified.filter((a) => a.urgency === 'red').length;
  const yellowCount = diversified.filter((a) => a.urgency === 'yellow').length;
  const total = diversified.length;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${esc(subjectLine)}</title>
</head>
<body style="margin:0;padding:0;background:#FFFFFF;font-family:-apple-system,'Segoe UI','Noto Sans KR',sans-serif;color:#202124;">
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#fff;">${esc(preheaderText)}</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;">
    <tr><td align="center" style="padding:0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- HEADER -->
        <tr><td style="padding:20px 20px 12px;">
          <div style="font-size:22px;font-weight:700;color:#1A73E8;">ACRYL Intelligence Brief</div>
          <div style="font-size:13px;color:#5F6368;margin-top:2px;">${esc(date)} · ${total}건 수집 · 🔴${redCount} 🟡${yellowCount}</div>
        </td></tr>

        <!-- DIVIDER -->
        <tr><td style="padding:0 20px;"><div style="border-top:1px solid #DADCE0;"></div></td></tr>

        <!-- BRIEF -->
        <tr><td style="padding:16px 20px;">
          <div style="font-size:12px;font-weight:700;color:#1A73E8;margin-bottom:8px;">📌 오늘의 핵심</div>
          <div style="font-size:14px;line-height:1.8;color:#3C4043;white-space:pre-line;">${esc(briefText)}</div>
        </td></tr>

        <tr><td style="padding:0 20px;"><div style="border-top:1px solid #DADCE0;"></div></td></tr>

        ${highArticles.length > 0 ? `
        <!-- MAIN -->
        <tr><td style="padding:16px 20px 8px;">
          <div style="font-size:12px;font-weight:700;color:#202124;margin-bottom:4px;">주요 뉴스</div>
        </td></tr>
        <tr><td style="padding:0 20px 12px;">
          ${highArticles.map((a) => renderGoogleCard(a)).join('')}
        </td></tr>
        <tr><td style="padding:0 20px;"><div style="border-top:1px solid #DADCE0;"></div></td></tr>` : ''}

        ${lowArticles.length > 0 ? `
        <!-- OTHER -->
        <tr><td style="padding:12px 20px 8px;">
          <div style="font-size:12px;font-weight:600;color:#5F6368;">기타 뉴스</div>
        </td></tr>
        <tr><td style="padding:0 20px 12px;">
          ${lowArticles.map((a) => renderMiniItem(a)).join('')}
        </td></tr>
        <tr><td style="padding:0 20px;"><div style="border-top:1px solid #DADCE0;"></div></td></tr>` : ''}

        ${trends.length > 0 ? renderTrends(trends) : ''}

        ${acrylArticles.length > 0 ? `
        <tr><td style="padding:12px 20px 8px;">
          <div style="font-size:12px;font-weight:600;color:#1A73E8;">🏢 ACRYL 관련</div>
        </td></tr>
        <tr><td style="padding:0 20px 12px;">
          ${acrylArticles.map((a) => renderMiniItem(a)).join('')}
        </td></tr>` : ''}

        <!-- FOOTER -->
        <tr><td style="padding:20px;text-align:center;">
          <div style="font-size:11px;color:#9AA0A6;line-height:1.6;">
            ACRYL Intelligence Brief · Powered by Claude AI<br>
            본 브리프는 AI 자동 분석 결과이며 투자 조언이 아닙니다.
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function renderGoogleCard(a: Article): string {
  const catLabel = getCatLabel(a.category || '');
  const urgencyColor = a.urgency === 'red' ? '#D93025' : a.urgency === 'yellow' ? '#EA8600' : '#5F6368';
  const impact = a.impact_comment && a.impact_comment !== '일반 기술 뉴스' ? a.impact_comment : '';
  const summary = a.summary || '';
  const title = a.title;
  const isEng = isEnglish(title);

  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
    <tr><td>
      <!-- 출처 라인 -->
      <div style="font-size:12px;color:#5F6368;margin-bottom:4px;">
        ${esc(a.source || '')}
        <span style="color:${urgencyColor};font-weight:600;margin-left:6px;">${a.relevance_score}/10</span>
        <span style="color:#5F6368;margin-left:4px;">${esc(catLabel)}</span>
        ${a.published_at ? `<span style="color:#9AA0A6;margin-left:4px;">${esc(a.published_at)}</span>` : ''}
      </div>
      <!-- 제목 -->
      <div style="margin-bottom:4px;">
        <a href="${esc(a.url)}" style="font-size:16px;font-weight:400;color:#1A0DAB;text-decoration:none;line-height:1.4;">${esc(title)}</a>
      </div>
      ${isEng ? `<div style="font-size:13px;color:#70757A;margin-bottom:4px;font-style:italic;">→ 영문 기사</div>` : ''}
      <!-- 시사점 -->
      ${impact ? `<div style="font-size:13px;color:${urgencyColor};margin-bottom:4px;">💡 ${esc(impact)}</div>` : ''}
      <!-- 내용 -->
      ${summary ? `<div style="font-size:14px;color:#4D5156;line-height:1.6;">${esc(summary.length > 250 ? summary.slice(0, 250) + '…' : summary)}</div>` : ''}
    </td></tr>
  </table>`;
}

function renderMiniItem(a: Article): string {
  const title = a.title;
  const summary = a.summary || '';
  const shortSummary = summary.length > 120 ? summary.slice(0, 120) + '…' : summary;

  return `<div style="padding:8px 0;border-bottom:1px solid #F1F3F4;">
    <div style="margin-bottom:2px;">
      <a href="${esc(a.url)}" style="font-size:14px;color:#1A0DAB;text-decoration:none;">${esc(title)}</a>
    </div>
    <div style="font-size:12px;color:#5F6368;">${esc(a.source || '')} · ${a.relevance_score || '-'}/10</div>
    ${shortSummary ? `<div style="font-size:13px;color:#4D5156;margin-top:2px;line-height:1.5;">${esc(shortSummary)}</div>` : ''}
  </div>`;
}

function renderTrends(trends: Trend[]): string {
  const items = trends.map((t) =>
    `<div style="padding:8px 0;border-bottom:1px solid #F1F3F4;">
      <div style="font-size:14px;font-weight:500;color:#202124;">${esc(t.trend_title)}</div>
      <div style="font-size:13px;color:#4D5156;margin-top:2px;line-height:1.5;">${esc(t.trend_description)}</div>
    </div>`
  ).join('');

  return `<tr><td style="padding:12px 20px 8px;">
    <div style="font-size:12px;font-weight:600;color:#188038;">📈 트렌드</div>
  </td></tr>
  <tr><td style="padding:0 20px 12px;">${items}</td></tr>
  <tr><td style="padding:0 20px;"><div style="border-top:1px solid #DADCE0;"></div></td></tr>`;
}

// === 유틸 ===

function isEnglish(text: string): boolean {
  const letters = text.replace(/[^a-zA-Z가-힣]/g, '');
  if (letters.length === 0) return false;
  const eng = letters.replace(/[^a-zA-Z]/g, '').length;
  return eng > letters.length * 0.5;
}

function diversifyArticles(articles: Article[]): Article[] {
  const sorted = [...articles].sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
  const count: Record<string, number> = {};
  return sorted.filter((a) => {
    const cat = a.category || 'tech';
    count[cat] = (count[cat] || 0) + 1;
    return count[cat] <= 5;
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
  for (const [cat, arts] of Object.entries(categories)) {
    for (const a of arts.slice(0, 2)) {
      const label = getCatLabel(cat);
      const detail = a.impact_comment || a.summary || '';
      const text = detail.length > 120 ? detail.slice(0, 120) + '…' : detail;
      sections.push(`${idx}. [${label}] ${a.title}\n   ${text}`);
      idx++;
      if (idx > 8) break;
    }
    if (idx > 8) break;
  }
  return sections.join('\n\n');
}

function getCatLabel(cat: string): string {
  return { competitive: '경쟁', market: '시장', tech: '기술', regulation: '정책', investment: '투자', customer: '파트너' }[cat] || cat;
}

function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
