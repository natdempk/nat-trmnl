# nat-trmnl

Custom TRMNL e-ink display plugins, hosted on Cloudflare Workers.

## Instructions
- Always use pnpm + pnpx, never npm + npx. Use `pnpm exec` for running local binaries.
- Always write TypeScript, never plain JavaScript.
- Worker code lives in `worker/`, templates in per-plugin dirs (e.g. `mbta/`).

## Architecture

```
TRMNL Cloud --polls--> Cloudflare Worker --fetches--> External APIs
                       (returns JSON)
TRMNL renders Liquid templates with the JSON merge_variables, converts to BMP, sends to device.
```

- **worker/**: Cloudflare Worker (TypeScript). Single worker with a route per plugin. Returns `{ merge_variables: {...}, ...vars }` — `merge_variables` is for TRMNL, top-level spread is for trmnlp local preview.
- **mbta/**: MBTA Red Line plugin. Templates developed with `trmnlp`, pushed to trmnl.com via `trmnlp push`.
- **calendar/**: Google Calendar plugin. Displays household calendar events in today/tomorrow/weekend/upcoming sections.

## MBTA Plugin

- **Route**: `/mbta`
- **Data**: Next trains at Davis inbound (direction_id=1, towards Ashmont/Braintree), Red Line subway status, service alerts
- **Status logic**: Mirrors mbta.com/alerts/subway — `cause=MAINTENANCE` alerts are "Planned Work" (don't affect subway status). Only non-maintenance active alerts change status from "Normal Service".
- **API**: MBTA V3 API (api-v3.mbta.com). Optional API key via `wrangler secret put MBTA_API_KEY`.

## Calendar Plugin

- **Route**: `/calendar`
- **Data**: Fetches Google Calendar iCal feed, parses with `ical.js` (handles recurring events, timezones)
- **Sections**: Today (time + title + location, past events filtered), Tomorrow (time + title), This Weekend (time + title), Upcoming (multi-day all-day events shown as date range + title)
- **Weekend logic**: On Sun, weekend = today. On Mon–Fri, weekend = next Sat+Sun. On Sat, weekend = today+tomorrow.
- **Secret**: `GOOGLE_CALENDAR_ICS_URL` — the private iCal URL from Google Calendar settings

## Design Principles

These are e-ink dashboard widgets viewed at a glance from 3–5 inches away. Design accordingly:

- **Glanceability over completeness** — show the most important info large and bold. Don't try to fit everything; prioritize ruthlessly. Primary info (today's events, next train) should be readable from across a room.
- **Font sizes matter** — quadrant is ~400x300px. Primary content 19px+, secondary 16px+, labels/headers 13-16px. Never go below 13px. Use font weight (700 vs 400) and opacity (0.5) for hierarchy instead of many size tiers.
- **Two-column layout for lists** — fixed-width date/time column + flexible title column. Titles truncate with ellipsis. Consistent column alignment across sections.
- **Sections hide when empty** — don't show "Nothing planned" placeholders. Use the space for lower-priority content instead.
- **Fill the space intelligently** — if primary sections are sparse, backfill with lower-priority content (e.g. "Later" events). Cap item counts dynamically based on what else is showing.
- **Time-aware filtering** — hide past events, show only what's actionable. The display should always feel current.
- **Sans-serif fonts** — override TRMNL framework fonts with system sans-serif via inline `<style>` blocks with `!important`.
- **E-ink constraints** — no color, no gradients. Use solid black/white fills (e.g. inverted bars for all-day events), borders, and opacity for visual differentiation. Keep line weights at 2px+ for visibility.
- **Use `agent-browser` to visually verify** — always screenshot the quadrant preview to check that content fits, columns align, and text is readable at the target size.

## Development

- `cd worker && pnpm dev` — run worker locally on port 8787
- `cd mbta && trmnlp serve` — preview templates locally on port 4567 (polls worker for live data)
- `cd calendar && trmnlp serve` — preview calendar templates (polls worker for live data)
- `mbta/src/settings.yml` and `calendar/src/settings.yml` have `polling_url` pointed at localhost for dev; update before pushing to trmnl.com
- Templates use inline `<style>` blocks with `!important` to override TRMNL framework fonts (sans-serif)
- `agent-browser open http://127.0.0.1:4567/quadrant && agent-browser screenshot /tmp/screenshot.png` — screenshot template previews for visual verification (use `agent-browser click @ref` with refs from `agent-browser snapshot -i` to interact, e.g. click Poll to refresh data)

## Deployment

- `cd worker && pnpm deploy` — deploy worker to Cloudflare
- `cd mbta && trmnlp push` / `cd calendar && trmnlp push` — push templates to trmnl.com
- Set polling_url in trmnl.com private plugin settings to the deployed worker URL + `/mbta` or `/calendar`
- `wrangler secret put GOOGLE_CALENDAR_ICS_URL` — set calendar iCal URL for production
