import { readFileSync } from "fs";
import { resolve } from "path";
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import type {
  TrafficOverview,
  TopPage,
  TrafficSource,
  DeviceBreakdown,
  BrowserBreakdown,
  CountryBreakdown,
  RealtimeData,
} from "@/lib/ts-types/seo";

function getAnalyticsClient(): BetaAnalyticsDataClient {
  const credentialsValue = process.env.GA4_CREDENTIALS_JSON;
  if (!credentialsValue) {
    throw new Error("GA4_CREDENTIALS_JSON environment variable is not set");
  }
  // Support both inline JSON and a file path
  const raw = credentialsValue.trimStart().startsWith("{")
    ? credentialsValue
    : readFileSync(resolve(process.cwd(), credentialsValue), "utf-8");
  const credentials = JSON.parse(raw);
  return new BetaAnalyticsDataClient({ credentials });
}

function getPropertyId(): string {
  const propertyId = process.env.GA4_PROPERTY_ID;
  if (!propertyId) {
    throw new Error("GA4_PROPERTY_ID environment variable is not set");
  }
  return propertyId;
}

function defaultDateRange(): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return {
    startDate: start.toISOString().split("T")[0]!,
    endDate: end.toISOString().split("T")[0]!,
  };
}

export async function getTrafficOverview(
  startDate?: string,
  endDate?: string
): Promise<TrafficOverview> {
  const client = getAnalyticsClient();
  const propertyId = getPropertyId();
  const dates = startDate && endDate ? { startDate, endDate } : defaultDateRange();

  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [dates],
    metrics: [
      { name: "sessions" },
      { name: "screenPageViews" },
      { name: "bounceRate" },
      { name: "newUsers" },
      { name: "totalUsers" },
      { name: "engagementRate" },
      { name: "averageSessionDuration" },
      { name: "screenPageViewsPerSession" },
    ],
  });

  const row = response.rows?.[0];
  return {
    sessions: parseInt(row?.metricValues?.[0]?.value ?? "0", 10),
    pageViews: parseInt(row?.metricValues?.[1]?.value ?? "0", 10),
    bounceRate: parseFloat(row?.metricValues?.[2]?.value ?? "0"),
    newUsers: parseInt(row?.metricValues?.[3]?.value ?? "0", 10),
    totalUsers: parseInt(row?.metricValues?.[4]?.value ?? "0", 10),
    engagementRate: parseFloat(row?.metricValues?.[5]?.value ?? "0"),
    avgSessionDuration: parseFloat(row?.metricValues?.[6]?.value ?? "0"),
    screenPageViewsPerSession: parseFloat(row?.metricValues?.[7]?.value ?? "0"),
  };
}

export async function getTopPages(
  startDate?: string,
  endDate?: string,
  limit = 10
): Promise<TopPage[]> {
  const client = getAnalyticsClient();
  const propertyId = getPropertyId();
  const dates = startDate && endDate ? { startDate, endDate } : defaultDateRange();

  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [dates],
    dimensions: [{ name: "pagePath" }],
    metrics: [
      { name: "screenPageViews" },
      { name: "bounceRate" },
      { name: "averageSessionDuration" },
    ],
    orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
    limit,
  });

  return (response.rows ?? []).map((row) => ({
    pagePath: row.dimensionValues?.[0]?.value ?? "",
    screenPageViews: parseInt(row.metricValues?.[0]?.value ?? "0", 10),
    bounceRate: parseFloat(row.metricValues?.[1]?.value ?? "0"),
    avgSessionDuration: parseFloat(row.metricValues?.[2]?.value ?? "0"),
  }));
}

export async function getTrafficSources(
  startDate?: string,
  endDate?: string
): Promise<TrafficSource[]> {
  const client = getAnalyticsClient();
  const propertyId = getPropertyId();
  const dates = startDate && endDate ? { startDate, endDate } : defaultDateRange();

  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [dates],
    dimensions: [{ name: "sessionDefaultChannelGroup" }],
    metrics: [{ name: "sessions" }],
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
  });

  return (response.rows ?? []).map((row) => ({
    channel: row.dimensionValues?.[0]?.value ?? "",
    sessions: parseInt(row.metricValues?.[0]?.value ?? "0", 10),
  }));
}

export async function getDeviceBreakdown(
  startDate?: string,
  endDate?: string
): Promise<DeviceBreakdown[]> {
  const client = getAnalyticsClient();
  const propertyId = getPropertyId();
  const dates = startDate && endDate ? { startDate, endDate } : defaultDateRange();

  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [dates],
    dimensions: [{ name: "deviceCategory" }],
    metrics: [{ name: "sessions" }],
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
  });

  const rows = response.rows ?? [];
  const totalSessions = rows.reduce(
    (sum, row) => sum + parseInt(row.metricValues?.[0]?.value ?? "0", 10),
    0
  );

  return rows.map((row) => {
    const sessions = parseInt(row.metricValues?.[0]?.value ?? "0", 10);
    return {
      deviceCategory: row.dimensionValues?.[0]?.value ?? "",
      sessions,
      percentage: totalSessions > 0 ? sessions / totalSessions : 0,
    };
  });
}

export async function getBrowserBreakdown(
  startDate?: string,
  endDate?: string,
  limit = 8
): Promise<BrowserBreakdown[]> {
  const client = getAnalyticsClient();
  const propertyId = getPropertyId();
  const dates = startDate && endDate ? { startDate, endDate } : defaultDateRange();

  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [dates],
    dimensions: [{ name: "browser" }],
    metrics: [{ name: "sessions" }],
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    limit,
  });

  return (response.rows ?? []).map((row) => ({
    browser: row.dimensionValues?.[0]?.value ?? "",
    sessions: parseInt(row.metricValues?.[0]?.value ?? "0", 10),
  }));
}

export async function getTopCountries(
  startDate?: string,
  endDate?: string,
  limit = 10
): Promise<CountryBreakdown[]> {
  const client = getAnalyticsClient();
  const propertyId = getPropertyId();
  const dates = startDate && endDate ? { startDate, endDate } : defaultDateRange();

  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [dates],
    dimensions: [{ name: "country" }],
    metrics: [{ name: "sessions" }, { name: "bounceRate" }],
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    limit,
  });

  return (response.rows ?? []).map((row) => ({
    country: row.dimensionValues?.[0]?.value ?? "",
    sessions: parseInt(row.metricValues?.[0]?.value ?? "0", 10),
    bounceRate: parseFloat(row.metricValues?.[1]?.value ?? "0"),
  }));
}

export async function getRealtimeUsers(): Promise<RealtimeData> {
  const client = getAnalyticsClient();
  const propertyId = getPropertyId();

  const [response] = await client.runRealtimeReport({
    property: `properties/${propertyId}`,
    metrics: [{ name: "activeUsers" }],
  });

  const row = response.rows?.[0];
  return {
    activeUsers: parseInt(row?.metricValues?.[0]?.value ?? "0", 10),
  };
}

export function isGa4Configured(): boolean {
  return !!(process.env.GA4_PROPERTY_ID && process.env.GA4_CREDENTIALS_JSON);
}
