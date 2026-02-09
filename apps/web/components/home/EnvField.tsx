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
import { Info } from "lucide-react";
import { FormValues } from "@/lib/zod/download";
import { FloatingLabelInput } from "@workspace/ui/components/misc/floating-label-input";

// Module Configuration
import { selectOptions } from "@/lib/constants/options";

// Helper component for env var fields
export default function EnvField({
  control,
  name,
  label,
  description,
}: {
  control: any;
  name: keyof FormValues;
  label?: string;
  description?: string;
}) {
  // Define select options for specific fields


  const isSelectField = name in selectOptions;

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          {isSelectField && (
            <div className="flex items-center gap-2 mb-1.5">
              <FormLabel className="text-xs font-medium text-muted-foreground">
                {label || name}
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
            {isSelectField ? (
              <Select onValueChange={field.onChange} value={field.value || ""}>
                <SelectTrigger className="bg-background w-full">
                  <SelectValue placeholder={`Select ${name}`} />
                </SelectTrigger>
                <SelectContent>
                  {selectOptions[name]?.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <FloatingLabelInput
                    id={name}
                    label={name}
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
          <FormMessage />
        </FormItem>
      )}
    />
  );
}