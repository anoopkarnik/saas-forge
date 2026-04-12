export type SeoCheckStatus = "pass" | "fail" | "warn";

export type SeoCheckCategory =
  | "meta"
  | "og"
  | "technical"
  | "headings"
  | "performance";

export interface SeoCheckResult {
  id: string;
  label: string;
  status: SeoCheckStatus;
  detail: string;
  category: SeoCheckCategory;
}

export interface PageAuditResult {
  url: string;
  path: string;
  score: number;
  checks: SeoCheckResult[];
}

export interface SeoAuditResponse {
  pages: PageAuditResult[];
  overallScore: number;
  timestamp: string;
}

export interface TrafficOverview {
  sessions: number;
  pageViews: number;
  bounceRate: number;
  newUsers: number;
  totalUsers: number;
  engagementRate: number;
  avgSessionDuration: number;
  screenPageViewsPerSession: number;
}

export interface TopPage {
  pagePath: string;
  screenPageViews: number;
  bounceRate: number;
  avgSessionDuration: number;
}

export interface TrafficSource {
  channel: string;
  sessions: number;
}

export interface DeviceBreakdown {
  deviceCategory: string;
  sessions: number;
  percentage: number;
}

export interface BrowserBreakdown {
  browser: string;
  sessions: number;
}

export interface CountryBreakdown {
  country: string;
  sessions: number;
  bounceRate: number;
}

export interface RealtimeData {
  activeUsers: number;
}
