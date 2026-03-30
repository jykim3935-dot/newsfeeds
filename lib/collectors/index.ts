import type { Collector } from './base';
import { rssCollector } from './rss';
import { websearchCollector } from './websearch';
import { govCollector } from './gov';
import { researchCollector } from './research';
import { dartCollector } from './dart';

export const collectors: Collector[] = [
  rssCollector,
  websearchCollector,
  dartCollector,
  govCollector,
  researchCollector,
];

export type { Collector } from './base';
