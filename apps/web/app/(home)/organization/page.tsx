import { TeamSettingsPanel } from "@/components/organizations/TeamSettingsPanel";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 overflow-y-auto p-6">
      <div>
        <h1 className="page-title">Team</h1>
        <p className="text-sm text-muted-foreground">
          Manage your workspace, its members, their roles, and pending invitations.
        </p>
      </div>
      <TeamSettingsPanel />
    </div>
  );
}
