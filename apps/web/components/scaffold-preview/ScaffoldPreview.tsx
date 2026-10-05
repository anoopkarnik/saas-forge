"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, FileCode2, Loader2 } from "lucide-react";
import { Badge } from "@workspace/ui/components/shadcn/badge";
import { Button } from "@workspace/ui/components/shadcn/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/shadcn/card";
import {
  composePreview,
  diffPreview,
  type PreviewFile,
} from "@workspace/ui/lib/scaffold-preview";
import { useScaffoldTRPC } from "@/trpc/scaffold-client";

type Selection = { modules: string[]; platforms: Array<"web" | "desktop" | "mobile"> };

const MODULE_DOT: Record<string, string> = {
  billing: "bg-emerald-500",
  multi_tenancy: "bg-sky-500",
  ai: "bg-violet-500",
  ai_agents: "bg-fuchsia-500",
  api_keys: "bg-amber-500",
};

function ModuleDot({ module }: { module: string | null }) {
  if (!module) return null;
  return <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${MODULE_DOT[module] ?? "bg-muted-foreground"}`} title={module} />;
}

/** Top two path segments: apps/web, packages/ui, README.md… */
function folderOf(file: PreviewFile) {
  return file.path.split("/").slice(0, 2).join("/");
}

/**
 * Pre-purchase preview of the current wizard selection: totals, what the last
 * toggle changed, a folder tree, and read-only snippets of allow-listed files.
 * Root-only (passed to the wizard through `renderPreview`).
 */
export function ScaffoldPreview({ modules, platforms }: Selection) {
  const trpc = useScaffoldTRPC();
  const index = useQuery({ ...trpc.scaffold.previewIndex.queryOptions(), staleTime: Infinity });
  const [exact, setExact] = React.useState(false);
  const [openFolder, setOpenFolder] = React.useState<string | null>(null);
  const [snippetPath, setSnippetPath] = React.useState<string | null>(null);

  const selection = React.useMemo(() => ({ modules, platforms }), [modules, platforms]);
  const previous = React.useRef<Selection | null>(null);
  const [lastChange, setLastChange] = React.useState<ReturnType<typeof diffPreview> | null>(null);

  React.useEffect(() => {
    if (index.data && previous.current) {
      const change = diffPreview(index.data, previous.current, selection);
      if (change.added.length || change.removed.length) setLastChange(change);
    }
    previous.current = selection;
  }, [index.data, selection]);

  const build = useQuery({
    ...trpc.scaffold.previewBuild.queryOptions(selection),
    enabled: exact,
  });
  const snippet = useQuery({
    ...trpc.scaffold.previewSnippet.queryOptions({ ...selection, path: snippetPath ?? "" }),
    enabled: !!snippetPath,
  });

  if (!index.data) {
    return index.isLoading ? (
      <Card className="border-border/60 shadow-sm">
        <CardContent className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Preparing the file preview…
        </CardContent>
      </Card>
    ) : null;
  }

  const preview = composePreview(index.data, modules, platforms);
  const folders = new Map<string, PreviewFile[]>();
  for (const file of preview.files) {
    const folder = folderOf(file);
    folders.set(folder, [...(folders.get(folder) ?? []), file]);
  }

  const stats: Array<[string, number]> = [
    ["files", preview.totals.files],
    ["lines", preview.totals.lines],
    ["routes", preview.totals.routes],
    ["tRPC routers", preview.totals.procedures],
    ["Prisma models", preview.totals.models],
    ["env vars", preview.totals.envVars],
  ];

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">What you get</CardTitle>
        <CardDescription>The files in your download, before you pay.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <dl className="grid grid-cols-2 gap-2">
          {stats.map(([label, value]) => (
            <div key={label} className="rounded-lg bg-muted/40 px-3 py-2">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="font-semibold tabular-nums">{value.toLocaleString()}</dd>
            </div>
          ))}
        </dl>

        {lastChange ? (
          <div className="rounded-lg border border-border/60 p-3">
            <p className="font-medium">Last change</p>
            <p className="text-xs text-muted-foreground">
              <span className="text-emerald-600 dark:text-emerald-400">+{lastChange.added.length} files</span>
              {" · "}
              <span className="text-red-600 dark:text-red-400">−{lastChange.removed.length} files</span>
            </p>
            <ul className="mt-2 max-h-40 space-y-0.5 overflow-auto font-mono text-xs">
              {lastChange.added.slice(0, 50).map((file) => (
                <li key={`+${file.path}`} className="text-emerald-600 dark:text-emerald-400">+ {file.path}</li>
              ))}
              {lastChange.removed.slice(0, 50).map((file) => (
                <li key={`-${file.path}`} className="text-red-600 dark:text-red-400">− {file.path}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <ul className="space-y-1">
          {[...folders].sort(([a], [b]) => a.localeCompare(b)).map(([folder, files]) => {
            const owners = [...new Set(files.map((file) => file.module).filter(Boolean))] as string[];
            const open = openFolder === folder;
            return (
              <li key={folder}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-left hover:bg-muted/50"
                  onClick={() => setOpenFolder(open ? null : folder)}
                  aria-expanded={open}
                >
                  <ChevronRight className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
                  <span className="font-mono text-xs">{folder}</span>
                  <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                    {owners.map((owner) => <ModuleDot key={owner} module={owner} />)}
                    {files.length}
                  </span>
                </button>
                {open ? (
                  <ul className="ml-6 max-h-60 space-y-0.5 overflow-auto font-mono text-xs text-muted-foreground">
                    {files.map((file) => (
                      <li key={file.path} className="flex items-center gap-1.5">
                        <ModuleDot module={file.module} />
                        {file.path.slice(folder.length + 1) || file.path}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>

        <div className="flex flex-wrap gap-1.5">
          {Object.keys(MODULE_DOT)
            .filter((module) => modules.includes(module))
            .map((module) => (
              <Badge key={module} variant="outline" className="gap-1.5">
                <ModuleDot module={module} /> {module}
              </Badge>
            ))}
        </div>

        <div className="space-y-2 border-t pt-3">
          <Button type="button" size="sm" variant="outline" onClick={() => setExact(true)} disabled={exact}>
            <FileCode2 className="mr-2 h-4 w-4" /> Exact build and file samples
          </Button>
          {exact && build.isLoading ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Building your selection…
            </p>
          ) : null}
          {build.data ? (
            <>
              <p className="text-xs text-muted-foreground">
                The exact build has {build.data.files.length.toLocaleString()} files. Read a sample:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {build.data.snippetPaths.map((path) => (
                  <Button
                    key={path}
                    type="button"
                    size="sm"
                    variant={snippetPath === path ? "default" : "ghost"}
                    className="h-7 font-mono text-xs"
                    onClick={() => setSnippetPath(snippetPath === path ? null : path)}
                  >
                    {path}
                  </Button>
                ))}
              </div>
              {snippetPath && snippet.data ? (
                <pre className="max-h-80 overflow-auto rounded-lg bg-muted/40 p-3 text-xs">{snippet.data}</pre>
              ) : null}
            </>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
