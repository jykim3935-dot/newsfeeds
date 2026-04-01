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
  const greenCount = diversified.length - redCount - yellowCount;

  const S = styles;

  return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${esc(subjectLine)}</title></head>
<body style="margin:0;padding:0;background:#E8E8E8;font-family:'Segoe UI',-apple-system,'Noto Sans KR',sans-serif;font-size:13px;color:#222;">
<div style="display:none;max-height:0;overflow:hidden;">${esc(preheaderText)}</div>
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:12px 6px;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#F0F0F0;">

  <!-- HEADER BAR -->
  <tr><td style="${S.header}">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="font-size:16px;font-weight:700;color:#fff;">ACRYL Intelligence Brief</td>
      <td style="text-align:right;font-size:12px;color:#B0C4DE;">${esc(date)}</td>
    </tr></table>
  </td></tr>

  <!-- STAT BOXES -->
  <tr><td style="padding:8px;">
    <table width="100%" cellpadding="0" cellspacing="6"><tr>
      <td style="${S.statBox}"><div style="font-size:22px;font-weight:700;">${diversified.length}</div><div style="font-size:11px;color:#666;">수집 기사</div></td>
      <td style="${S.statBox}"><div style="font-size:22px;font-weight:700;color:#D32F2F;">${redCount}</div><div style="font-size:11px;color:#666;">🔴 긴급</div></td>
      <td style="${S.statBox}"><div style="font-size:22px;font-weight:700;color:#F57C00;">${yellowCount}</div><div style="font-size:11px;color:#666;">🟡 주의</div></td>
      <td style="${S.statBox}"><div style="font-size:22px;font-weight:700;color:#388E3C;">${greenCount}</div><div style="font-size:11px;color:#666;">🟢 참고</div></td>
    </tr></table>
  </td></tr>

  <!-- BRIEF SECTION -->
  <tr><td style="padding:0 8px 8px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="${S.section}">
      <tr><td style="${S.sectionHead}">오늘의 핵심</td></tr>
      <tr><td style="padding:10px 12px;font-size:13px;line-height:1.8;color:#333;white-space:pre-line;">${esc(briefText)}</td></tr>
    </table>
  </td></tr>

  ${highArticles.length > 0 ? `
  <!-- MAIN ARTICLES -->
  <tr><td style="padding:0 8px 8px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="${S.section}">
      <tr><td style="${S.sectionHead}">주요 기사 (${highArticles.length}건)</td></tr>
      <tr><td style="padding:4px;">
        ${highArticles.map((a) => renderRow(a)).join('')}
      </td></tr>
    </table>
  </td></tr>` : ''}

  ${lowArticles.length > 0 ? `
  <!-- OTHER ARTICLES -->
  <tr><td style="padding:0 8px 8px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="${S.section}">
      <tr><td style="${S.sectionHead}; color:#666;">기타 뉴스 (${lowArticles.length}건)</td></tr>
      <tr><td style="padding:4px;">
        ${lowArticles.map((a) => renderCompact(a)).join('')}
      </td></tr>
    </table>
  </td></tr>` : ''}

  ${trends.length > 0 ? `
  <tr><td style="padding:0 8px 8px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="${S.section}">
      <tr><td style="${S.sectionHead}; color:#2E7D32;">📈 트렌드</td></tr>
      <tr><td style="padding:4px;">
        ${trends.map((t) => `<div style="padding:6px 10px;border-bottom:1px solid #E0E0E0;">
          <span style="font-weight:600;">${esc(t.trend_title)}</span>
          <div style="font-size:12px;color:#555;margin-top:2px;">${esc(t.trend_description)}</div>
        </div>`).join('')}
      </td></tr>
    </table>
  </td></tr>` : ''}

  ${acrylArticles.length > 0 ? `
  <tr><td style="padding:0 8px 8px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="${S.section}">
      <tr><td style="${S.sectionHead}; background:#E3F2FD; color:#1565C0;">🏢 ACRYL 관련 (${acrylArticles.length})</td></tr>
      <tr><td style="padding:4px;">
        ${acrylArticles.map((a) => renderCompact(a)).join('')}
      </td></tr>
    </table>
  </td></tr>` : ''}

  <!-- FOOTER -->
  <tr><td style="padding:8px;text-align:center;font-size:11px;color:#999;">
    ACRYL Intelligence Brief v3 · Powered by Claude AI · 투자 조언 아님
  </td></tr>

