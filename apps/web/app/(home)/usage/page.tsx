"use client";

import React, { useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Badge } from "@workspace/ui/components/shadcn/badge";
import { Button } from "@workspace/ui/components/shadcn/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/shadcn/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/shadcn/table";
import { UsageChart, type UsageChartDay } from "@workspace/ui/components/payments/UsageChart";
import { useTRPC } from "@/trpc/client";

const formatMoney = (amount: number, currency: string) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: currency.toUpperCase() }).format(amount / 100);

/** Where credits went (billing module): balance, spend by meter, rates and every change. */
export default function UsagePage() {
  const trpc = useTRPC();
  const [days, setDays] = useState<30 | 90>(30);
  const summary = useQuery(trpc.usage.summary.queryOptions());
  const daily = useQuery(trpc.usage.daily.queryOptions({ days }));
  const meters = useQuery(trpc.usage.meters.queryOptions());
  const ledger = useQuery(trpc.usage.ledger.queryOptions());
  const events = useInfiniteQuery(
    trpc.usage.events.infiniteQueryOptions({ limit: 25 }, { getNextPageParam: (page) => page.nextCursor ?? undefined }),
  );

  if (summary.isLoading) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  const balance = summary.data;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Usage</h1>
        <p className="mt-2 text-muted-foreground">Where your credits went, and how each charge is calculated.</p>
      </div>

      {balance?.alert ? (
        <div role="status" className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          You&apos;ve used {balance.alert.threshold}% of your credits ({balance.remaining} left).
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Remaining", value: balance?.remaining ?? 0 },
          { label: "Used", value: balance?.creditsUsed ?? 0 },
          { label: "Total", value: balance?.creditsTotal ?? 0 },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className="text-3xl">{stat.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Credits spent</CardTitle>
          <div className="inline-flex rounded-md border p-1">
            {([30, 90] as const).map((value) => (
              <Button key={value} size="sm" variant={days === value ? "default" : "ghost"} onClick={() => setDays(value)}>
                {value} days
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {daily.data ? (
            <UsageChart days={daily.data.days as UsageChartDay[]} meters={daily.data.meters} />
          ) : (
            <Loader2 className="mx-auto h-5 w-5 animate-spin" />
          )}
        </CardContent>
      </Card>

      {meters.data && meters.data.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Rates</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>What</TableHead>
                  <TableHead>Measured in</TableHead>
                  <TableHead>Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {meters.data.map((meter) => (
                  <TableRow key={meter.meter}>
                    <TableCell>{meter.label}</TableCell>
                    <TableCell>{meter.unit}</TableCell>
                    <TableCell>{meter.rate}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Why your balance changed</CardTitle>
          <CardDescription>Purchases add credits; usage spends them.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableBody>
              {(ledger.data ?? []).map((entry) => (
                <TableRow key={`${entry.kind}-${entry.id}`}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{new Date(entry.at).toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={entry.kind === "purchase" ? "default" : "secondary"}>{entry.kind === "purchase" ? "Purchase" : "Usage"}</Badge>
                  </TableCell>
                  <TableCell>{entry.label}</TableCell>
                  <TableCell className="text-right font-mono">
                    {entry.kind === "purchase"
                      ? entry.amount != null && entry.currency
                        ? formatMoney(entry.amount, entry.currency)
                        : ""
                      : `${(entry.credits ?? 0) > 0 ? "−" : "+"}${Math.abs(entry.credits ?? 0)} credits`}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {ledger.data?.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">Nothing yet.</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent usage</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>What</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Credits</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(events.data?.pages.flatMap((page) => page.items) ?? []).map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{new Date(event.occurredAt).toLocaleString()}</TableCell>
                  <TableCell>
                    {event.label}
                    {event.sourceId ? <span className="block font-mono text-xs text-muted-foreground">{event.sourceId}</span> : null}
                  </TableCell>
                  <TableCell className="text-right font-mono">{event.quantity.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono">{event.credits}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {events.hasNextPage ? (
            <Button variant="outline" size="sm" className="w-fit self-center" onClick={() => events.fetchNextPage()} disabled={events.isFetchingNextPage}>
              Load more
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
