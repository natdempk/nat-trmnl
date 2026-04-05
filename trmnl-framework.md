# TRMNL Framework Notes

High-level internal notes for building more native-feeling TRMNL plugins in this repo.

This is intentionally selective. For full API details, examples, and token tables, use the official docs:

- Framework v3 index: https://trmnl.com/framework/docs/v3
- TRMNL X guide: https://trmnl.com/framework/docs/v3/trmnl_x_guide
- Structure: https://trmnl.com/framework/docs/v3/structure
- View: https://trmnl.com/framework/docs/v3/view
- Layout: https://trmnl.com/framework/docs/v3/layout
- Framework runtime: https://trmnl.com/framework/docs/v3/framework_runtime
- Responsive: https://trmnl.com/framework/docs/v3/responsive
- Tokens: https://trmnl.com/framework/docs/v3/tokens
- Screen templating: https://docs.trmnl.com/go/private-plugins/templates
- Screen templating, graphics/custom JS: https://docs.trmnl.com/go/private-plugins/templates-advanced
- Reusing shared markup: https://docs.trmnl.com/go/reusing-markup
- Plugin screen generation flow: https://docs.trmnl.com/go/plugin-marketplace/plugin-screen-generation-flow

## Mental Model

TRMNL’s framework is not just a CSS utility layer. It assumes a specific rendering model for fixed-size e-paper screens, with runtime logic that measures the available layout space and then adjusts gaps, text clamping, overflow columns, number formatting, and pixel snapping.

The biggest practical implication for plugin work:

- Prefer framework primitives over bespoke layout CSS.
- Let the runtime solve fitting problems whenever possible.
- Use custom CSS sparingly for visual identity, not for recreating layout primitives the framework already has.

## Canonical Structure

The docs are very explicit about structure:

- The canonical hierarchy is `screen -> (mashup ->) view -> layout (+ optional title_bar)`.
- In the TRMNL platform and normal plugin markup, you usually provide only the `layout` and optional `title_bar`.
- In a custom stack or plain HTML preview, you provide the outer `screen` and `view` wrappers yourself.
- There should be exactly one `layout` per `view`.
- `title_bar` and `layout` must be siblings, not parent/child.

That makes the main authoring rule for this repo:

- Each `.liquid` view should primarily describe the inside of one platform-provided view, not rebuild the full wrapper hierarchy.

## How To Choose Layout Primitives

Use the framework based on content type:

- `layout`: top-level content container inside a view. Use `layout--row` or `layout--col` to arrange direct children.
- `flex`: content-sized horizontal or vertical arrangements where items grow or shrink by content.
- `grid`: strict columns/spans when alignment rhythm matters.
- `columns`: variable-length lists where TRMNL should decide how many columns fit and re-clamp items per column.

Good heuristics:

- Use `flex` for paired rows like `label on left / time on right`.
- Use `grid` when multiple rows must share the same column structure.
- Use `columns` for repeating lists that may grow or shrink over time.
- Do not nest `layout` inside `layout`.

## Typography System

The framework’s main text primitives are:

- `title`: headings.
- `value`: primary numeric or hero text.
- `label`: metadata, pills, badges, short identifiers.
- `description`: supporting copy.
- `content` inside `richtext`: paragraph-like text blocks.

Useful implementation notes:

- v3 adds explicit `--base` modifiers such as `title--base`, `value--base`, `label--base`, `description--base`, which matter in responsive resets.
- TRMNL X adds much larger size tiers, especially for `value`.
- `value--tnums` exists for tabular numbers.
- `label` supports plain, `--outline`, `--underline`, `--gray`, `--filled`, plus semantic variants like `label--primary` and `label--error`.

For this repo, the most relevant pattern is:

- Use framework type roles first, then apply a small amount of custom styling if we want our existing sans-serif/system-font feel.

## Runtime Features Worth Using

The framework runtime is one of the most useful parts of the system:

- `data-clamp="N"` clamps text to N lines with ellipsis.
- `data-overflow="true"` enables smart multi-column overflow planning.
- `data-overflow-max-cols="N"` limits how many overflow columns can be created.
- `data-overflow-counter="true"` adds an `and N more` style counter when content is hidden.
- `data-content-limiter="true"` shrinks and truncates overly tall rich text blocks.
- `data-fit-value` and `data-value-fit` auto-fit numbers.
- `format_value` utilities can abbreviate and format numbers to fit.

These are better than hard-coding item counts when the content is genuinely variable.

For plugin development, the main principle is:

- If the data can expand unpredictably, first look for a runtime feature before inventing custom truncation logic in Liquid or CSS.

## Responsive and Device Rules

The responsive system supports three axes:

- Size breakpoints: `sm:`, `md:`, `lg:`
- Orientation: `portrait:`
- Bit depth: `1bit:`, `2bit:`, `4bit:`

Important specifics from the docs:

- Size rules are mobile-first and progressive.
- Bit-depth rules target only that exact bit depth.
- These systems can be combined, including `dark:` prefixes.
- Not every component supports every responsive axis, so check the responsive matrix before leaning on advanced combinations.

The current TRMNL breakpoint table in the docs:

- `sm`: 600px minimum width
- `md`: 800px minimum width
- `lg`: 1024px minimum width

## TRMNL X-Specific Notes

The TRMNL X guide is especially relevant for this repo:

- TRMNL X is larger, 4-bit, and portrait-capable.
- New larger typography tiers exist for `title`, `value`, `label`, `description`, and `content`.
- `layout` establishes a container-query context, so container units like `w--[50cqw]` and `h--[80cqh]` can size relative to the actual view slot.
- Overflow column counts can be responsive with attributes like `data-overflow-max-cols-lg`.
- `stretch-x` and `stretch-y` were improved to behave correctly relative to layout direction.
- `gap--base`, `gap--auto`, and `gap--distribute` are useful newer spacing utilities.

