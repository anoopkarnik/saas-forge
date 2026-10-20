"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/shadcn/chart";

export type UsageChartDay = { date: string } & Record<string, number | string>;

const PALETTE = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

/** Credits spent per day, stacked by meter. Presentational: the app passes the series. */
export function UsageChart({ days, meters }: { days: UsageChartDay[]; meters: Array<{ meter: string; label: string }> }) {
  // Meter ids contain dots, which recharts reads as paths, so series use index keys.
  const series = meters.map((entry, index) => ({ ...entry, key: `m${index}` }));
  const config: ChartConfig = Object.fromEntries(
    series.map((entry, index) => [entry.key, { label: entry.label, color: PALETTE[index % PALETTE.length] }]),
  );
  const data = days.map((day) => ({
    date: day.date,
    ...Object.fromEntries(series.map((entry) => [entry.key, Number(day[entry.meter] ?? 0)])),
  }));

  if (series.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No credits spent in this period.</p>;
  }

  return (
    <ChartContainer config={config} className="h-64 w-full">
      <BarChart data={data} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickFormatter={(value: string) => value.slice(5)} minTickGap={16} />
        <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={32} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        {series.map((entry) => (
          <Bar key={entry.key} dataKey={entry.key} stackId="credits" fill={`var(--color-${entry.key})`} />
        ))}
      </BarChart>
    </ChartContainer>
  );
}
