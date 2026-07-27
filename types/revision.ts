import { Page } from './page';
import { CustomBlock } from './custom-block';

export const REVISION_KEEP_COUNT = 20;

export interface RevisionMeta {
  id: string;
  createdAt: Date;
  createdByUid?: string;
  createdByEmail?: string;
  label?: string;
}

export interface PageRevision extends RevisionMeta {
  snapshot: Omit<Page, 'id'>;
}

export interface CustomBlockRevision extends RevisionMeta {
  snapshot: Omit<CustomBlock, 'id'>;
}

export type RevisionEntityType = 'page' | 'customBlock';
