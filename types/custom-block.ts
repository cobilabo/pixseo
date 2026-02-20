export interface CustomBlock {
  id: string;
  mediaId: string;
  name: string;
  html: string;
  html_en?: string;
  html_zh?: string;
  html_ko?: string;
  css: string;
  createdAt: Date;
  updatedAt: Date;
}