</table>
</td></tr></table>
</body></html>`;
}

// === 스타일 상수 ===
const styles = {
  header: 'background:#1B2A4A;padding:12px 16px;',
  statBox: 'background:#FFF;border:1px solid #CCC;padding:10px;text-align:center;width:25%;',
  section: 'background:#FFF;border:1px solid #BBB;',
  sectionHead: 'padding:6px 12px;background:#E8E8E8;border-bottom:1px solid #BBB;font-size:12px;font-weight:700;color:#333;',
};

// === 기사 행 렌더링 ===

function renderRow(a: Article): string {
  const dot = a.urgency === 'red' ? '🔴' : a.urgency === 'yellow' ? '🟡' : '🟢';
  const scoreColor = a.urgency === 'red' ? '#D32F2F' : a.urgency === 'yellow' ? '#F57C00' : '#666';
  const cat = getCatLabel(a.category || '');
  const impact = a.impact_comment && a.impact_comment !== '일반 기술 뉴스' ? a.impact_comment : '';
  const summary = a.summary || '';
  const isEng = isEnglish(a.title);

  return `<table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #E0E0E0;">
    <tr><td style="padding:10px 10px 4px;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="font-size:12px;">
          ${dot} <span style="color:#888;">${esc(cat)}</span>
        </td>
        <td style="text-align:right;font-size:11px;color:#999;">${esc(a.source || '')} · ${esc(a.published_at || '')}</td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:2px 10px;">
      <!-- 제목 -->
      <a href="${esc(a.url)}" style="font-size:14px;font-weight:600;color:#1A0DAB;text-decoration:none;line-height:1.5;">${esc(a.title)}</a>
      ${isEng ? ' <span style="font-size:11px;color:#7B1FA2;">[EN]</span>' : ''}
    </td></tr>
    ${impact ? `<tr><td style="padding:2px 10px;">
      <span style="font-size:12px;color:${scoreColor};font-weight:600;">💡 ${esc(impact)}</span>
    </td></tr>` : ''}
    ${summary ? `<tr><td style="padding:4px 10px 10px;">
      <div style="font-size:12px;color:#555;line-height:1.6;background:#FAFAFA;border:1px solid #EEE;padding:8px 10px;">${esc(summary.length > 250 ? summary.slice(0, 250) + '…' : summary)}</div>
    </td></tr>` : `<tr><td style="padding:0 0 6px;"></td></tr>`}
  </table>`;
}

function renderCompact(a: Article): string {
  const dot = a.urgency === 'red' ? '🔴' : a.urgency === 'yellow' ? '🟡' : '🟢';
  const summary = a.summary || '';
  const short = summary.length > 100 ? summary.slice(0, 100) + '…' : summary;

  return `<div style="padding:6px 10px;border-bottom:1px solid #EEE;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td>
        ${dot} <a href="${esc(a.url)}" style="font-size:13px;color:#1A0DAB;text-decoration:none;font-weight:500;">${esc(a.title)}</a>
        ${isEnglish(a.title) ? ' <span style="font-size:10px;color:#7B1FA2;">[EN]</span>' : ''}
      </td>
      <td style="text-align:right;white-space:nowrap;font-size:11px;color:#999;padding-left:8px;">${esc(a.published_at || '')}</td>
    </tr></table>
    <div style="font-size:11px;color:#888;margin-top:1px;">${esc(a.source || '')} · ${esc(getCatLabel(a.category || ''))}</div>
    ${short ? `<div style="font-size:12px;color:#666;margin-top:3px;line-height:1.5;">${esc(short)}</div>` : ''}
  </div>`;
}

// === 유틸 ===

function isEnglish(text: string): boolean {
  const letters = text.replace(/[^a-zA-Z가-힣]/g, '');
  if (letters.length === 0) return false;
  return letters.replace(/[^a-zA-Z]/g, '').length > letters.length * 0.5;
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
