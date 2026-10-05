"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@workspace/auth/better-auth/auth-client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@workspace/ui/components/shadcn/accordion";
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/shadcn/alert";
import { Badge } from "@workspace/ui/components/shadcn/badge";
import { Button } from "@workspace/ui/components/shadcn/button";
import { Switch } from "@workspace/ui/components/shadcn/switch";
import { useTRPC } from "@/trpc/client";
import { useScaffoldTRPC } from "@/trpc/scaffold-client";

const TYPE_LABEL: Record<string, string> = {
  feature: "New",
  fix: "Fix",
  security: "Security",
  breaking: "Breaking",
};

const TYPE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  feature: "secondary",
  fix: "outline",
  security: "destructive",
  breaking: "destructive",
};

/** Security fixes since the project's version: shown whether or not emails are on. */
export function SecurityBanner({ slug, count }: { slug: string; count: number }) {
  const trpc = useTRPC();
  const releases = useQuery({ ...trpc.project.releases.queryOptions({ slug }), enabled: count > 0 });
  if (count === 0) return null;
  return (
    <Alert variant="destructive">
      <ShieldAlert className="h-4 w-4" />
      <AlertTitle>Security {count === 1 ? "fix" : "fixes"} for this project</AlertTitle>
      <AlertDescription>
        <ul className="list-disc pl-4">
          {(releases.data?.advisories ?? []).map((advisory) => (
            <li key={`${advisory.version}-${advisory.title}`}>
              v{advisory.version}: {advisory.title}
            </li>
          ))}
        </ul>
        Upgrade to get {count === 1 ? "it" : "them"}: merge the template branch, or generate an upgrade kit.
      </AlertDescription>
    </Alert>
  );
}

/** The releases since the project's version, with what changed in its modules. */
export function ReleaseNotesPanel({ slug }: { slug: string }) {
  const trpc = useTRPC();
  const releases = useQuery(trpc.project.releases.queryOptions({ slug }));

  if (releases.isLoading) return <p className="text-muted-foreground">Loading release notes…</p>;
  if (!releases.data) return null;
  if (releases.data.behind === 0) {
    return (
      <p className="text-muted-foreground">
        This project is on the latest starter (v{releases.data.latestVersion}).
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground">
        v{releases.data.currentVersion} → v{releases.data.latestVersion}: {releases.data.behind} release
        {releases.data.behind === 1 ? "" : "s"}. Only changes to this project&apos;s modules are listed.
      </p>
      <Accordion type="multiple" className="rounded-md border px-3">
        {[...releases.data.releases].reverse().map((release) => (
          <AccordionItem key={release.version} value={release.version}>
            <AccordionTrigger>
              v{release.version} · {release.date}
              {release.entries.length === 0 ? " · nothing for this project" : ""}
            </AccordionTrigger>
            <AccordionContent className="flex flex-col gap-2">
              {release.highlights.map((highlight) => (
                <p key={highlight}>{highlight}</p>
              ))}
              <ul className="flex flex-col gap-1">
                {release.entries.map((entry) => (
                  <li key={`${entry.module}-${entry.title}`} className="flex flex-wrap items-center gap-2">
                    <Badge variant={TYPE_VARIANT[entry.type]}>{TYPE_LABEL[entry.type]}</Badge>
                    {entry.module !== "core" ? <Badge variant="outline">{entry.module}</Badge> : null}
                    <span>{entry.title}</span>
                    {entry.migration ? <span className="text-xs text-muted-foreground">(database migration)</span> : null}
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

/** What the upgrade kit for this target would contain, before paying for it. */
export function UpgradePreview({
  slug,
  targetModules,
  targetTierId,
}: {
  slug: string;
  targetModules: string[];
  targetTierId: string;
}) {
  const scaffoldTrpc = useScaffoldTRPC();
  const preview = useQuery(scaffoldTrpc.project.upgradePreview.queryOptions({ slug, targetModules, targetTierId }));

  if (preview.isLoading) return <p className="text-muted-foreground">Comparing builds…</p>;
  if (!preview.data) return null;
  const { files, migrations, warnings } = preview.data;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground">
        The kit stages{" "}
        <span className="font-medium text-foreground">
          {files.added} new and {files.modified} changed files
        </span>
        {files.removed ? ` and lists ${files.removed} to remove` : ""}.
        {migrations.length
          ? ` It adds ${migrations.length} migration${migrations.length === 1 ? "" : "s"}; run pnpm migrate after applying it.`
          : ""}
      </p>
      {warnings.length ? (
        <Alert>
          <AlertTitle>Read before upgrading</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4">
              {warnings.map((warning) => (
                <li key={`${warning.version}-${warning.title}`}>
                  v{warning.version}: {warning.title}
                  {warning.type === "breaking" ? " (breaking)" : ""}
                  {warning.migration ? " (database migration)" : ""}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

/** Opt-in release emails, and for admins the send button for the latest release. */
export function ReleaseEmailSettings() {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  const preference = useQuery(trpc.project.releaseEmails.queryOptions());
  const setPreference = useMutation(
    trpc.project.setReleaseEmails.mutationOptions({
      onSuccess: async ({ subscribed }) => {
        await qc.invalidateQueries({ queryKey: trpc.project.releaseEmails.queryKey() });
        toast.success(subscribed ? "Release emails on" : "Release emails off");
      },
    }),
  );

  const status = useQuery({ ...trpc.project.releaseEmailStatus.queryOptions(), enabled: isAdmin });
  const send = useMutation(
    trpc.project.sendReleaseEmails.mutationOptions({
      onSuccess: async (result) => {
        await qc.invalidateQueries({ queryKey: trpc.project.releaseEmailStatus.queryKey() });
        toast.success(`Sent ${result.sent}, skipped ${result.skipped}, failed ${result.failed}`);
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <div id="release-emails" className="flex flex-col gap-3 rounded-md border p-4 text-sm">
      <label className="flex items-center justify-between gap-4">
        <span>
          <span className="font-medium">Release emails</span>
          <span className="block text-muted-foreground">
            Get an email when a starter release changes one of your projects.
          </span>
        </span>
        <Switch
          checked={preference.data?.subscribed ?? false}
          disabled={preference.isLoading || setPreference.isPending}
          onCheckedChange={(subscribed) => setPreference.mutate({ subscribed })}
        />
      </label>
      {isAdmin && status.data?.version ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
          <span className="text-muted-foreground">
            Admin: v{status.data.version} emailed to {status.data.sent} of {status.data.subscribers} subscribers
            (owners it does not affect are skipped).
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={send.isPending}
            onClick={() => send.mutate({ version: status.data!.version! })}
          >
            {send.isPending ? "Sending…" : `Send v${status.data.version} emails`}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
