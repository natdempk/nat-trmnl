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

## MBTA Plugin

- **Route**: `/mbta`
- **Data**: Next trains at Davis inbound (direction_id=1, towards Ashmont/Braintree), Red Line subway status, service alerts
- **Status logic**: Mirrors mbta.com/alerts/subway — `cause=MAINTENANCE` alerts are "Planned Work" (don't affect subway status). Only non-maintenance active alerts change status from "Normal Service".
- **API**: MBTA V3 API (api-v3.mbta.com). Optional API key via `wrangler secret put MBTA_API_KEY`.

## Development

- `cd worker && pnpm dev` — run worker locally on port 8787
- `cd mbta && trmnlp serve` — preview templates locally on port 4567 (polls worker for live data)
- `mbta/src/settings.yml` has `polling_url` pointed at localhost for dev; update before pushing to trmnl.com
- Templates use inline `<style>` blocks with `!important` to override TRMNL framework fonts (sans-serif)

## Deployment

- `cd worker && pnpm deploy` — deploy worker to Cloudflare
- `cd mbta && trmnlp push` — push templates to trmnl.com
- Set polling_url in trmnl.com private plugin settings to the deployed worker URL + `/mbta`
