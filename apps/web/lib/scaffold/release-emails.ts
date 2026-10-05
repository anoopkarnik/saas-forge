import db from "@workspace/database/client";
import { sendReleaseEmail } from "@workspace/email/resend/release";
import { listProjectsForOwners } from "@/lib/scaffold/project-service";
import { affects, compareVersions } from "@/lib/scaffold/release-notes";
import { loadReleases } from "@/lib/scaffold/releases";
import { getTemplateVersion } from "@/lib/scaffold/template-version";

/**
 * Release emails for the Upgrade Center: opt-in per owner, one email per
 * (owner, release), listing only what changed in their projects. Platform-only.
 */

export class ReleaseNotFoundError extends Error {
  name = "ReleaseNotFoundError";
}

export async function isSubscribedToReleaseEmails(userId: string): Promise<boolean> {
  return !!(await db.releaseEmailSubscription.findUnique({ where: { userId }, select: { userId: true } }));
}

export async function setReleaseEmailSubscription(userId: string, subscribed: boolean): Promise<void> {
  if (subscribed) {
    await db.releaseEmailSubscription.upsert({ where: { userId }, create: { userId }, update: {} });
  } else {
    await db.releaseEmailSubscription.deleteMany({ where: { userId } });
  }
}

/** Published releases up to the deployed starter version, oldest first. */
function deployedReleases() {
  return loadReleases().filter((release) => compareVersions(release.version, getTemplateVersion()) <= 0);
}

/** The newest deployed release and how far its emails got (admin card). */
export async function getReleaseEmailStatus() {
  const latest = deployedReleases().at(-1);
  const subscribers = await db.releaseEmailSubscription.count();
  if (!latest) return { version: null, subscribers, sent: 0 };
  const sent = await db.releaseEmail.count({ where: { version: latest.version } });
  return { version: latest.version, subscribers, sent };
}

export type SendReleaseEmailsResult = { sent: number; skipped: number; failed: number };

/**
 * Emails every subscriber with a project the release changes. Safe to run again:
 * the (owner, version) row is claimed before sending, so nobody gets a release
 * twice; a failed send gives the claim back for the next run.
 */
export async function sendReleaseEmails(
  version: string,
  send: typeof sendReleaseEmail = sendReleaseEmail,
): Promise<SendReleaseEmailsResult> {
  const release = deployedReleases().find((entry) => entry.version === version);
  if (!release) throw new ReleaseNotFoundError(`No published release notes for ${version}.`);

  const subscribers = await db.releaseEmailSubscription.findMany({
    select: { user: { select: { id: true, email: true } } },
  });
  const projects = await listProjectsForOwners(subscribers.map(({ user }) => user.id));
  const upgradeLink = `${process.env.NEXT_PUBLIC_URL ?? ""}/projects`;

  const result: SendReleaseEmailsResult = { sent: 0, skipped: 0, failed: 0 };
  for (const { user } of subscribers) {
    const changed = projects
      .filter((project) => project.userId === user.id && compareVersions(project.templateVersion, version) < 0)
      .map((project) => ({
        name: project.name,
        entries: release.entries.filter((entry) => affects(entry, project.modules)),
      }))
      .filter((project) => project.entries.length > 0);
    if (changed.length === 0) {
      result.skipped++;
      continue;
    }

    try {
      await db.releaseEmail.create({ data: { userId: user.id, version } });
    } catch (error) {
      if ((error as { code?: string }).code === "P2002") {
        result.skipped++;
        continue;
      }
      throw error;
    }

    const delivered = await send({
      email: user.email,
      version,
      highlights: release.highlights,
      projects: changed,
      upgradeLink,
    }).catch(() => false);
    if (delivered) {
      result.sent++;
    } else {
      result.failed++;
      await db.releaseEmail.delete({ where: { userId_version: { userId: user.id, version } } }).catch(() => {});
    }
  }
  return result;
}
