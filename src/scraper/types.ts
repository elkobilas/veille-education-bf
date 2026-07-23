export interface ScrapedItem {
  title: string;
  url: string;
  publishedAt: Date | null;
  rawContent: string | null;
  metadata?: Record<string, unknown>;
}

export interface CommuniqueNotification {
  title: string;
  url: string;
  summary: string;
  targetAudience: string;
  importantDates: string;
  requiredDocs: string;
  publishedAt: string;
  sourceName: string;
}
