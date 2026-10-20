# @workspace/analytics

Product analytics: typed events sent to [PostHog](https://posthog.com) (cloud or self-hosted). Google Analytics and the `/admin/seo` report are separate. They measure marketing traffic and are configured in Settings, not here.

## Setup

Set these in `apps/web/.env`:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_POSTHOG_KEY` | The project API key (`phc_…`), from PostHog → Project settings. It is public by design. |
| `NEXT_PUBLIC_POSTHOG_HOST` | Optional. Defaults to `https://us.i.posthog.com`. Use `https://eu.i.posthog.com` for EU cloud or your own host. |

The adapter is chosen from the environment:

- **posthog** when the key is set.
- **console** in development without a key: events are logged as `[analytics] <event> {…}`.
- **none** otherwise: nothing is sent and PostHog is never loaded.

## Sending an event

1. Add it to `src/events.ts` with its properties. If a module owns it, put it inside that module's `scaffold:begin` markers.
2. Track it, also inside the module's markers and wrapped in `analytics` markers when the file belongs to another module:

```ts
// Server (route handlers, tRPC, Better Auth hooks): awaited, gives up after 1s, never throws.
import { track } from "@workspace/analytics/server";
await track("org.created", { organizationId }, { distinctId: userId, headers: ctx.headers, groups: { organization: organizationId } });

// Browser
import { track } from "@workspace/analytics/client";
track("auth.signed_in", { method: "email" });
```

Unknown events and wrong properties fail typecheck. Event names are stable: add new events rather than renaming old ones, because dashboards query the names. Properties are ids, counts and enums only. Never send emails, names or free text.

## Events

Each entry gives the event, its properties and when it is sent.

- `auth.signed_up` (`method`: `email` or the OAuth provider): a user account is created.
- `auth.signed_in` (`method`): a session starts, except admin impersonation.
- `onboarding.step_completed` (`step`: a task key, or `wizard`): a manual checklist task is completed, or the welcome wizard is finished.
- `billing.checkout_started` (`credits`, `gateway`): a checkout session is created.
- `billing.checkout_completed` (`credits`, `gateway`): the payment webhook credits the account, once per payment.
- `ai.chat_sent` (`provider`, `model`): a chat message is accepted.
- `org.created` (`organizationId`): a user creates a workspace.
- `org.member_invited` (`organizationId`, `role`): a workspace invitation is sent.

The browser also records `$pageview` and `$pageleave`. Signed-in visitors are identified by user id, and grouped by their active workspace when the project has `multi_tenancy`.
Checklist tasks completed from data (such as uploading an avatar) emit no event.

`posthog-activation-dashboard.json` is a PostHog dashboard template for these events: a sign-up → sign-in funnel, sign-ups by method and returning users.

## Privacy

- **No autocapture.** Clicks and input values are never recorded, and session recording and surveys are off.
- **Ids only.** `identify` sends the user id with no traits, and server events carry ids, counts and enums.
- **Opt-out is honoured.** If the browser sends Do Not Track or Global Privacy Control, or the visitor declined the banner (`sf_analytics_consent=denied`), PostHog is not loaded. Server events that run in that visitor's request are skipped too.
- **Consent banner.** Off by default. Turn it on in **Settings → Analytics → Ask visitors before product analytics** (`analytics.consentRequired`). While it is on, PostHog loads only after the visitor accepts, and the choice is kept for a year.
- **IP addresses.** PostHog stores the sender's IP unless you turn on **Discard client IP data** in its project settings. Do this for anonymised IPs. The SDK option for it no longer has any effect. Server events come from your server, so the IP PostHog records for them is your server's, not the user's.
- **Requests with no visitor.** Payment webhooks (`billing.checkout_completed`) carry the user id but no visitor request, so an earlier decline cannot be seen there. Remove that call if your policy requires it.
