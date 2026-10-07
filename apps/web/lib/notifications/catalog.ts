/**
 * Every notification type: who sees it where by default, and its text. Emit
 * one with `notify(definition, userId, data)` (./notify). Types of other
 * modules sit in that module's marker region, so a download lists only the
 * types it can send.
 */

export const CHANNELS = ["in_app", "email"] as const;
export type Channel = (typeof CHANNELS)[number];

export type NotificationContent = {
  title: string;
  body: string;
  /** App path the notification opens, e.g. "/projects". */
  link?: string | null;
};

export type NotificationDefinition<T> = {
  type: string;
  label: string;
  defaults: Record<Channel, boolean>;
  render: (data: T) => NotificationContent;
};

const definitions = new Map<string, NotificationDefinition<unknown>>();

function defineNotification<T>(definition: NotificationDefinition<T>): NotificationDefinition<T> {
  // Stored type-erased; notify() gets back the typed definition from the caller.
  definitions.set(definition.type, definition as unknown as NotificationDefinition<unknown>);
  return definition;
}

export function getNotification(type: string): NotificationDefinition<unknown> | undefined {
  return definitions.get(type);
}

export function listNotifications(): NotificationDefinition<unknown>[] {
  return [...definitions.values()];
}

export const invitationSent = defineNotification<{ email: string }>({
  type: "invitation.sent",
  label: "Invitation sent",
  defaults: { in_app: true, email: false },
  render: ({ email }) => ({ title: "Invitation sent", body: `We emailed an invitation to ${email}.`, link: "/admin/users" }),
});

// scaffold:begin billing
export const paymentSucceeded = defineNotification<{ credits: number }>({
  type: "payment.succeeded",
  label: "Payment received",
  defaults: { in_app: true, email: true },
  render: ({ credits }) => ({ title: "Payment received", body: `${credits} credits were added to your account.`, link: "/" }),
});

export const paymentFailed = defineNotification<{ reason?: string }>({
  type: "payment.failed",
  label: "Payment failed",
  defaults: { in_app: true, email: true },
  render: ({ reason }) => ({
    title: "Payment failed",
    body: `Your payment did not go through${reason ? `: ${reason}` : ""}. No credits were added.`,
    link: "/",
  }),
});

export const usageThreshold = defineNotification<{ percent: number; remaining: number }>({
  type: "usage.threshold",
  label: "Credit usage alerts",
  defaults: { in_app: true, email: true },
  render: ({ percent, remaining }) => ({
    title: `You've used ${percent}% of your credits`,
    body: `${remaining} credits left. See what used them on the Usage page.`,
    link: "/usage",
  }),
});
// scaffold:end billing

// scaffold:begin ai
export const CREDITS_LOW_THRESHOLD = 10;

export const creditsLow = defineNotification<{ remaining: number }>({
  type: "credits.low",
  label: "Credits running low",
  defaults: { in_app: true, email: true },
  render: ({ remaining }) => ({
    title: "Credits running low",
    body: `You have ${remaining} credits left. Top up to keep using AI features.`,
    link: "/",
  }),
});
// scaffold:end ai

// scaffold:begin multi_tenancy
export const organizationInvited = defineNotification<{ organizationName: string; inviterName: string; invitationId: string }>({
  type: "organization.invited",
  label: "Organization invitations",
  defaults: { in_app: true, email: false },
  render: ({ organizationName, inviterName, invitationId }) => ({
    title: `Invitation to ${organizationName}`,
    body: `${inviterName} invited you to join ${organizationName}.`,
    link: `/accept-invitation/${invitationId}`,
  }),
});
// scaffold:end multi_tenancy

// scaffold:begin webhooks
export const webhookDisabled = defineNotification<{ url: string; failures: number }>({
  type: "webhook.disabled",
  label: "Webhook endpoint disabled",
  defaults: { in_app: true, email: true },
  render: ({ url, failures }) => ({
    title: "Webhook endpoint disabled",
    body: `${url} failed ${failures} times in a row, so deliveries to it are paused. Fix it, then turn it back on in Settings → Webhooks.`,
    link: "/",
  }),
});
// scaffold:end webhooks
