const PRENATAL_IMAGE_BASE = "/prenatal-images";
const PRENATAL_ASSET_BASE = "/prenatal-assets";
const DEFAULT_EXTENSION = "png";
const FALLBACK_FILENAME = "placeholder.png";

export interface PrenatalImageRecord {
  week: number;
  key: string;
  expected_filename: string;
  image_url: string;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getPrenatalImageRecord(origin: string, week: number, fruitName: string): PrenatalImageRecord {
  const key = `week-${String(week).padStart(2, "0")}-${slugify(fruitName)}`;
  return {
    week,
    key,
    expected_filename: `${key}.${DEFAULT_EXTENSION}`,
    image_url: new URL(`${PRENATAL_IMAGE_BASE}/${key}`, origin).toString(),
  };
}

export function buildPrenatalImageManifest(origin: string, fruitsByWeek: Record<number, { name: string }>) {
  return Object.entries(fruitsByWeek)
    .map(([weekText, fruit]) => {
      const week = Number(weekText);
      const record = getPrenatalImageRecord(origin, week, fruit.name);
      return {
        week,
        fruit_name: fruit.name,
        image_key: record.key,
        expected_filename: record.expected_filename,
        image_url: record.image_url,
      };
    })
    .sort((a, b) => a.week - b.week);
}

export async function getPrenatalImageResponse(request: Request, env: { ASSETS: Fetcher }) {
  const url = new URL(request.url);
  const key = url.pathname.replace(`${PRENATAL_IMAGE_BASE}/`, "");
  const assetResponse = await env.ASSETS.fetch(new URL(`${PRENATAL_ASSET_BASE}/${key}.${DEFAULT_EXTENSION}`, url.origin));

  if (assetResponse.ok) {
    return assetResponse;
  }

  return env.ASSETS.fetch(new URL(`${PRENATAL_ASSET_BASE}/${FALLBACK_FILENAME}`, url.origin));
}
