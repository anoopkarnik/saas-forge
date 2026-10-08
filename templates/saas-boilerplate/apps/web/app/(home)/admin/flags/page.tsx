"use client";

import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Badge } from "@workspace/ui/components/shadcn/badge";
import { Button } from "@workspace/ui/components/shadcn/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/shadcn/card";
import { Input } from "@workspace/ui/components/shadcn/input";
import { NativeSelect, NativeSelectOption } from "@workspace/ui/components/shadcn/native-select";
import { Switch } from "@workspace/ui/components/shadcn/switch";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { useTRPC } from "@/trpc/client";
import type { FlagKey } from "@/lib/flags/definitions";
import type { FlagRule } from "@/lib/flags/rules";

const RULE_TYPES = [
  { type: "role", label: "Role is one of" },
  { type: "user", label: "User id is one of" },
  // scaffold:begin multi_tenancy
  { type: "organization", label: "Workspace id is one of" },
  // scaffold:end multi_tenancy
  { type: "percentage", label: "Percentage of users" },
] as const;

const listOf = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);

function blankRule(type: FlagRule["type"]): FlagRule {
  switch (type) {
    case "role":
      return { type, roles: ["admin"], value: true };
    case "user":
      return { type, userIds: [], value: true };
    // scaffold:begin multi_tenancy
    case "organization":
      return { type, organizationIds: [], value: true };
    // scaffold:end multi_tenancy
    case "percentage":
      return { type, percent: 10 };
  }
}

/** The ids a list rule matches, as one comma-separated field. */
function ruleList(rule: FlagRule): { field: string; value: string[] } | null {
  if (rule.type === "role") return { field: "roles", value: rule.roles };
  if (rule.type === "user") return { field: "userIds", value: rule.userIds };
  // scaffold:begin multi_tenancy
  if (rule.type === "organization") return { field: "organizationIds", value: rule.organizationIds };
  // scaffold:end multi_tenancy
  return null;
}

