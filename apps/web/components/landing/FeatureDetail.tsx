"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowUpRight, BookOpen, Check, Layers } from "lucide-react";
import { FeatureIcon } from "@workspace/ui/components/features/FeatureIcon";
import type {
  FeatureDetails,
  FeatureToolGroup,
} from "@workspace/ui/lib/feature-content";
import type { FeatureProps } from "@/lib/ts-types/landing";

function ToolLogo({ src }: { src: string }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background">
      {src && failedSource !== src ? (
        // CMS logos can come from local uploads or any configured storage provider.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          width={24}
          height={24}
          loading="lazy"
          className="size-6 object-contain"
          onError={() => setFailedSource(src)}
        />
      ) : (
        <Layers aria-hidden="true" className="size-4 text-muted-foreground" />
      )}
    </span>
  );
}

function ToolGroup({ group }: { group: FeatureToolGroup }) {
  const t = useTranslations("landing.feature");
  const relationship = {
    "built-with": t("builtWith"),
    "choose-one": t("chooseOne"),
    "sign-in": t("signIn"),
    compatible: t("compatible"),
  }[group.relationship];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h5 className="font-medium text-foreground">{group.label}</h5>
        <p className="text-sm text-muted-foreground">{relationship}</p>
      </div>
      <ul className="flex flex-wrap gap-2">
        {group.tools.map((tool, index) => {
          const content = (
            <>
              <ToolLogo src={tool.logoUrl} />
              <span className="min-w-0 break-words">{tool.name}</span>
            </>
          );
          return (
            <li key={`${tool.name}-${index}`} className="max-w-full">
              {tool.url ? (
                <a
                  href={tool.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-border py-2 pl-2 pr-3 text-sm hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {content}
                  <ArrowUpRight
                    aria-hidden="true"
                    className="size-3.5 shrink-0 text-muted-foreground"
                  />
                  <span className="sr-only">{t("opensNewTab")}</span>
                </a>
              ) : (
                <span className="flex items-center gap-2 rounded-lg border border-border py-2 pl-2 pr-3 text-sm">
                  {content}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function FeatureDetail({
  feature,
  details,
  headingId,
}: {
  feature: FeatureProps;
  details: FeatureDetails | null;
  headingId: string;
}) {
  const t = useTranslations("landing.feature");
  const toolGroups =
    details?.toolGroups.filter((group) => group.tools.length > 0) ?? [];
  const inclusion = details
    ? {
        included: t("included"),
        optional: t("optional"),
        platform: t("platform"),
      }[details.inclusion]
    : null;
  return (
    <div className="min-w-0 space-y-7 break-words p-5 sm:p-8 lg:p-10">
      <div>
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
            <FeatureIcon name={details?.icon} className="size-6" />
          </span>
          {inclusion && (
            <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
              {inclusion}
            </span>
          )}
        </div>
        <h3
          id={headingId}
          className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
        >
          {feature.title}
        </h3>
        {feature.description && (
          <p className="mt-3 max-w-prose whitespace-pre-line text-base leading-7 text-muted-foreground">
            {feature.description}
          </p>
        )}
      </div>
      {!!details?.bullets.length && (
        <div>
          <h4 className="mb-4 text-sm font-semibold text-foreground">
            {t("capabilities")}
          </h4>
          <ul className="grid gap-3">
            {details.bullets.map((bullet, index) => (
              <li
                key={`${bullet}-${index}`}
                className="flex items-start gap-3 text-sm leading-6 text-muted-foreground"
              >
                <Check
                  aria-hidden="true"
                  className="mt-1 size-4 shrink-0 text-primary"
                />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {!!toolGroups.length && (
        <div className="space-y-5 border-t border-border pt-6">
          <h4 className="text-sm font-semibold text-foreground">
            {t("tools")}
          </h4>
          {toolGroups.map((group, index) => (
            <ToolGroup key={`${group.label}-${index}`} group={group} />
          ))}
        </div>
      )}
      {!!details?.dependencies.length && (
        <div className="border-t border-border pt-6">
          <h4 className="mb-3 text-sm font-semibold text-foreground">
            {t("dependencies")}
          </h4>
          <ul className="flex flex-wrap gap-2">
            {details.dependencies.map((dependency, index) => (
              <li
                key={`${dependency}-${index}`}
                className="rounded-md bg-muted px-3 py-1.5 text-sm text-muted-foreground"
              >
                {dependency}
              </li>
            ))}
          </ul>
        </div>
      )}
      {details?.documentationUrl && (
        <a
          href={details.documentationUrl}
          className="inline-flex items-center gap-2 rounded-sm text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <BookOpen aria-hidden="true" className="size-4" />
          {t("documentation")}
        </a>
      )}
    </div>
  );
}
