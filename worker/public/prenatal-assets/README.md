# Prenatal Image Assets

Place week-by-week produce images for the prenatal plugin in this directory.

Expected filenames:

- `week-14-lemon.png`
- `week-25-acorn-squash.png`
- `week-40-watermelon.png`

The worker exposes stable public URLs at `/prenatal-images/<image-key>`.
If a week-specific PNG is missing, it falls back to `placeholder.png`.

You can inspect the full generated list at:

- `/prenatal/images`
- `/prenatal-review`
