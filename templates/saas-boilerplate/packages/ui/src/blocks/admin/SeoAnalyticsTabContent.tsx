"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/shadcn/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/shadcn/table";
import { Skeleton } from "@workspace/ui/components/shadcn/skeleton";
import { Input } from "@workspace/ui/components/shadcn/input";
import { Label } from "@workspace/ui/components/shadcn/label";
import { Badge } from "@workspace/ui/components/shadcn/badge";
import {
  Activity,
  Eye,
  TrendingDown,
  UserPlus,
  BarChart3,
  AlertCircle,
  Users,
  Timer,
  Zap,
  Layers,
  Globe,
  Monitor,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface TrafficOverview {
  sessions: number;
  pageViews: number;
  bounceRate: number;
  newUsers: number;
  totalUsers: number;
  engagementRate: number;
  avgSessionDuration: number;
  screenPageViewsPerSession: number;
}

interface TopPage {
  pagePath: string;
  screenPageViews: number;
  bounceRate: number;
  avgSessionDuration: number;
}

interface TrafficSource {
  channel: string;
  sessions: number;
}

interface DeviceBreakdown {
  deviceCategory: string;
  sessions: number;
  percentage: number;
}

interface BrowserBreakdown {
  browser: string;
  sessions: number;
}

interface CountryBreakdown {
  country: string;
  sessions: number;
  bounceRate: number;
}

interface RealtimeData {
  activeUsers: number;
}

interface SeoAnalyticsTabContentProps {
  overview: TrafficOverview | null;
  topPages: TopPage[] | null;
  trafficSources: TrafficSource[] | null;
  deviceBreakdown: DeviceBreakdown[] | null;
  browserBreakdown: BrowserBreakdown[] | null;
  topCountries: CountryBreakdown[] | null;
  realtimeUsers: RealtimeData | null;
  isLoading: boolean;
  isConfigured: boolean;
  dateRange: { startDate: string; endDate: string };
  onDateRangeChange: (range: { startDate: string; endDate: string }) => void;
}

const PIE_COLORS = [
  "#8b5cf6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#6366f1",
  "#14b8a6",
];

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function StatCard({
  title,
  value,
  icon: Icon,
  isLoading,
  format,
}: {
  title: string;
  value: number | undefined;
  icon: React.ElementType;
  isLoading: boolean;
  format?: "number" | "percent" | "duration" | "decimal";
}) {
  let formatted: string;
  switch (format) {
    case "percent":
      formatted = `${((value ?? 0) * 100).toFixed(1)}%`;
      break;
    case "duration":
      formatted = formatDuration(value ?? 0);
      break;
    case "decimal":
      formatted = (value ?? 0).toFixed(1);
      break;
    default:
      formatted = (value ?? 0).toLocaleString();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className="text-2xl font-bold">{formatted}</div>
        )}
      </CardContent>
    </Card>
  );
}