function RuleEditor({ rules, readOnly, onChange }: { rules: FlagRule[]; readOnly: boolean; onChange: (rules: FlagRule[]) => void }) {
  const update = (index: number, rule: FlagRule) => onChange(rules.map((current, i) => (i === index ? rule : current)));
  return (
    <div className="flex flex-col gap-2">
      {rules.length === 0 ? <p className="text-xs text-muted-foreground">No rules: everyone gets the default.</p> : null}
      {rules.map((rule, index) => {
        const list = ruleList(rule);
        return (
          <div key={index} className="flex flex-wrap items-center gap-2 rounded-md border p-2 text-sm">
            <span className="text-xs text-muted-foreground">{index + 1}.</span>
            <NativeSelect
              value={rule.type}
              disabled={readOnly}
              onChange={(event) => update(index, blankRule(event.target.value as FlagRule["type"]))}
            >
              {RULE_TYPES.map((option) => (
                <NativeSelectOption key={option.type} value={option.type}>
                  {option.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            {list ? (
              <>
                <Input
                  className="w-64"
                  placeholder="comma-separated"
                  defaultValue={list.value.join(", ")}
                  disabled={readOnly}
                  onBlur={(event) => update(index, { ...rule, [list.field]: listOf(event.target.value) } as FlagRule)}
                />
                <span className="text-xs">→</span>
                <NativeSelect
                  value={"value" in rule && rule.value ? "on" : "off"}
                  disabled={readOnly}
                  onChange={(event) => update(index, { ...rule, value: event.target.value === "on" } as FlagRule)}
                >
                  <NativeSelectOption value="on">on</NativeSelectOption>
                  <NativeSelectOption value="off">off</NativeSelectOption>
                </NativeSelect>
              </>
            ) : rule.type === "percentage" ? (
              <>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  className="w-24"
                  value={rule.percent}
                  disabled={readOnly}
                  onChange={(event) => update(index, { type: "percentage", percent: Number(event.target.value) })}
                />
                <span className="text-xs text-muted-foreground">% → on (stable per user)</span>
              </>
            ) : null}
            {!readOnly ? (
              <Button variant="ghost" size="icon" className="ml-auto h-7 w-7" onClick={() => onChange(rules.filter((_, i) => i !== index))}>
                <Trash2 className="h-3.5 w-3.5" />
                <span className="sr-only">Remove rule</span>
              </Button>
            ) : null}
          </div>
        );
      })}
      {!readOnly ? (
        <Button variant="outline" size="sm" className="w-fit" onClick={() => onChange([...rules, blankRule("role")])}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Add rule
        </Button>
      ) : null}
    </div>
  );
}

function History({ flagKey }: { flagKey: FlagKey }) {
  const trpc = useTRPC();
  const history = useQuery(trpc.flags.history.queryOptions({ key: flagKey }));
  if (!history.data?.length) return <p className="text-xs text-muted-foreground">No changes yet.</p>;
  return (
    <ul className="flex flex-col gap-1 text-xs">
      {history.data.map((change) => (
        <li key={change.id} className="text-muted-foreground">
          {new Date(change.at).toLocaleString()} · {change.actorEmail ?? "unknown"} · default {change.enabled ? "on" : "off"},{" "}
          {change.ruleCount} rule(s)
        </li>
      ))}
    </ul>
  );
}

export default function FeatureFlagsPage() {
  const { session, isPending } = useAdminGuard({ allowGuest: true });
  const readOnly = session?.user.role !== "admin";
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const flags = useQuery(trpc.flags.list.queryOptions(undefined, { enabled: !!session }));
  const [drafts, setDrafts] = useState<Partial<Record<FlagKey, FlagRule[]>>>({});
  const [openHistory, setOpenHistory] = useState<FlagKey | null>(null);
  const [previewUser, setPreviewUser] = useState("");
  const preview = useQuery({
    ...trpc.flags.preview.queryOptions({ user: previewUser }),
    enabled: false,
    retry: false,
  });

  const save = useMutation(
    trpc.flags.update.mutationOptions({
      onSuccess: async (flag) => {
        setDrafts((current) => ({ ...current, [flag.key]: undefined }));
        await queryClient.invalidateQueries({ queryKey: trpc.flags.list.queryKey() });
        await queryClient.invalidateQueries({ queryKey: trpc.flags.history.queryKey() });
        toast.success(`${flag.key} saved`);
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  if (isPending || flags.isLoading) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
      <div>
        <h1 className="page-title">Feature flags</h1>
        <p className="mt-2 text-muted-foreground">
          Per-user switches, evaluated on the server: rules run in order and the first match decides; otherwise the
          default applies. Changes apply on the next page load, with no redeploy. Global settings live in Settings.
        </p>
        {readOnly ? <p className="mt-2 text-sm text-amber-600">Read-only demo: changes cannot be saved.</p> : null}
      </div>

      {(flags.data ?? []).map((flag) => {
        const rules = drafts[flag.key] ?? flag.rules;
        return (
          <Card key={flag.key}>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div>
                <CardTitle className="font-mono text-base">{flag.key}</CardTitle>
                <CardDescription>{flag.description}</CardDescription>
                <div className="mt-2 flex gap-2">
                  <Badge variant="outline">code default {flag.default ? "on" : "off"}</Badge>
                  {!flag.stored ? <Badge variant="secondary">not saved yet</Badge> : null}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                Default
                <Switch
                  checked={flag.enabled}
                  disabled={readOnly || save.isPending}
                  onCheckedChange={(enabled) => save.mutate({ key: flag.key, enabled })}
                />
              </label>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <RuleEditor rules={rules} readOnly={readOnly} onChange={(next) => setDrafts((current) => ({ ...current, [flag.key]: next }))} />
              <div className="flex gap-2">
                {drafts[flag.key] && !readOnly ? (
                  <Button size="sm" disabled={save.isPending} onClick={() => save.mutate({ key: flag.key, rules })}>
                    Save rules
                  </Button>
                ) : null}
                <Button size="sm" variant="ghost" onClick={() => setOpenHistory(openHistory === flag.key ? null : flag.key)}>
                  {openHistory === flag.key ? "Hide history" : "History"}
                </Button>
              </div>
              {openHistory === flag.key ? <History flagKey={flag.key} /> : null}
            </CardContent>
          </Card>
        );
      })}

      {!readOnly ? (
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>What a user gets, with the saved rules.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (previewUser.trim()) void preview.refetch();
              }}
            >
              <Input placeholder="User email or id" value={previewUser} onChange={(event) => setPreviewUser(event.target.value)} />
              <Button type="submit" variant="outline">
                Preview
              </Button>
            </form>
            {preview.error ? <p className="text-sm text-destructive">{preview.error.message}</p> : null}
            {preview.data ? (
              <ul className="flex flex-col gap-1 text-sm">
                {Object.entries(preview.data.flags).map(([key, on]) => (
                  <li key={key} className="flex items-center gap-2">
                    <span className="font-mono">{key}</span>
                    <Badge variant={on ? "default" : "secondary"}>{on ? "on" : "off"}</Badge>
                  </li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
