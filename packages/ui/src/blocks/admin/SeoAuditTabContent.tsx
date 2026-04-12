"use client";

import React from "react";
import { Button } from "@workspace/ui/components/shadcn/button";
import { Badge } from "@workspace/ui/components/shadcn/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@workspace/ui/components/shadcn/accordion";
import { Separator } from "@workspace/ui/components/shadcn/separator";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Globe,
  Search,
} from "lucide-react";

interface SeoCheckResult {
  id: string;
  label: string;
  status: "pass" | "fail" | "warn";
  detail: string;
  category: "meta" | "og" | "technical" | "headings" | "performance";
}

interface PageAuditResult {
  url: string;
  path: string;
  score: number;
  checks: SeoCheckResult[];
}

interface SeoAuditResponse {
  pages: PageAuditResult[];
  overallScore: number;
  timestamp: string;
}

interface SeoAuditTabContentProps {
  onRunAudit: () => void;
  auditData: SeoAuditResponse | null;
  isLoading: boolean;
}

const CATEGORY_LABELS: Record<SeoCheckResult["category"], string> = {
  meta: "Meta Tags",
  og: "Open Graph",
  technical: "Technical",
  headings: "Headings",
  performance: "Performance",
};

const STATUS_ICON = {
  pass: <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />,
  fail: <XCircle className="h-4 w-4 text-red-500 shrink-0" />,
  warn: <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />,
};

function scoreColor(score: number): string {
  if (score >= 80) return "text-green-500";
  if (score >= 50) return "text-yellow-500";
  return "text-red-500";
}

function scoreBadgeVariant(score: number): "default" | "secondary" | "destructive" | "outline" {
  if (score >= 80) return "default";
  if (score >= 50) return "secondary";
  return "destructive";
}

function groupByCategory(checks: SeoCheckResult[]) {
  const groups: Record<string, SeoCheckResult[]> = {};
  for (const c of checks) {
    if (!groups[c.category]) groups[c.category] = [];
    groups[c.category]!.push(c);
  }
  return groups;
}

export function SeoAuditTabContent({
  onRunAudit,
  auditData,
  isLoading,
}: SeoAuditTabContentProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-emerald-500/10 p-2.5">
            <Search className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">SEO Health Audit</h3>
            <p className="text-sm text-muted-foreground">
              Crawl your site&apos;s pages and check for SEO best practices.
            </p>
          </div>
        </div>
        <Button onClick={onRunAudit} disabled={isLoading} size="sm">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running...
            </>
          ) : (
            "Run Audit"
          )}
        </Button>
      </div>

      {/* Overall Score */}
      {auditData && (
        <>
          <div className="flex items-center gap-6 rounded-lg border p-6">
            <div className="text-center">
              <div className={`text-5xl font-bold ${scoreColor(auditData.overallScore)}`}>
                {auditData.overallScore}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Overall Score
              </div>
            </div>
            <Separator orientation="vertical" className="h-16" />
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>{auditData.pages.length} pages checked</p>
              <p>
                Last run:{" "}
                {new Date(auditData.timestamp).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Per-page results */}
          <Accordion type="multiple" className="space-y-2">
            {auditData.pages.map((page) => (
              <AccordionItem
                key={page.path}
                value={page.path}
                className="rounded-lg border px-4"
              >
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono text-sm">{page.path}</span>
                    <Badge variant={scoreBadgeVariant(page.score)}>
                      {page.score}%
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pb-2">
                    {Object.entries(groupByCategory(page.checks)).map(
                      ([category, checks]) => (
                        <div key={category}>
                          <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            {CATEGORY_LABELS[category as SeoCheckResult["category"]] ?? category}
                          </h4>
                          <div className="space-y-1.5">
                            {checks.map((c) => (
                              <div
                                key={c.id}
                                className="flex items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
                              >
                                {STATUS_ICON[c.status]}
                                <div className="min-w-0">
                                  <span className="font-medium">
                                    {c.label}
                                  </span>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {c.detail}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </>
      )}

      {/* Empty state */}
      {!auditData && !isLoading && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <Search className="h-10 w-10 text-muted-foreground/50" />
          <p className="mt-4 text-sm text-muted-foreground">
            Click &quot;Run Audit&quot; to analyze your site&apos;s SEO health.
          </p>
        </div>
      )}
    </div>
  );
}
