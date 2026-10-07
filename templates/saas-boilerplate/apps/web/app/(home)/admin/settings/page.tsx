"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Badge } from "@workspace/ui/components/shadcn/badge";
import { Button } from "@workspace/ui/components/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/shadcn/card";
import { Input } from "@workspace/ui/components/shadcn/input";
import { Label } from "@workspace/ui/components/shadcn/label";
import { NativeSelect, NativeSelectOption } from "@workspace/ui/components/shadcn/native-select";
import { Switch } from "@workspace/ui/components/shadcn/switch";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { useTRPC } from "@/trpc/client";
import { SETTINGS, type SettingKey } from "@/lib/site-config/registry";

const SOURCE_LABEL = { db: "Saved here", env: "From env", default: "Default" } as const;

function Field({
  settingKey,
  value,
  disabled,
  onChange,
}: {
  settingKey: SettingKey;
  value: unknown;
  disabled: boolean;
  onChange: (value: unknown) => void;
}) {
  const schema = SETTINGS[settingKey].schema;
  if (typeof value === "boolean") {
    return <Switch id={settingKey} checked={value} disabled={disabled} onCheckedChange={onChange} />;
  }
  if (schema instanceof z.ZodEnum) {
    return (
      <NativeSelect id={settingKey} value={String(value)} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
        {schema.options.map((option) => (
          <NativeSelectOption key={String(option)} value={String(option)}>
            {String(option)}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    );
  }
  return (
    <Input
      id={settingKey}
      className="max-w-md"
      value={String(value ?? "")}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export default function SiteSettingsPage() {
  const { session, isPending } = useAdminGuard({ allowGuest: true });
  const readOnly = session?.user.role !== "admin";
  const trpc = useTRPC();
  const qc = useQueryClient();
  const router = useRouter();
  const [draft, setDraft] = useState<Partial<Record<SettingKey, unknown>>>({});

  const entriesQuery = useQuery(trpc.siteConfig.entries.queryOptions(undefined, { enabled: !!session }));
  const save = useMutation(
    trpc.siteConfig.update.mutationOptions({
      onSuccess: async () => {
        setDraft({});
        await qc.invalidateQueries({ queryKey: trpc.siteConfig.entries.queryKey() });
        // Re-render the server layout so theme, metadata and sign-in buttons pick up the change.
        router.refresh();
        toast.success("Settings saved");
      },
      onError: (error) => toast.error(error.message || "Could not save settings"),
    }),
  );

  if (isPending || entriesQuery.isLoading) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const entries = entriesQuery.data ?? [];
  const groups = [...new Set(entries.map((entry) => entry.group))];
  const dirty = Object.keys(draft).length > 0;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="mt-2 text-muted-foreground">
          Env vars are the defaults; a value saved here overrides them at runtime, with no redeploy. Sign-in
          buttons only show or hide: a provider still needs its credentials in env.
        </p>
        {readOnly ? <p className="mt-2 text-sm text-amber-600">Read-only demo: changes cannot be saved.</p> : null}
      </div>

      {groups.map((group) => (
        <Card key={group}>
          <CardHeader>
            <CardTitle>{group}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {entries
              .filter((entry) => entry.group === group)
              .map((entry) => {
                const value = entry.key in draft ? draft[entry.key] : entry.value;
                return (
                  <div key={entry.key} className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Label htmlFor={entry.key}>{entry.label}</Label>
                      <Badge variant="outline" title={entry.source === "env" ? entry.env : undefined}>
                        {SOURCE_LABEL[entry.source]}
                      </Badge>
                      {entry.source === "db" && !readOnly ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs"
                          disabled={save.isPending}
                          onClick={() => save.mutate({ [entry.key]: null })}
                        >
                          Reset to env
                        </Button>
                      ) : null}
                    </div>
                    <Field
                      settingKey={entry.key}
                      value={value}
                      disabled={readOnly || save.isPending}
                      onChange={(next) => setDraft((current) => ({ ...current, [entry.key]: next }))}
                    />
                    {entry.description ? <p className="text-xs text-muted-foreground">{entry.description}</p> : null}
                  </div>
                );
              })}
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-end gap-2">
        <Button variant="outline" disabled={!dirty || save.isPending} onClick={() => setDraft({})}>
          Discard
        </Button>
        <Button disabled={readOnly || !dirty || save.isPending} onClick={() => save.mutate(draft)}>
          {save.isPending ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
