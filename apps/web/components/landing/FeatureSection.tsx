"use client";

import { useId, useState, type KeyboardEvent, type ReactElement } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronRight } from "lucide-react";
import { FeatureIcon } from "@workspace/ui/components/features/FeatureIcon";
import {
  readFeatureDetails,
  readFeatureGroups,
} from "@workspace/ui/lib/feature-content";
import type { FeatureSectionProps } from "@/lib/ts-types/landing";
import { FeatureDetail } from "./FeatureDetail";

const FeatureSection = ({
  featureSection,
}: {
  featureSection: FeatureSectionProps;
}): ReactElement => {
  const t = useTranslations("landing.feature");
  const instanceId = useId();
  const [selection, setSelection] = useState<string | null | undefined>();
  const groups = readFeatureGroups(featureSection.groups);
  const features = (featureSection.features ?? [])
    .map((feature, index) => {
      const details = readFeatureDetails(feature.details);
      return {
        feature,
        details,
        key: details?.key || feature.id || `legacy-${index}`,
        index,
      };
    })
    .sort(
      (a, b) =>
        (a.feature.sortOrder ?? a.index) - (b.feature.sortOrder ?? b.index),
    );
  const groupKeys = new Set(groups.map((group) => group.key));
  const grouped = [...groups, { key: "__general", label: t("general") }]
    .map((group) => ({
      ...group,
      features: features.filter(
        ({ details }) =>
          (details && groupKeys.has(details.groupKey)
            ? details.groupKey
            : "__general") === group.key,
      ),
    }))
    .filter((group) => group.features.length > 0);
  const defaultFeature =
    features.find(({ details }) => details?.key === "email") ?? features[0];
  const selected =
    features.find(({ key }) => key === selection) ?? defaultFeature;
  const mobileSelection = selection === null ? null : selected?.key;

  function navigate(event: KeyboardEvent<HTMLButtonElement>) {
    const buttons = Array.from(
      event.currentTarget
        .closest("nav")
        ?.querySelectorAll<HTMLButtonElement>("button") ?? [],
    );
    const current = buttons.indexOf(event.currentTarget);
    let next: number;
    switch (event.key) {
      case "ArrowDown":
        next = (current + 1) % buttons.length;
        break;
      case "ArrowUp":
        next = (current - 1 + buttons.length) % buttons.length;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = buttons.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    buttons[next]?.focus();
  }

  return (
    <section
      id="features"
      aria-labelledby={`${instanceId}-heading`}
      className="container relative mx-auto px-4 py-16 sm:px-6 sm:py-24 lg:px-8"
    >
      <div className="mb-10 max-w-3xl">
        <h2
          id={`${instanceId}-heading`}
          className="text-3xl font-bold leading-tight tracking-tight md:text-4xl"
        >
          {featureSection.heading}
        </h2>
        {featureSection.description && (
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            {featureSection.description}
          </p>
        )}
      </div>
      {!!features.length && (
        <>
          <div className="hidden items-start gap-6 lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
            <nav
              aria-label={t("navigation")}
              className="max-h-[36rem] space-y-6 overflow-y-auto overscroll-contain rounded-xl border border-border bg-card p-3 [scrollbar-gutter:stable]"
            >
              {grouped.map((group) => (
                <div key={group.key}>
                  <h3 className="px-3 pb-2 pt-1 text-xs font-semibold text-muted-foreground">
                    {group.label}
                  </h3>
                  <ul className="space-y-1">
                    {group.features.map((item) => (
                      <li key={item.key}>
                        <button
                          type="button"
                          aria-pressed={selected?.key === item.key}
                          aria-controls={`${instanceId}-panel`}
                          onKeyDown={navigate}
                          onClick={() => setSelection(item.key)}
                          className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected?.key === item.key ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                        >
                          <FeatureIcon
                            name={item.details?.icon}
                            className="size-4 shrink-0"
                          />
                          <span className="min-w-0 flex-1 break-words">
                            {item.feature.title}
                          </span>
                          {selected?.key === item.key && (
                            <ChevronRight
                              aria-hidden="true"
                              className="size-4 shrink-0"
                            />
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
            {selected && (
              <div
                id={`${instanceId}-panel`}
                role="region"
                aria-labelledby={`${instanceId}-detail-heading`}
                className="min-w-0 rounded-2xl border border-border bg-card"
              >
                <FeatureDetail
                  feature={selected.feature}
                  details={selected.details}
                  headingId={`${instanceId}-detail-heading`}
                />
              </div>
            )}
          </div>
          <div className="space-y-7 lg:hidden">
            {grouped.map((group) => (
              <div key={group.key}>
                <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
                  {group.label}
                </h3>
                <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                  {group.features.map((item) => {
                    const open = mobileSelection === item.key;
                    const panelId = `${instanceId}-mobile-${item.index}`;
                    return (
                      <div key={item.key}>
                        <h4>
                          <button
                            type="button"
                            id={`${panelId}-trigger`}
                            aria-expanded={open}
                            aria-controls={panelId}
                            onClick={() => setSelection(open ? null : item.key)}
                            className={`flex w-full items-center gap-3 px-5 py-5 text-left text-base font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${open ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"}`}
                          >
                            <FeatureIcon
                              name={item.details?.icon}
                              className="size-5 shrink-0"
                            />
                            <span className="min-w-0 flex-1 break-words">
                              {item.feature.title}
                            </span>
                            <ChevronDown
                              aria-hidden="true"
                              className={`size-4 shrink-0 ${open ? "rotate-180" : ""}`}
                            />
                          </button>
                        </h4>
                        <div
                          id={panelId}
                          role="region"
                          aria-labelledby={`${panelId}-trigger`}
                          hidden={!open}
                        >
                          {open && (
                            <FeatureDetail
                              feature={item.feature}
                              details={item.details}
                              headingId={`${panelId}-heading`}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
};

export default FeatureSection;
