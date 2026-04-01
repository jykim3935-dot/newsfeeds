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
<body style="margin:0;padding:0;background:#F4F5F7;font-family:-apple-system,'Segoe UI','Noto Sans KR',sans-serif;color:#1A1A1A;">
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#F4F5F7;">${esc(preheaderText)}</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F5F7;">
    <tr><td align="center" style="padding:16px 10px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">

        <!-- HEADER CARD -->
        <tr><td style="background:#1A2744;padding:24px;border-radius:16px 16px 0 0;">
          <div style="font-size:24px;font-weight:800;color:#FFFFFF;letter-spacing:-0.5px;">ACRYL Intelligence Brief</div>
          <div style="font-size:13px;color:#8B9DC3;margin-top:6px;">${esc(date)}</div>
          <table cellpadding="0" cellspacing="0" style="margin-top:12px;">
            <tr>
              <td style="padding:4px 10px;background:rgba(255,255,255,0.12);border-radius:20px;margin-right:6px;">
                <span style="font-size:12px;color:#fff;">📊 ${total}건</span>
              </td>
              <td style="padding:4px 10px;background:rgba(239,68,68,0.2);border-radius:20px;margin-left:4px;">
                <span style="font-size:12px;color:#FCA5A5;">🔴 ${redCount}</span>
              </td>
              <td style="padding:4px 10px;background:rgba(245,158,11,0.2);border-radius:20px;margin-left:4px;">
                <span style="font-size:12px;color:#FCD34D;">🟡 ${yellowCount}</span>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- BRIEF CARD -->
        <tr><td style="padding:0 0 12px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:0 0 16px 16px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
            <tr><td style="padding:20px 24px;">
              <div style="font-size:11px;font-weight:700;color:#6366F1;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">📌 오늘의 핵심</div>
              <div style="font-size:14px;line-height:2;color:#374151;white-space:pre-line;">${esc(briefText)}</div>
            </td></tr>
          </table>
        </td></tr>

        ${highArticles.length > 0 ? `
        <!-- MAIN ARTICLES CARD -->
        <tr><td style="padding:0 0 12px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
            <tr><td style="padding:20px 24px 8px;">
              <div style="font-size:11px;font-weight:700;color:#1A2744;text-transform:uppercase;letter-spacing:1px;">📰 주요 뉴스 (${highArticles.length})</div>
            </td></tr>
            <tr><td style="padding:0 16px 16px;">
              ${highArticles.map((a) => renderCard(a)).join('')}
            </td></tr>
          </table>
        </td></tr>` : ''}

        ${lowArticles.length > 0 ? `
        <!-- OTHER ARTICLES CARD -->
        <tr><td style="padding:0 0 12px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
            <tr><td style="padding:20px 24px 8px;">
              <div style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:1px;">기타 뉴스 (${lowArticles.length})</div>
            </td></tr>
            <tr><td style="padding:0 16px 16px;">
              ${lowArticles.map((a) => renderMini(a)).join('')}
            </td></tr>
          </table>
        </td></tr>` : ''}

        ${trends.length > 0 ? `
        <!-- TRENDS CARD -->
        <tr><td style="padding:0 0 12px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
            <tr><td style="padding:20px 24px 8px;">
              <div style="font-size:11px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:1px;">📈 트렌드</div>
            </td></tr>
            <tr><td style="padding:0 16px 16px;">
              ${trends.map((t) => renderTrend(t)).join('')}
            </td></tr>
          </table>
        </td></tr>` : ''}

        ${acrylArticles.length > 0 ? `
        <!-- ACRYL CARD -->
        <tr><td style="padding:0 0 12px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F4FF;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
            <tr><td style="padding:20px 24px 8px;">
              <div style="font-size:11px;font-weight:700;color:#3B5998;text-transform:uppercase;letter-spacing:1px;">🏢 ACRYL 관련 (${acrylArticles.length})</div>
            </td></tr>
            <tr><td style="padding:0 16px 16px;">
              ${acrylArticles.map((a) => renderMini(a)).join('')}
            </td></tr>
          </table>
        </td></tr>` : ''}

        <!-- FOOTER -->
        <tr><td style="padding:8px 20px 20px;text-align:center;">
          <div style="font-size:11px;color:#9CA3AF;line-height:1.6;">
            ACRYL Intelligence Brief v3 · Powered by Claude AI<br>
            본 브리프는 AI 자동 분석 결과이며 투자 조언이 아닙니다.
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function renderCard(a: Article): string {
  const urgencyBg = a.urgency === 'red' ? '#FEF2F2' : a.urgency === 'yellow' ? '#FFFBEB' : '#F9FAFB';
  const urgencyColor = a.urgency === 'red' ? '#EF4444' : a.urgency === 'yellow' ? '#F59E0B' : '#9CA3AF';
  const urgencyText = a.urgency === 'red' ? '긴급' : a.urgency === 'yellow' ? '주의' : '참고';
  const catLabel = getCatLabel(a.category || '');
  const impact = a.impact_comment && a.impact_comment !== '일반 기술 뉴스' ? a.impact_comment : '';
  const summary = a.summary || '';
  const isEng = isEnglish(a.title);

  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;background:${urgencyBg};">
    <tr><td style="padding:16px;">
      <!-- 태그 라인 -->
      <table cellpadding="0" cellspacing="0" style="margin-bottom:10px;"><tr>
        <td style="padding:3px 10px;background:${urgencyColor};border-radius:6px;">
          <span style="font-size:11px;font-weight:700;color:#FFF;">${urgencyText}</span>
        </td>
        <td style="padding:3px 10px;background:#E5E7EB;border-radius:6px;margin-left:6px;">
          <span style="font-size:11px;font-weight:600;color:#374151;">${esc(catLabel)}</span>
        </td>
        <td style="padding-left:8px;">
          <span style="font-size:13px;font-weight:800;color:${urgencyColor};">${a.relevance_score}/10</span>
        </td>
      </tr></table>

      <!-- 제목 -->
      <a href="${esc(a.url)}" style="font-size:16px;font-weight:600;color:#111827;text-decoration:none;line-height:1.5;display:block;margin-bottom:6px;">${esc(a.title)}</a>
      ${isEng ? `<div style="font-size:12px;color:#6366F1;margin-bottom:6px;">🌐 영문 기사</div>` : ''}

      <!-- 출처 -->
      <div style="font-size:12px;color:#9CA3AF;margin-bottom:10px;">${esc(a.source || '')}${a.published_at ? ` · ${esc(a.published_at)}` : ''}</div>

      <!-- 시사점 -->
      ${impact ? `<div style="font-size:13px;font-weight:600;color:${urgencyColor};margin-bottom:8px;">💡 ${esc(impact)}</div>` : ''}

      <!-- 요약 박스 -->
      ${summary ? `<table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="padding:12px 14px;background:#FFFFFF;border-radius:10px;border:1px solid #F3F4F6;">
          <div style="font-size:13px;color:#4B5563;line-height:1.7;">${esc(summary.length > 280 ? summary.slice(0, 280) + '…' : summary)}</div>
        </td>
      </tr></table>` : ''}
    </td></tr>
  </table>`;
}

function renderMini(a: Article): string {
  const summary = a.summary || '';
  const short = summary.length > 100 ? summary.slice(0, 100) + '…' : summary;

  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0;border-radius:10px;overflow:hidden;border:1px solid #F3F4F6;background:#FAFAFA;">
    <tr><td style="padding:12px 14px;">
      <a href="${esc(a.url)}" style="font-size:14px;font-weight:500;color:#111827;text-decoration:none;line-height:1.4;display:block;">${esc(a.title)}</a>
      <div style="font-size:12px;color:#9CA3AF;margin-top:4px;">
        ${esc(a.source || '')} · ${esc(getCatLabel(a.category || ''))} · ${a.relevance_score || '-'}/10
      </div>
      ${short ? `<div style="font-size:13px;color:#6B7280;margin-top:6px;line-height:1.5;">${esc(short)}</div>` : ''}
    </td></tr>
  </table>`;
}

function renderTrend(t: Trend): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0;border-radius:10px;background:#ECFDF5;border:1px solid #D1FAE5;">
    <tr><td style="padding:12px 14px;">
      <div style="font-size:14px;font-weight:600;color:#065F46;margin-bottom:4px;">${esc(t.trend_title)}</div>
      <div style="font-size:13px;color:#374151;line-height:1.5;">${esc(t.trend_description)}</div>
    </td></tr>
  </table>`;
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
