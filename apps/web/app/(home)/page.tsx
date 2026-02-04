"use client";

import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@workspace/ui/components/shadcn/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@workspace/ui/components/shadcn/accordion";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@workspace/ui/components/shadcn/form";
import { Input } from "@workspace/ui/components/shadcn/input";

const formSchema = z.object({
  name: z
    .string()
    .min(1, "Project name is required")
    .max(80, "Keep it under 80 characters")
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/, "Use letters, numbers, dot, underscore, or hyphen"),
});

type FormValues = z.infer<typeof formSchema>;

export default function Page() {
  const [downloadHref, setDownloadHref] = React.useState<string>("");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "" },
    mode: "onChange",
  });

  const nameValue = form.watch("name");

  React.useEffect(() => {
    const name = (nameValue || "").trim();
    if (!name) {
      setDownloadHref("");
      return;
    }

    // keep frontend consistent with your server sanitizer (basic)
    const safeName = name
      .replace(/[^\w.-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);

    setDownloadHref(`/api/scaffold?name=${encodeURIComponent(safeName)}`);
  }, [nameValue]);

  const onSubmit = (values: FormValues) => {
    // Build the download URL and trigger download
    const safeName = values.name
      .trim()
      .replace(/[^\w.-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);

    const url = `/api/scaffold?name=${encodeURIComponent(safeName)}`;
    window.location.href = url;
  };

  return (
    <div className="flex min-h-svh p-4">
      <div className="w-full max-w-xl">
        <h1 className="text-2xl font-bold">Download Turborepo Starter</h1>
        <p className="text-muted-foreground mt-2">
          Give your project a name and I’ll package the full monorepo as a ZIP.
        </p>

        <div className="mt-6">
          <Accordion type="single" collapsible defaultValue="project">
            <AccordionItem value="project">
              <AccordionTrigger>Project settings</AccordionTrigger>
              <AccordionContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. anoop-saas-starter" {...field} />
                          </FormControl>
                          <FormDescription>
                            Allowed: letters, numbers, <span className="font-mono">.</span>{" "}
                            <span className="font-mono">_</span>{" "}
                            <span className="font-mono">-</span>
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Button type="submit" disabled={!form.formState.isValid}>
                        Download ZIP
                      </Button>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      Prefer the terminal?{" "}
                      <span className="font-mono">npx saas-forge@latest</span>
                    </p>
                  </form>
                </Form>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="notes">
              <AccordionTrigger>Notes</AccordionTrigger>
              <AccordionContent>
                <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2">
                  <li>
                    This downloads a ZIP containing your full Turborepo structure (
                    <span className="font-mono">apps/</span>, <span className="font-mono">packages/</span>, etc.)
                    under a root folder named after your project.
                  </li>
                  <li>
                    Make sure your template does not contain real <span className="font-mono">.env</span> secrets.
                    Keep <span className="font-mono">.env.example</span> instead.
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </div>
  );
}
