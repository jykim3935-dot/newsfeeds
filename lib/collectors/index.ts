import type { Collector } from './base';
import { rssCollector } from './rss';
import { googlenewsCollector } from './googlenews';
import { naverSearchCollector } from './naver-search';
import { arxivCollector } from './arxiv';
import { dartCollector } from './dart';

export const collectors: Collector[] = [
  rssCollector,           // RSS 피드 (62개 소스, 병렬, 무료)
  googlenewsCollector,    // Google News RSS 검색 (키워드별, 무료)
  naverSearchCollector,   // Naver 뉴스 검색 API (한국 뉴스 최적, 무료)
  arxivCollector,         // arXiv API (실제 논문, 무료)
  dartCollector,          // DART 공시 API
  // 삭제: websearch (Claude 할루시네이션), gov (동일), research (동일)
];

export type { Collector } from './base';
