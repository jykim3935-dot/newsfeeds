import type { Collector } from './base';
import { rssCollector } from './rss';
import { googlenewsCollector } from './googlenews';
import { websearchCollector } from './websearch';
import { govCollector } from './gov';
import { researchCollector } from './research';
import { dartCollector } from './dart';

export const collectors: Collector[] = [
  rssCollector,         // RSS 피드 (빠름, 무료)
  googlenewsCollector,  // Google News 키워드 검색 (빠름, 무료)
  websearchCollector,   // Claude 웹검색 (실제 검색, P1만)
  dartCollector,        // DART 공시
  govCollector,         // 정부 정책
  researchCollector,    // 학술 논문
];

export type { Collector } from './base';
