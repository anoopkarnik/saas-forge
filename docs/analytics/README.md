# Product analytics: the downloader funnel

SaaS Forge uses the same `analytics` module it sells (`packages/analytics`; setup, starter events and privacy rules are in its README). This page lists the events only the platform sends. They measure the path from opening the wizard to downloading and upgrading a starter.

Google Analytics and the `/admin/seo` report are separate. They cover marketing traffic, and nothing here feeds them.

## Where the events live

The platform-only event types are declared in `apps/web/lib/scaffold/analytics-events.ts`. That file adds them to the starter's `AnalyticsEvents` map through TypeScript module augmentation. `apps/web/lib/scaffold` is excluded from the template, so the events are type-checked here and never ship to buyers. The wizard (`packages/ui`, which does ship) knows nothing about analytics. It reports through its optional `onEvent` prop, and only the platform's home page passes one.

## Events

Names are stable: add events, never rename them.

| Event | Properties | Sent when | From |
| --- | --- | --- | --- |
| `wizard.opened` | `modulesAvailable` | The wizard loads its catalog | browser |
| `wizard.step_viewed` | `step` (`start`, `basics`, `features`, `accounts`, `review`), `index` | A step is shown | browser |
| `wizard.preset_selected` | `preset` | A preset is applied (presets are currently disabled) | browser |
| `wizard.module_toggled` | `module`, `selected` | A module is switched on or off | browser |
| `scaffold.quote_shown` | `totalCredits`, `modules` | The review step shows the price | browser |
| `wizard.preview_opened` | `view` (`folder` or `exact`) | The buyer opens a folder in the file preview or asks for the exact build | browser |
| `wizard.project_saved` | `modules`, `platforms` | A wizard configuration is saved as a project | browser |
| `scaffold.download_started` | `source` (`web` or `api`), `modules`, `platforms`, `free` | A download is requested | server |
| `scaffold.download_completed` | `source`, `modules`, `cacheHit`, `charged` | The archive is built and the job marked ready | server |
| `scaffold.download_failed` | `source`, `modules`, `error` (`insufficient_credits`, `charge_failed`, `build_failed`) | Charging or building fails | server |
| `upgrade.preview_viewed` | `addedModules`, `deltaCredits` | The upgrade preview is loaded (each load is counted) | server |
| `upgrade.purchased` | `source`, `addedModules`, `tierSteps`, `deltaCredits` | An upgrade kit is charged and returned | server |
| `mcp.quote_viewed` | `kind` (`download`, `upgrade`, or `release` for a free release kit), `credits`, `modules` (the build's, or the ones being added) | An agent calls `quote_download` or `quote_upgrade` on `/api/mcp` | server |

Agents buy through the CLI, so an MCP quote that leads to a purchase shows up as `mcp.quote_viewed` followed by a `source: "api"` download or upgrade from the same user.

CLI downloads are `scaffold.download_*` events with `source: "api"`. The spec named a separate `cli.download` event, but one event with a source property is easier to chart.

## Dashboard

`posthog-downloader-funnel.json` is a PostHog dashboard template (the format PostHog uses for dashboard templates, with `FunnelsQuery` and `TrendsQuery` tiles). It contains:

- **Wizard to download:** opened → quote shown → project saved → download completed.
- **Wizard step drop-off:** `wizard.step_viewed` for each of the five steps.
- **Preview to save:** whether buyers who open the file preview save a project.
- **Modules selected**, **downloads by source**, **build cache hits** and **download failures** by reason.
- **Upgrade preview to purchase.**

If your PostHog version cannot import templates, each tile's `query` shows the events and filters needed to build the insight by hand.

## Not instrumented

The spec's opt-in `doctor.completed` ping is not built. It would put SaaS Forge's PostHog key into every starter and send data from buyers' machines to SaaS Forge, which is a product and privacy decision to make first.
