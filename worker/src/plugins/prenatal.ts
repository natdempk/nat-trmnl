import { buildPrenatalImageManifest, getPrenatalImageRecord } from "./prenatal-images";

const TZ = "America/New_York";
const START_DATE: LocalDate = { year: 2025, month: 12, day: 24 };
const DUE_DATE: LocalDate = { year: 2026, month: 9, day: 30 };
const TOTAL_GESTATION_DAYS = 280;

interface LocalDate {
  year: number;
  month: number;
  day: number;
}

interface FruitComparison {
  name: string;
  sizePhrase: string;
}

// Canonical week-by-week size chart from the BabyCenter list provided in-thread.
export const FRUIT_BY_WEEK: Record<number, FruitComparison> = {
  4: { name: "Poppy Seed", sizePhrase: "a poppy seed" },
  5: { name: "Sesame Seed", sizePhrase: "a sesame seed" },
  6: { name: "Lentil", sizePhrase: "a lentil" },
  7: { name: "Blueberry", sizePhrase: "a blueberry" },
  8: { name: "Raspberry", sizePhrase: "a raspberry" },
  9: { name: "Grape", sizePhrase: "a grape" },
  10: { name: "Strawberry", sizePhrase: "a strawberry" },
  11: { name: "Fig", sizePhrase: "a fig" },
  12: { name: "Lime", sizePhrase: "a lime" },
  13: { name: "Plum", sizePhrase: "a plum" },
  14: { name: "Lemon", sizePhrase: "a lemon" },
  15: { name: "Apple", sizePhrase: "an apple" },
  16: { name: "Avocado", sizePhrase: "an avocado" },
  17: { name: "Turnip", sizePhrase: "a turnip" },
  18: { name: "Bell Pepper", sizePhrase: "a bell pepper" },
  19: { name: "Pomegranate", sizePhrase: "a pomegranate" },
  20: { name: "Banana", sizePhrase: "a banana" },
  21: { name: "Mango", sizePhrase: "a mango" },
  22: { name: "Sweet Potato", sizePhrase: "a sweet potato" },
  23: { name: "Grapefruit", sizePhrase: "a grapefruit" },
  24: { name: "Ear of Corn", sizePhrase: "an ear of corn" },
  25: { name: "Acorn Squash", sizePhrase: "an acorn squash" },
  26: { name: "Spaghetti Squash", sizePhrase: "a spaghetti squash" },
  27: { name: "Cauliflower", sizePhrase: "a cauliflower" },
  28: { name: "Eggplant", sizePhrase: "an eggplant" },
  29: { name: "Butternut Squash", sizePhrase: "a butternut squash" },
  30: { name: "Cabbage", sizePhrase: "a cabbage" },
  31: { name: "Coconut", sizePhrase: "a coconut" },
  32: { name: "Papaya", sizePhrase: "a papaya" },
  33: { name: "Pineapple", sizePhrase: "a pineapple" },
  34: { name: "Cantaloupe", sizePhrase: "a cantaloupe" },
  35: { name: "Honeydew", sizePhrase: "a honeydew" },
  36: { name: "Romaine", sizePhrase: "romaine" },
  37: { name: "Swiss Chard", sizePhrase: "swiss chard" },
  38: { name: "Mini Watermelon", sizePhrase: "a mini watermelon" },
  39: { name: "Pumpkin", sizePhrase: "a pumpkin" },
  40: { name: "Watermelon", sizePhrase: "a watermelon" },
};

function getLocalToday(): LocalDate {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date());

  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
  };
}

function daySerial(date: LocalDate): number {
  return Math.floor(Date.UTC(date.year, date.month - 1, date.day) / 86_400_000);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getFruitComparison(completedWeeks: number): FruitComparison {
  if (completedWeeks < 4) {
    return { name: "Still Forming", sizePhrase: "still forming" };
  }

  const fruitWeek = clamp(completedWeeks, 4, 40);
  return FRUIT_BY_WEEK[fruitWeek];
}

export function getPrenatalData(request: Request) {
  const origin = new URL(request.url).origin;
  const today = getLocalToday();
  const elapsedDaysRaw = daySerial(today) - daySerial(START_DATE);
  const elapsedDays = clamp(elapsedDaysRaw, 0, TOTAL_GESTATION_DAYS);
  const completedWeeks = Math.floor(elapsedDays / 7);
  const extraDays = elapsedDays % 7;
  const fruit = getFruitComparison(completedWeeks);
  const fruitWeek = clamp(completedWeeks, 4, 40);
  const daysUntilDue = daySerial(DUE_DATE) - daySerial(today);
  const daysRemaining = Math.max(daysUntilDue, 0);
  const dueWeeksRemaining = Math.floor(daysRemaining / 7);
  const dueDaysRemaining = daysRemaining % 7;
  const fruitImage = getPrenatalImageRecord(origin, fruitWeek, FRUIT_BY_WEEK[fruitWeek].name);

  const vars = {
    gestation_weeks: completedWeeks,
    gestation_days: extraDays,
    due_weeks_remaining: dueWeeksRemaining,
    due_days_remaining: dueDaysRemaining,
    fruit_name: fruit.name,
    fruit_size_phrase: fruit.sizePhrase,
    fruit_image_url: fruitImage.image_url,
  };

  return { merge_variables: vars, ...vars };
}

export function getPrenatalImageManifestData(request: Request) {
  const origin = new URL(request.url).origin;
  const images = buildPrenatalImageManifest(origin, FRUIT_BY_WEEK);

  return {
    images,
    count: images.length,
  };
}
