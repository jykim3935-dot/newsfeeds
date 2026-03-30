import type { CollectedArticle } from '@/lib/types';
import type { Collector } from './base';
import { logger } from '@/lib/utils/logger';

export const dartCollector: Collector = {
  name: 'dart',
  async collect(batchId: string): Promise<CollectedArticle[]> {
    const apiKey = process.env.DART_API_KEY;
    if (!apiKey) {
      logger.warn('dart', 'DART_API_KEY not set, skipping DART collection');
      return [];
    }

    try {
      const corps = ['아크릴', '제논', '마인즈앤컴퍼니'];
      const results: CollectedArticle[] = [];

      for (const corp of corps) {
        const url = `https://opendart.fss.or.kr/api/list.json?crtfc_key=${apiKey}&corp_name=${encodeURIComponent(corp)}&page_count=5&sort=date&sort_mth=desc`;

        const res = await fetch(url);
        if (!res.ok) continue;

        const data = await res.json();
        if (data.status !== '000' || !data.list) continue;

        for (const item of data.list) {
          results.push({
            title: `[공시] ${item.corp_name}: ${item.report_nm}`,
            url: `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${item.rcept_no}`,
            source: 'DART',
            content_type: 'investment',
            published_at: item.rcept_dt ? `${item.rcept_dt.slice(0,4)}-${item.rcept_dt.slice(4,6)}-${item.rcept_dt.slice(6,8)}` : null,
            summary: `${item.corp_name}의 ${item.report_nm} 공시`,
            matched_keywords: [corp],
            batch_id: batchId,
          });
        }
      }

      logger.info('dart', `Collected ${results.length} DART filings`);
      return results;
    } catch (err) {
      logger.error('dart', `DART collection failed: ${err instanceof Error ? err.message : String(err)}`);
      return [];
    }
  },
};
