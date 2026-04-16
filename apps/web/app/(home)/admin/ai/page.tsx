"use client";

import * as React from "react";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import {
  getDefaultSpeechConfig,
  getSpeechProviderPreset,
  stringifySpeechSampleBody,
  type SpeechCapability,
  type SpeechProvider,
} from "@/lib/aiSpeech";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, Check, Loader2, Mic, Pencil, Plus, RadioTower, Save, Trash2, Volume2, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@workspace/ui/components/shadcn/badge";
import { Button } from "@workspace/ui/components/shadcn/button";
import { Card, CardContent } from "@workspace/ui/components/shadcn/card";
import { Input } from "@workspace/ui/components/shadcn/input";
import { Label } from "@workspace/ui/components/shadcn/label";
import { Switch } from "@workspace/ui/components/shadcn/switch";
import { Textarea } from "@workspace/ui/components/shadcn/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/shadcn/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/shadcn/select";

type SpeechForm = {
  capability: SpeechCapability;
  provider: SpeechProvider;
  enabled: boolean;
  url: string;
  sampleBody: string;
};

const speechCapabilities: SpeechCapability[] = ["tts", "stt"];
const providerLabels: Record<string, string> = {
  gateway: "Vercel AI Gateway",
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google Gemini",
  openrouter: "OpenRouter",
  ollama: "Ollama",
  "openai-compatible": "OpenAI Compatible",
};

function createDefaultSpeechForm(capability: SpeechCapability): SpeechForm {
  const config = getDefaultSpeechConfig(capability);
  return {
    capability,
    provider: config.provider,
    enabled: config.enabled,
    url: config.url,
    sampleBody: stringifySpeechSampleBody(config.sampleBody),
  };
}

function createSpeechForms(configs?: any[]): Record<SpeechCapability, SpeechForm> {
  const forms = {
    tts: createDefaultSpeechForm("tts"),
    stt: createDefaultSpeechForm("stt"),
  };

  for (const item of configs ?? []) {
    if (item?.capability !== "tts" && item?.capability !== "stt") {
      continue;
    }

    forms[item.capability as SpeechCapability] = {
      capability: item.capability,
      provider: item.provider === "openai" ? "openai" : "custom",
      enabled: Boolean(item.enabled),
      url: item.url ?? "",
      sampleBody: stringifySpeechSampleBody(item.sampleBody),
    };
  }

  return forms;
}