Practical rule:

- For new TRMNL X work, prefer responsive framework sizing over fixed pixel tuning unless the design truly needs exact dimensions.

## Spacing, Rules, and Visual Separation

Useful primitives the docs push:

- `gap*` utilities for rhythm instead of ad hoc margins.
- `divider` instead of improvised border rules when you want a separator.
- `rounded*` and `outline` for view/card treatments.
- `bg--*`, `text--*`, and semantic tokens for color-aware designs.

Even though this repo targets grayscale-feeling plugins, these still matter:

- `divider` automatically adapts to background brightness.
- `outline` is designed to render well across bit depths.
- v3 color tokens still degrade gracefully to grayscale and nearest supported palettes.

## Components That Map Well To Plugins

The framework already has strong plugin-friendly pieces:

- `title_bar` for consistent header treatment.
- `item` for list rows with optional icon/meta/index patterns.
- `table` and `table_overflow` for highly structured data.
- `progress` for status or completion views.
- `chart` if we need TRMNL-friendly chart styling without rolling our own.
- `image`, `aspect_ratio`, `image_stroke`, `text_stroke` for visual layouts.

For schedule/transit/calendar plugins specifically:

- `item` is often a better default than a hand-built row.
- `columns` plus clamp/overflow is a better fit for long event lists than fixed item caps.
- `title_bar` helps keep mashup variants feeling native without extra custom framing.

## Packaging and Markup Conventions

The TRMNL docs outside the framework are useful for how plugins are actually packaged and rendered:

- Private/public plugin markup uses Liquid variables like `{{ variable }}`.
- Shared markup is prepended to each view layout and is the right place for shared CSS, JS, and reusable Liquid templates.
- TRMNL supports `{% template name %} ... {% endtemplate %}` and `{% render "name" %}` for reusable partials in shared markup.
- For marketplace/public-style integrations, the server should return layout-specific markup nodes such as `markup`, `markup_half_vertical`, `markup_half_horizontal`, and `markup_quadrant`.
- To be marketplace-complete, all available layouts should be provided.

How that maps to this repo:

- `src/*.liquid` are our per-layout templates.
- `src/shared.liquid` should hold shared CSS/Liquid helpers when multiple layouts need the same fragment.
- `settings.yml` defines preview/polling metadata for `trmnlp`.
- Worker endpoints provide the merge variables; templates should stay mostly presentational.

## Repo-Oriented Best Practices

Based on the docs and how this repo is structured, these are good defaults:

- Start with framework classes for structure and hierarchy.
- Keep custom CSS focused on brand-specific typography or small visual cues.
- Use `shared.liquid` when a row pattern or helper repeats across layouts.
- Prefer `title_bar` over inventing a custom header unless the design really depends on it.
- For variable-length feeds, use runtime clamp/overflow helpers before adding bespoke truncation rules.
- Treat quadrant and mashup layouts as first-class views, not reduced afterthoughts.
- Validate on the real preview shell, not just a raw render iframe.

## Good “Native Plugin” Checklist

- One `layout` per view.
- `title_bar` is a sibling of `layout`.
- Framework classes describe most layout and spacing.
- Text hierarchy uses `title` / `value` / `label` / `description` before custom font sizing.
- Variable-length text uses clamp or overflow helpers.
- Shared row patterns live in shared markup or reusable Liquid templates.
- Layout adapts cleanly to mashup variants and TRMNL X.
- Final validation happens in the actual preview shell.

## Most Relevant Official Pages By Topic

- Structure and wrappers:
  - https://trmnl.com/framework/docs/v3/structure
  - https://trmnl.com/framework/docs/v3/view
  - https://trmnl.com/framework/docs/v3/layout
  - https://trmnl.com/framework/docs/v3/title_bar

- Layout systems:
  - https://trmnl.com/framework/docs/v3/flex
  - https://trmnl.com/framework/docs/v3/grid
  - https://trmnl.com/framework/docs/v3/columns
  - https://trmnl.com/framework/docs/v3/gap

- Runtime fitting:
  - https://trmnl.com/framework/docs/v3/framework_runtime
  - https://trmnl.com/framework/docs/v3/clamp
  - https://trmnl.com/framework/docs/v3/overflow
  - https://trmnl.com/framework/docs/v3/content_limiter
  - https://trmnl.com/framework/docs/v3/fit_value
  - https://trmnl.com/framework/docs/v3/format_value

- Typography:
  - https://trmnl.com/framework/docs/v3/title
  - https://trmnl.com/framework/docs/v3/value
  - https://trmnl.com/framework/docs/v3/label
  - https://trmnl.com/framework/docs/v3/description
  - https://trmnl.com/framework/docs/v3/rich_text

- Device adaptation:
  - https://trmnl.com/framework/docs/v3/responsive
  - https://trmnl.com/framework/docs/v3/trmnl_x_guide
  - https://trmnl.com/framework/docs/v3/screen
  - https://trmnl.com/framework/docs/v3/size
  - https://trmnl.com/framework/docs/v3/tokens

- Packaging and authoring:
  - https://docs.trmnl.com/go/private-plugins/templates
  - https://docs.trmnl.com/go/private-plugins/templates-advanced
  - https://docs.trmnl.com/go/reusing-markup
  - https://docs.trmnl.com/go/plugin-marketplace/plugin-screen-generation-flow
