# Prenatal Image Assets

Place week-by-week produce images for the prenatal plugin in this directory.

Expected filenames:

- `week-04-poppy-seed.svg`
- `week-14-lemon.svg`
- `week-25-acorn-squash.svg`
- `week-40-watermelon.svg`

The worker exposes stable public URLs at `/prenatal-images/<image-key>`.
If a week-specific SVG or PNG is missing, it falls back to `placeholder.svg`.

You can inspect the full generated list at:

- `/prenatal/images`