export function SeoAnalyticsTabContent({
  overview,
  topPages,
  trafficSources,
  deviceBreakdown,
  browserBreakdown,
  topCountries,
  realtimeUsers,
  isLoading,
  isConfigured,
  dateRange,
  onDateRangeChange,
}: SeoAnalyticsTabContentProps) {
  if (!isConfigured) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <AlertCircle className="h-10 w-10 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-semibold">GA4 Setup Required</h3>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          To view analytics data, configure the following environment variables:
        </p>
        <div className="mt-4 rounded-md bg-muted p-4 text-left font-mono text-xs">
          <p>GA4_PROPERTY_ID=your_property_id</p>
          <p>GA4_CREDENTIALS_JSON=your_service_account_json</p>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          See the Google Cloud Console to create a service account and enable the
          Google Analytics Data API.
        </p>
      </div>
    );
  }

  const maxBrowserSessions = browserBreakdown?.[0]?.sessions ?? 1;

  return (
    <div className="space-y-6">
      {/* Header + Date Range + Realtime */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-violet-500/10 p-2.5">
            <BarChart3 className="h-5 w-5 text-violet-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Analytics Overview</h3>
            <p className="text-sm text-muted-foreground">
              Traffic data from Google Analytics 4.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {realtimeUsers != null && (
            <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1.5 text-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              {realtimeUsers.activeUsers} active now
            </Badge>
          )}
          <div className="flex items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Start Date</Label>
              <Input
                type="date"
                value={dateRange.startDate}
                onChange={(e) =>
                  onDateRangeChange({ ...dateRange, startDate: e.target.value })
                }
                className="h-8 w-36 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">End Date</Label>
              <Input
                type="date"
                value={dateRange.endDate}
                onChange={(e) =>
                  onDateRangeChange({ ...dateRange, endDate: e.target.value })
                }
                className="h-8 w-36 text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stat Cards — Row 1 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Sessions" value={overview?.sessions} icon={Activity} isLoading={isLoading} />
        <StatCard title="Page Views" value={overview?.pageViews} icon={Eye} isLoading={isLoading} />
        <StatCard title="Total Users" value={overview?.totalUsers} icon={Users} isLoading={isLoading} />
        <StatCard title="New Users" value={overview?.newUsers} icon={UserPlus} isLoading={isLoading} />
      </div>

      {/* Stat Cards — Row 2 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Bounce Rate" value={overview?.bounceRate} icon={TrendingDown} isLoading={isLoading} format="percent" />
        <StatCard title="Engagement Rate" value={overview?.engagementRate} icon={Zap} isLoading={isLoading} format="percent" />
        <StatCard title="Avg Session Duration" value={overview?.avgSessionDuration} icon={Timer} isLoading={isLoading} format="duration" />
        <StatCard title="Pages / Session" value={overview?.screenPageViewsPerSession} icon={Layers} isLoading={isLoading} format="decimal" />
      </div>

      {/* Top Pages Table — Full Width */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Pages</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : topPages && topPages.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Page</TableHead>
                  <TableHead className="text-right">Views</TableHead>
                  <TableHead className="text-right">Bounce Rate</TableHead>
                  <TableHead className="text-right">Avg Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topPages.map((page, i) => (
                  <TableRow key={page.pagePath}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-mono text-xs">{page.pagePath}</TableCell>
                    <TableCell className="text-right">{page.screenPageViews.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{(page.bounceRate * 100).toFixed(1)}%</TableCell>
                    <TableCell className="text-right">{formatDuration(page.avgSessionDuration)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No page data available.</p>
          )}
        </CardContent>
      </Card>

      {/* Three-column grid: Traffic Sources, Devices, Browsers */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Traffic Sources Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Traffic Sources</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Skeleton className="h-48 w-48 rounded-full" />
              </div>
            ) : trafficSources && trafficSources.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={trafficSources}
                    dataKey="sessions"
                    nameKey="channel"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={45}
                    paddingAngle={2}
                  >
                    {trafficSources.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => value.toLocaleString()} />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">No traffic source data.</p>
            )}
          </CardContent>
        </Card>

        {/* Device Breakdown Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Monitor className="h-4 w-4" /> Devices
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Skeleton className="h-48 w-48 rounded-full" />
              </div>
            ) : deviceBreakdown && deviceBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={deviceBreakdown}
                    dataKey="sessions"
                    nameKey="deviceCategory"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={45}
                    paddingAngle={2}
                    label={({ deviceCategory, percentage }) =>
                      `${deviceCategory} (${(percentage * 100).toFixed(0)}%)`
                    }
                    labelLine={false}
                  >
                    {deviceBreakdown.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[(i + 2) % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => value.toLocaleString()} />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">No device data.</p>
            )}
          </CardContent>
        </Card>

        {/* Top Browsers List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-4 w-4" /> Top Browsers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
            ) : browserBreakdown && browserBreakdown.length > 0 ? (
              <div className="space-y-3">
                {browserBreakdown.map((b) => (
                  <div key={b.browser} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate">{b.browser}</span>
                      <span className="text-muted-foreground ml-2 shrink-0">
                        {b.sessions.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted">
                      <div
                        className="h-1.5 rounded-full bg-violet-500"
                        style={{
                          width: `${(b.sessions / maxBrowserSessions) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No browser data.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Countries Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4" /> Top Countries
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : topCountries && topCountries.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead className="text-right">Sessions</TableHead>
                  <TableHead className="text-right">Bounce Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topCountries.map((c, i) => (
                  <TableRow key={c.country}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell>{c.country}</TableCell>
                    <TableCell className="text-right">{c.sessions.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{(c.bounceRate * 100).toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No country data available.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
