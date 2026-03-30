import type { CollectedArticle } from '@/lib/types';

export interface Collector {
  name: string;
  collect(batchId: string): Promise<CollectedArticle[]>;
}