function SpeechConfigPanel({
  form,
  onChange,
  onSave,
  isSaving,
}: {
  form: SpeechForm;
  onChange: (next: SpeechForm) => void;
  onSave: () => void;
  isSaving: boolean;
}) {
  const isTts = form.capability === "tts";
  const Icon = isTts ? Volume2 : Mic;

  const handleProviderChange = (provider: SpeechProvider) => {
    const preset = getSpeechProviderPreset(form.capability, provider);
    onChange({
      ...form,
      provider,
      url: preset.url,
      sampleBody: stringifySpeechSampleBody(preset.sampleBody),
    });
  };

  return (
    <div className="rounded-md border p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-primary/10 p-2">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">
              {isTts ? "Text to Speech" : "Speech to Text"}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {isTts
                ? "Configure spoken audio generation."
                : "Configure audio transcription."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor={`${form.capability}-enabled`} className="text-xs">
            Enabled
          </Label>
          <Switch
            id={`${form.capability}-enabled`}
            checked={form.enabled}
            onCheckedChange={(enabled) => onChange({ ...form, enabled })}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[220px_1fr]">
        <div className="space-y-2">
          <Label htmlFor={`${form.capability}-provider`}>Provider</Label>
          <Select value={form.provider} onValueChange={(value) => handleProviderChange(value as SpeechProvider)}>
            <SelectTrigger id={`${form.capability}-provider`}>
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="custom">Custom Endpoint</SelectItem>
              <SelectItem value="openai">OpenAI</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${form.capability}-url`}>URL</Label>
          <Input
            id={`${form.capability}-url`}
            value={form.url}
            placeholder={
              isTts
                ? "{your tts endpoint}"
                : "{your tts endpoint}"
            }
            onChange={(event) => onChange({ ...form, url: event.target.value })}
          />
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <Label htmlFor={`${form.capability}-sample-body`}>Sample body</Label>
        <Textarea
          id={`${form.capability}-sample-body`}
          rows={8}
          value={form.sampleBody}
          onChange={(event) => onChange({ ...form, sampleBody: event.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          {isTts
            ? "Placeholders: {{text}}, {{voice}}, {{model}}, {{responseFormat}}"
            : "Use {{file}} as a form-data file placeholder, or {{audioBase64}} for JSON/base64 endpoints."}
        </p>
      </div>

      <Button className="mt-4" disabled={isSaving} onClick={onSave}>
        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        Save {isTts ? "TTS" : "STT"} config
      </Button>
    </div>
  );
}

export default function AIAdminPage() {
  const { isPending, isAdmin } = useAdminGuard();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [selectedPromptKey, setSelectedPromptKey] = React.useState("chat.assistant");
  const [editingVersionId, setEditingVersionId] = React.useState<string | null>(null);
  const [formState, setFormState] = React.useState({
    name: "Chat Assistant",
    description: "",
    provider: "" as string,
    model: "",
    content: "",
  });
  const [speechForms, setSpeechForms] = React.useState<Record<SpeechCapability, SpeechForm>>(() =>
    createSpeechForms(),
  );

  const statusQuery = useQuery({
    ...trpc.ai.getStatus.queryOptions(),
    enabled: isAdmin,
  });
  const configuredProviders = (statusQuery.data?.providers ?? []) as string[];
  const promptsQuery = useQuery({
    ...trpc.ai.getPrompts.queryOptions(),
    enabled: isAdmin,
  });
  const versionsQuery = useQuery({
    ...trpc.ai.getPromptVersions.queryOptions(
      { promptKey: selectedPromptKey },
      { enabled: isAdmin && !!selectedPromptKey },
    ),
  });
  const usageQuery = useQuery({
    ...trpc.ai.getUsageEvents.queryOptions({ limit: 25 }, { enabled: isAdmin }),
  });
  const speechConfigsQuery = useQuery({
    ...trpc.ai.getSpeechConfigs.queryOptions(undefined, { enabled: isAdmin }),
  });
  const modelsQuery = useQuery({
    ...trpc.ai.getAvailableModels.queryOptions(
      { provider: formState.provider },
      { enabled: isAdmin && configuredProviders.includes(formState.provider) },
    ),
  });

  React.useEffect(() => {
    const prompt = versionsQuery.data as any;
    if (!prompt || editingVersionId) {
      return;
    }

    setFormState({
      name: prompt.name ?? "",
      description: prompt.description ?? "",
      provider: prompt.activeVersion?.provider ?? "",
      model: prompt.activeVersion?.model ?? "",
      content: prompt.activeVersion?.content ?? "",
    });
  }, [editingVersionId, versionsQuery.data]);

  React.useEffect(() => {
    if (!speechConfigsQuery.data) {
      return;
    }

    setSpeechForms(createSpeechForms(speechConfigsQuery.data as any[]));
  }, [speechConfigsQuery.data]);

  const createVersionMutation = useMutation(
    trpc.ai.createPromptVersion.mutationOptions({
      onSuccess: () => {
        toast.success("Prompt version saved");
        queryClient.invalidateQueries(trpc.ai.getPrompts.queryFilter());
        queryClient.invalidateQueries(
          trpc.ai.getPromptVersions.queryFilter({ promptKey: selectedPromptKey }),
        );
      },
      onError: (error) => {
        toast.error("Could not save prompt", { description: error.message });
      },
    }),
  );

  const updateVersionMutation = useMutation(
    trpc.ai.updatePromptVersion.mutationOptions({
      onSuccess: () => {
        toast.success("Prompt version updated");
        setEditingVersionId(null);
        queryClient.invalidateQueries(trpc.ai.getPrompts.queryFilter());
        queryClient.invalidateQueries(
          trpc.ai.getPromptVersions.queryFilter({ promptKey: selectedPromptKey }),
        );
      },
      onError: (error) => {
        toast.error("Could not update prompt version", { description: error.message });
      },
    }),
  );

  const deleteVersionMutation = useMutation(
    trpc.ai.deletePromptVersion.mutationOptions({
      onSuccess: () => {
        toast.success("Prompt version deleted");
        queryClient.invalidateQueries(trpc.ai.getPrompts.queryFilter());
        queryClient.invalidateQueries(
          trpc.ai.getPromptVersions.queryFilter({ promptKey: selectedPromptKey }),
        );
      },
      onError: (error) => {
        toast.error("Could not delete prompt version", { description: error.message });
      },
    }),
  );

  const activateMutation = useMutation(
    trpc.ai.activatePromptVersion.mutationOptions({
      onSuccess: () => {
        toast.success("Prompt version activated");
        queryClient.invalidateQueries(trpc.ai.getPrompts.queryFilter());
        queryClient.invalidateQueries(
          trpc.ai.getPromptVersions.queryFilter({ promptKey: selectedPromptKey }),
        );
      },
      onError: (error) => {
        toast.error("Could not activate prompt", { description: error.message });
      },
    }),
  );

  const saveSpeechMutation = useMutation(
    trpc.ai.saveSpeechConfig.mutationOptions({
      onSuccess: (config) => {
        toast.success("Speech configuration saved");
        setSpeechForms((current) => ({
          ...current,
          [config.capability]: {
            capability: config.capability,
            provider: config.provider,
            enabled: config.enabled,
            url: config.url,
            sampleBody: stringifySpeechSampleBody(config.sampleBody),
          },
        }));
        queryClient.invalidateQueries(trpc.ai.getSpeechConfigs.queryFilter());
      },
      onError: (error) => {
        toast.error("Could not save speech configuration", { description: error.message });
      },
    }),
  );

  if (isPending) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const status = statusQuery.data;
  const prompt = versionsQuery.data as any;
  const prompts = (promptsQuery.data ?? []) as any[];
  const usageEvents = (usageQuery.data ?? []) as any[];
  const savingSpeechCapability = (saveSpeechMutation.variables as any)?.capability;
  const providerOptions =
    formState.provider && !configuredProviders.includes(formState.provider)
      ? [formState.provider, ...configuredProviders]
      : configuredProviders;
  const isPromptSaving = createVersionMutation.isPending || updateVersionMutation.isPending;

  const resetFormToActiveVersion = () => {
    const currentPrompt = versionsQuery.data as any;
    setEditingVersionId(null);
    setFormState({
      name: currentPrompt?.name ?? "",
      description: currentPrompt?.description ?? "",
      provider: currentPrompt?.activeVersion?.provider ?? "",
      model: currentPrompt?.activeVersion?.model ?? "",
      content: currentPrompt?.activeVersion?.content ?? "",
    });
  };

  const startEditingVersion = (version: any) => {
    const currentPrompt = versionsQuery.data as any;
    setEditingVersionId(version.id);
    setFormState({
      name: currentPrompt?.name ?? "",
      description: currentPrompt?.description ?? "",
      provider: version.provider ?? "",
      model: version.model ?? "",
      content: version.content ?? "",
    });
  };

  const deletePromptVersion = (version: any) => {
    if (!confirm(`Delete version ${version.version}? This action cannot be undone.`)) {
      return;
    }

    deleteVersionMutation.mutate({
      promptKey: selectedPromptKey,
      versionId: version.id,
    });
  };

  const updateSpeechForm = (capability: SpeechCapability, form: SpeechForm) => {
    setSpeechForms((current) => ({ ...current, [capability]: form }));
  };

  const saveSpeechConfig = (capability: SpeechCapability) => {
    const form = speechForms[capability];
    saveSpeechMutation.mutate({
      capability,
      provider: form.provider,
      enabled: form.enabled,
      url: form.url,
      sampleBody: form.sampleBody,
    });
  };

  return (
    <div className="container max-w-5xl px-4 py-8 md:px-8">
      <div className="mb-8 flex items-start gap-4">
        <div className="rounded-md bg-primary/10 p-3">
          <Bot className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage prompts, model configuration, and metered AI usage.
          </p>
        </div>
      </div>

      <Card className="min-h-[500px]">
        <CardContent>
          <Tabs defaultValue="prompts" className="w-full">
            <TabsList className="mb-8 flex h-auto w-full justify-start gap-1 rounded-lg bg-muted/50 p-1.5">
              <TabsTrigger value="prompts" className="flex items-center gap-1.5 text-xs">
                <Bot className="h-3.5 w-3.5" /> Prompts
              </TabsTrigger>
              <TabsTrigger value="usage" className="flex items-center gap-1.5 text-xs">
                <RadioTower className="h-3.5 w-3.5" /> Usage
              </TabsTrigger>
              <TabsTrigger value="speech" className="flex items-center gap-1.5 text-xs">
                <Volume2 className="h-3.5 w-3.5" /> Speech
              </TabsTrigger>
            </TabsList>

            <TabsContent value="prompts" className="space-y-6">
              <div className="rounded-md border p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant={status?.configured ? "default" : "secondary"}>
                    {status?.configured ? "Configured" : "Disabled"}
                  </Badge>
                  {configuredProviders.length ? (
                    configuredProviders.map((provider: string) => (
                      <Badge key={provider} variant="outline">
                        {providerLabels[provider] ?? provider}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">No providers configured</span>
                  )}
                </div>
                {!status?.configured ? (
                  <p className="mt-2 text-sm text-muted-foreground">{status?.reason}</p>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Providers are detected from server environment variables. Models are set per prompt version.
                  </p>
                )}
              </div>

              <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
                <div className="space-y-2">
                  {prompts.map((item: any) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        setSelectedPromptKey(item.key);
                        setEditingVersionId(null);
                      }}
                      className={`w-full rounded-md border px-3 py-2 text-left text-sm ${selectedPromptKey === item.key
                        ? "border-primary bg-primary/10"
                        : "border-border bg-background"
                        }`}
                    >
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{item.key}</div>
                    </button>
                  ))}
                </div>

                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="prompt-name">Name</Label>
                      <Input
                        id="prompt-name"
                        value={formState.name}
                        onChange={(event) =>
                          setFormState((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="prompt-provider">Provider</Label>
                      <Select
                        value={formState.provider}
                        onValueChange={(value) =>
                          setFormState((current) => ({
                            ...current,
                            provider: value,
                            model: "", // Reset model when provider changes
                          }))
                        }
                      >
                        <SelectTrigger id="prompt-provider">
                          <SelectValue placeholder="Select provider" />
                        </SelectTrigger>
                        <SelectContent>
                          {providerOptions.map((provider: string) => (
                            <SelectItem key={provider} value={provider}>
                              {providerLabels[provider] ?? provider}
                              {!configuredProviders.includes(provider) ? " (not configured)" : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!configuredProviders.length ? (
                        <p className="text-xs text-muted-foreground">
                          Add an AI provider key in the server environment to choose a provider.
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prompt-model">Model</Label>
                    <div className="flex gap-2">
                      <Select
                        value={formState.model}
                        onValueChange={(value) =>
                          setFormState((current) => ({
                            ...current,
                            model: value,
                          }))
                        }
                        disabled={!formState.provider || modelsQuery.isPending}
                      >
                        <SelectTrigger id="prompt-model" className="flex-1">
                          <SelectValue
                            placeholder={
                              modelsQuery.isPending ? "Loading models..." : "Select model"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {(modelsQuery.data ?? []).map((model: string) => (
                            <SelectItem key={model} value={model}>
                              {model}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Or type custom model ID"
                        className="w-[240px]"
                        value={formState.model}
                        onChange={(e) =>
                          setFormState((current) => ({ ...current, model: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prompt-description">Description</Label>
                    <Input
                      id="prompt-description"
                      value={formState.description}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prompt-content">Prompt</Label>
                    <Textarea
                      id="prompt-content"
                      rows={10}
                      value={formState.content}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          content: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <Button
                    disabled={
                      isPromptSaving ||
                      !formState.provider ||
                      !configuredProviders.includes(formState.provider) ||
                      !formState.model.trim() ||
                      !formState.content.trim()
                    }
                    onClick={() => {
                      if (editingVersionId) {
                        updateVersionMutation.mutate({
                          promptKey: selectedPromptKey,
                          versionId: editingVersionId,
                          content: formState.content,
                          provider: formState.provider || undefined,
                          model: formState.model.trim() || undefined,
                        });
                        return;
                      }

                      createVersionMutation.mutate({
                        promptKey: selectedPromptKey,
                        name: formState.name,
                        description: formState.description,
                        content: formState.content,
                        provider: formState.provider || undefined,
                        model: formState.model.trim() || undefined,
                        activate: true,
                      });
                    }}
                  >
                    {isPromptSaving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : editingVersionId ? (
                      <Save className="mr-2 h-4 w-4" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}
                    {editingVersionId ? "Update version" : "Save active version"}
                  </Button>
                  {editingVersionId ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetFormToActiveVersion}
                      disabled={updateVersionMutation.isPending}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Cancel edit
                    </Button>
                  ) : null}

                  <div className="space-y-2">
                    <h2 className="text-sm font-semibold">Versions</h2>
                    {(prompt?.versions ?? []).map((version: any) => {
                      const active = prompt?.activeVersionId === version.id;
                      return (
                        <div
                          key={version.id}
                          className="flex items-center justify-between rounded-md border p-3 text-sm"
                        >
                          <div>
                            <div className="font-medium">Version {version.version}</div>
                            <div className="text-xs text-muted-foreground">
                              {[providerLabels[version.provider] ?? version.provider, version.model]
                                .filter(Boolean)
                                .join(" - ") || "Provider and model not set"}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            {active ? (
                              <Badge>
                                <Check className="mr-1 h-3 w-3" /> Active
                              </Badge>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  activateMutation.mutate({
                                    promptKey: selectedPromptKey,
                                    versionId: version.id,
                                  })
                                }
                              >
                                Activate
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => startEditingVersion(version)}
                            >
                              <Pencil className="mr-1 h-3 w-3" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={active || deleteVersionMutation.isPending}
                              title={active ? "Activate another version before deleting this one." : undefined}
                              onClick={() => deletePromptVersion(version)}
                            >
                              <Trash2 className="mr-1 h-3 w-3" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="usage">
              <div className="space-y-3">
                {usageEvents.map((event: any) => (
                  <div
                    key={event.id}
                    className="grid gap-2 rounded-md border p-3 text-sm md:grid-cols-[1fr_auto]"
                  >
                    <div>
                      <div className="font-medium">
                        {event.promptKey} - {event.model}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {event.user?.email ?? event.userId} - {event.status}
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <div>{event.totalTokens} tokens</div>
                      <div>{event.creditsCharged} credits</div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="speech" className="space-y-4">
              <div className="rounded-md border p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="secondary">Admin only</Badge>
                  <span className="text-sm text-muted-foreground">
                    Save speech provider URLs and JSON request templates.
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Custom endpoints use the configured sample body. OpenAI uses the server
                  OPENAI_API_KEY.
                </p>
              </div>

              {speechConfigsQuery.isPending ? (
                <div className="flex min-h-40 items-center justify-center rounded-md border">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                speechCapabilities.map((capability) => (
                  <SpeechConfigPanel
                    key={capability}
                    form={speechForms[capability]}
                    onChange={(form) => updateSpeechForm(capability, form)}
                    onSave={() => saveSpeechConfig(capability)}
                    isSaving={saveSpeechMutation.isPending && savingSpeechCapability === capability}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
