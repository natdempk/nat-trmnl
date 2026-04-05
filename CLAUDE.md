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
- **Two-column layout for lists** — fixed-width date/time column + flexible title column. Prefer CSS grid over inline/flex text runs for these rows. Titles truncate with ellipsis, and the date/time column itself must also clip/ellipsis so long date labels can't paint into the title column.
- **Split text + art layouts** — when a widget is a text column plus a right-side image, keep the text on one consistent scale/weight family, let the text column be the flexible side, and let the art column size itself from height/aspect rather than from arbitrary percentages whenever possible.
- **Sections hide when empty** — don't show "Nothing planned" placeholders. Use the space for lower-priority content instead.
- **Fill the space intelligently** — if primary sections are sparse, backfill with lower-priority content (e.g. "Later" events). Cap item counts dynamically based on what else is showing.
- **Time-aware filtering** — hide past events, show only what's actionable. The display should always feel current.
- **Compact date ranges** — for multi-day calendar items, use `May 1-3` when start/end are in the same month; include both months only when they differ.
- **Sans-serif fonts** — override TRMNL framework fonts with system sans-serif via inline `<style>` blocks with `!important`.
- **E-ink constraints** — no color, no gradients. Use solid black/white fills (e.g. inverted bars for all-day events), borders, and opacity for visual differentiation. Keep line weights at 2px+ for visibility.
- **Typography consistency** — inside a single text block or stats column, prefer one primary text size with small spacing changes over mixing many framework text scales. Use lighter divider rules before adding more type hierarchy.
- **Use `agent-browser` to visually verify** — always screenshot the quadrant preview to check that content fits, columns align, and text is readable at the target size.

## Development

- `cd worker && pnpm dev` — run worker locally on port 8787
- `cd mbta && trmnlp serve` — preview templates locally on port 4567 (polls worker for live data)
- `cd calendar && trmnlp serve` — preview calendar templates (polls worker for live data)
- `mbta/src/settings.yml` and `calendar/src/settings.yml` have `polling_url` pointed at localhost for dev; update before pushing to trmnl.com
- Templates use inline `<style>` blocks with `!important` to override TRMNL framework fonts (sans-serif)
- `agent-browser open http://127.0.0.1:4567/quadrant && agent-browser screenshot /tmp/screenshot.png` — screenshot template previews for visual verification (use `agent-browser click @ref` with refs from `agent-browser snapshot -i` to interact, e.g. click Poll to refresh data). Before taking a verification screenshot, switch the preview device selector to `TRMNL X`; if the picker still shows `TRMNL OG`, the screenshot is not valid for this repo’s target platform.
- Recommended `agent-browser` flow for this repo: `open /quadrant`, use `snapshot -i` to find the model selector, switch it to `TRMNL X`, wait for the iframe to finish rerendering, and only then take the screenshot. If the screenshot looks wrong, first confirm the picker still says `TRMNL X` before debugging the template itself.
- For layout debugging, you can inspect `http://127.0.0.1:4567/render/quadrant.html?...` directly, but final sign-off should be based on `http://127.0.0.1:4567/quadrant`.
- In practice, the raw `render/quadrant.html?...` view and the `/quadrant` preview shell can feel different enough to mislead layout work. Use `/quadrant` as the canonical validation view and only use the direct render URL as a debugging aid.
- When viewing the quadrant previews, you must select TRMNL X to ensure we are previewing for the right platform. If you see "TRMNL OG" we are on the wrong preview and our results will be incorrect. We only care about supporting TRMNL X.
- Before writing custom layout CSS for TRMNL X plugins, read the official v3 framework docs starting with the TRMNL X guide: `https://trmnl.com/framework/docs/v3/trmnl_x_guide.md`. Prefer the built-in framework primitives (`layout`, `flex`, `grid`, `title_bar`, `image image--cover`, typography classes like `title` / `value` / `label` / `description`, and runtime helpers like `data-clamp`) over absolute positioning or bespoke sizing when the framework can already solve the problem.
- If you do need custom layout CSS, avoid mixing framework layout utilities (`flex--row`, `grow`, `stretch-y`, etc.) with custom `display/grid/flex` rules on the same element unless you're certain they agree. When layout starts behaving unpredictably, simplify to one layout system per container.

## Handoff Notes

- The worker route (for example `/prenatal`) is a JSON API endpoint, not a visual page. To verify the actual widget layout, run `trmnlp serve` for the plugin and inspect `/quadrant`.
- The prenatal plugin currently expects produce images via the worker asset pipeline, not embedded repo-relative template files. The worker returns `fruit_image_url` and the Liquid template should render that URL.
- Prenatal image assets are PNG-only. Use `/prenatal-review` to visually inspect the current week-by-week image set.
- When checking prenatal layout, trust the real `/quadrant` preview page over direct iframe/render URLs.

## Deployment

- `cd worker && pnpm deploy` — deploy worker to Cloudflare
- `cd mbta && trmnlp push` / `cd calendar && trmnlp push` — push templates to trmnl.com
- Set polling_url in trmnl.com private plugin settings to the deployed worker URL + `/mbta` or `/calendar`
- `wrangler secret put GOOGLE_CALENDAR_ICS_URL` — set calendar iCal URL for production
