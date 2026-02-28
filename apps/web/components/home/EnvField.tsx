"use client";

import * as React from "react";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/shadcn/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/shadcn/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/shadcn/tooltip";
import { Check, Info, ExternalLink } from "lucide-react";
import { FormValues } from "@/lib/zod/download";
import { FloatingLabelInput } from "@workspace/ui/components/misc/floating-label-input";
import { cn } from "@workspace/ui/lib/utils";

// Module Configuration
import { selectOptions, multiselectOptions, themeColors } from "@/lib/constants/options";

// Helper component for env var fields
export default function EnvField({
  control,
  name,
  label,
  description,
  required,
  sectionId,
  providerHints,
}: {
  control: any;
  name: keyof FormValues;
  label?: string;
  description?: string;
  required?: boolean;
  sectionId?: string;
  providerHints?: { name: string; url: string; color: string; icon: any; tier: string; info: string }[];
}) {
  const htmlId = sectionId ? `${sectionId}-${name}` : name;

  const isSelectField = name in selectOptions;
  const isMultiselectField = name in multiselectOptions;
  const isThemeField = name === "NEXT_PUBLIC_THEME";

  const labelContent = (
    <span className="flex items-center gap-1">
      {label || name}
      {required && <span className="text-destructive text-sm leading-none">*</span>}
    </span>
  );

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          {/* Label row for select & multiselect fields */}
          {(isSelectField || isMultiselectField) && (
            <div className="flex items-center gap-2 mb-1.5">
              <FormLabel className="text-xs font-medium text-muted-foreground">
                {labelContent}
              </FormLabel>
              {description && (
                <TooltipProvider>
                  <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground/70 cursor-help hover:text-foreground transition-colors" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[300px] text-xs">
                      <p>{description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          )}

          <FormControl>
            {/* ── Multiselect: Icon Toggle Cards ────────────────────── */}
            {isMultiselectField ? (
              <div className="grid grid-cols-2 gap-2">
                {multiselectOptions[name]?.map((option) => {
                  const values: string[] = Array.isArray(field.value) ? field.value : [];
                  const isChecked = values.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      disabled={option.disabled}
                      onClick={() => {
                        if (option.disabled) return;
                        if (isChecked) {
                          field.onChange(values.filter((v: string) => v !== option.value));
                        } else {
                          field.onChange([...values, option.value]);
                        }
                      }}
                      className={cn(
                        "relative flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 p-3 transition-all duration-200 cursor-pointer",
                        isChecked
                          ? `${option.color || "border-primary bg-primary/10"} shadow-sm`
                          : "border-border/50 bg-muted/30 hover:border-border hover:bg-muted/50 opacity-60 hover:opacity-80",
                        option.disabled && "cursor-not-allowed opacity-40 hover:opacity-40 hover:border-border/50 hover:bg-muted/30"
                      )}
                    >
                      {/* Checkmark badge */}
                      {isChecked && (
                        <div className="absolute top-1.5 right-1.5">
                          <Check className="h-3 w-3 text-primary" />
                        </div>
                      )}
                      <div className={cn(
                        "transition-transform duration-200",
                        isChecked ? "scale-110" : "scale-100"
                      )}>
                        {option.icon}
                      </div>
                      <span className={cn(
                        "text-xs font-medium transition-colors",
                        isChecked ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {option.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              /* ── Theme Color Swatches ────────────────────────────── */
            ) : isThemeField ? (
              <div className="flex flex-wrap gap-2">
                {selectOptions[name]?.map((option) => {
                  const isSelected = field.value === option.value;
                  const hex = themeColors[option.value] || "#888";
                  return (
                    <Tooltip key={option.value}>
                      <TooltipProvider>
                        <Tooltip delayDuration={200}>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() => field.onChange(option.value)}
                              className={cn(
                                "relative h-8 w-8 rounded-full border-2 transition-all duration-200 cursor-pointer",
                                isSelected
                                  ? "border-foreground scale-110 shadow-md ring-2 ring-offset-2 ring-offset-background"
                                  : "border-transparent hover:scale-105 hover:border-muted-foreground/30"
                              )}
                              style={{
                                backgroundColor: hex,
                                ...(isSelected ? { ringColor: hex } : {}),
                              }}
                            >
                              {isSelected && (
                                <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow-md" />
                              )}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="text-xs capitalize">
                            {option.label}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Tooltip>
                  );
                })}
              </div>

              /* ── Standard Select with Icons ──────────────────────── */
            ) : isSelectField ? (
              <Select onValueChange={field.onChange} value={field.value || ""}>
                <SelectTrigger className="bg-background w-full">
                  <SelectValue placeholder={`Select ${name}`} />
                </SelectTrigger>
                <SelectContent>
                  {selectOptions[name]?.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className="flex items-center gap-2">
                        {option.icon && <span className="flex-shrink-0">{option.icon}</span>}
                        {option.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              /* ── Text Input ─────────────────────────────────────── */
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <FloatingLabelInput
                    id={htmlId}
                    label={labelContent}
                    className="bg-background"
                    {...field}
                  />
                </div>
                {description && (
                  <TooltipProvider>
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground/50 cursor-help hover:text-foreground transition-colors" />
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-[300px] text-xs">
                        <p>{description}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            )}

          </FormControl>

          {/* ── Provider Hints ─────────────────────────────────────── */}
          {providerHints && providerHints.length > 0 && (
            <div className="mt-3">
              <div className="flex flex-wrap gap-2">
                {providerHints.map((provider) => (
                  <TooltipProvider key={provider.name}>
                    <Tooltip delayDuration={200}>
                      <TooltipTrigger asChild>
                        <a
                          href={provider.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/80 hover:border-primary/30 transition-all text-xs group decoration-transparent"
                        >
                          <provider.icon className={`h-3.5 w-3.5 ${provider.color}`} />
                          <span className="font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                            {provider.name}
                          </span>
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-semibold leading-none",
                            provider.tier === "Free"
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                          )}>
                            {provider.tier}
                          </span>
                          <ExternalLink className="h-2.5 w-2.5 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-[250px] text-xs">
                        <p>{provider.info}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            </div>
          )}

          <FormMessage />
        </FormItem>
      )}
    />
  );
}