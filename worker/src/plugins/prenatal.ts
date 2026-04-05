import { buildPrenatalImageManifest, getPrenatalImageRecord } from "./prenatal-images";

const TZ = "America/New_York";
const START_DATE: LocalDate = { year: 2025, month: 12, day: 24 };
const DUE_DATE: LocalDate = { year: 2026, month: 9, day: 30 };
const TOTAL_GESTATION_DAYS = 280;

type FruitShape = "round" | "pear" | "long" | "leafy";

interface LocalDate {
  year: number;
  month: number;
  day: number;
}

interface FruitComparison {
  name: string;
  badge: string;
  shape: FruitShape;
}

// Canonical week-by-week size chart from the BabyCenter list provided in-thread.
export const FRUIT_BY_WEEK: Record<number, FruitComparison> = {
  4: { name: "Poppy Seed", badge: "PS", shape: "round" },
  5: { name: "Sesame Seed", badge: "SS", shape: "round" },
  6: { name: "Lentil", badge: "LE", shape: "round" },
  7: { name: "Blueberry", badge: "BB", shape: "round" },
  8: { name: "Raspberry", badge: "RA", shape: "round" },
  9: { name: "Grape", badge: "GR", shape: "round" },
  10: { name: "Strawberry", badge: "ST", shape: "round" },
  11: { name: "Fig", badge: "FG", shape: "pear" },
  12: { name: "Lime", badge: "LI", shape: "round" },
  13: { name: "Plum", badge: "PL", shape: "round" },
  14: { name: "Lemon", badge: "LE", shape: "round" },
  15: { name: "Apple", badge: "AP", shape: "round" },
  16: { name: "Avocado", badge: "AV", shape: "pear" },
  17: { name: "Turnip", badge: "TU", shape: "round" },
  18: { name: "Bell Pepper", badge: "BP", shape: "round" },
  19: { name: "Pomegranate", badge: "PO", shape: "round" },
  20: { name: "Banana", badge: "BA", shape: "long" },
  21: { name: "Mango", badge: "MA", shape: "round" },
  22: { name: "Sweet Potato", badge: "SP", shape: "long" },
  23: { name: "Grapefruit", badge: "GR", shape: "round" },
  24: { name: "Ear of Corn", badge: "CO", shape: "long" },
  25: { name: "Acorn Squash", badge: "AS", shape: "pear" },
  26: { name: "Spaghetti Squash", badge: "SQ", shape: "long" },
  27: { name: "Cauliflower", badge: "CF", shape: "round" },
  28: { name: "Eggplant", badge: "EG", shape: "pear" },
  29: { name: "Butternut Squash", badge: "BS", shape: "pear" },
  30: { name: "Cabbage", badge: "CB", shape: "round" },
  31: { name: "Coconut", badge: "CC", shape: "round" },
  32: { name: "Papaya", badge: "PA", shape: "long" },
  33: { name: "Pineapple", badge: "PI", shape: "leafy" },
  34: { name: "Cantaloupe", badge: "CT", shape: "round" },
  35: { name: "Honeydew", badge: "HD", shape: "round" },
  36: { name: "Romaine", badge: "RO", shape: "leafy" },
  37: { name: "Swiss Chard", badge: "SC", shape: "leafy" },
  38: { name: "Mini Watermelon", badge: "MW", shape: "round" },
  39: { name: "Pumpkin", badge: "PU", shape: "round" },
  40: { name: "Watermelon", badge: "WM", shape: "round" },
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

function formatDateLabel(date: LocalDate): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(Date.UTC(date.year, date.month - 1, date.day, 12, 0, 0)));
}

function formatMonthDay(date: LocalDate): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    month: "short",
    day: "numeric",
  }).format(new Date(Date.UTC(date.year, date.month - 1, date.day, 12, 0, 0)));
}

function formatWeekday(date: LocalDate): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
  }).format(new Date(Date.UTC(date.year, date.month - 1, date.day, 12, 0, 0)));
}

function getTrimester(completedWeeks: number): string {
  if (completedWeeks < 14) return "First Trimester";
  if (completedWeeks < 28) return "Second Trimester";
  return "Third Trimester";
}

function getFruitComparison(completedWeeks: number): FruitComparison {
  if (completedWeeks < 4) {
    return { name: "Still Forming", badge: "OO", shape: "round" };
  }

  const fruitWeek = clamp(completedWeeks, 4, 40);
  return FRUIT_BY_WEEK[fruitWeek];
}

function pluralizeDays(days: number): string {
  return days === 1 ? "day" : "days";
}

function formatGestationLong(weeks: number, days: number): string {
  const weekLabel = weeks === 1 ? "week" : "weeks";
  const dayLabel = days === 1 ? "day" : "days";
  return `${weeks} ${weekLabel} ${days} ${dayLabel}`;
}

function buildProgressGrid(completedWeeks: number): string[] {
  const rows: string[] = [];
  const totalWeeks = 40;
  const columns = 8;

  for (let row = 0; row < totalWeeks / columns; row += 1) {
    let text = "";
    for (let col = 0; col < columns; col += 1) {
      const weekIndex = row * columns + col;
      text += weekIndex < completedWeeks ? "■" : "□";
    }
    rows.push(text);
  }

  return rows;
}

export function getPrenatalData(request: Request) {
  const origin = new URL(request.url).origin;
  const today = getLocalToday();
  const elapsedDaysRaw = daySerial(today) - daySerial(START_DATE);
  const elapsedDays = clamp(elapsedDaysRaw, 0, TOTAL_GESTATION_DAYS);
  const completedWeeks = Math.floor(elapsedDays / 7);
  const extraDays = elapsedDays % 7;
  const daysUntilDue = daySerial(DUE_DATE) - daySerial(today);
  const progressPercent = Math.round((elapsedDays / TOTAL_GESTATION_DAYS) * 100);
  const trimester = getTrimester(completedWeeks);
  const fruit = getFruitComparison(completedWeeks);
  const fruitWeek = clamp(completedWeeks, 4, 40);
  const fruitImage = getPrenatalImageRecord(origin, fruitWeek, fruit.name);
  const progressGridRows = buildProgressGrid(completedWeeks);

  const countdownValue = Math.abs(daysUntilDue);
  const dueWeeksRemaining = Math.floor(countdownValue / 7);
  const dueDaysRemaining = countdownValue % 7;
  let countdownLabel = "days to go";
  if (daysUntilDue === 0) countdownLabel = "due date";
  if (daysUntilDue < 0) countdownLabel = "days overdue";

  const vars = {
    title: "Baby Tracker",
    top_meta: `Due ${formatMonthDay(DUE_DATE)}`,
    due_date_label: formatDateLabel(DUE_DATE),
    due_date_short: formatMonthDay(DUE_DATE),
    due_date_meta: `${formatWeekday(DUE_DATE)} • ${DUE_DATE.year}`,
    gestation_weeks: completedWeeks,
    gestation_days: extraDays,
    days_until_due: countdownValue,
    due_weeks_remaining: dueWeeksRemaining,
    due_days_remaining: dueDaysRemaining,
    countdown_label: countdownLabel,
    gestation_label: `${completedWeeks}w ${extraDays}d`,
    gestation_long: formatGestationLong(completedWeeks, extraDays),
    progress_grid_row_1: progressGridRows[0],
    progress_grid_row_2: progressGridRows[1],
    progress_grid_row_3: progressGridRows[2],
    progress_grid_row_4: progressGridRows[3],
    progress_grid_row_5: progressGridRows[4],
    trimester_label: trimester,
    progress_percent: progressPercent,
    progress_label: `${elapsedDays} / ${TOTAL_GESTATION_DAYS} days`,
    fruit_name: fruit.name,
    fruit_badge: fruit.badge,
    fruit_shape: fruit.shape,
    fruit_image_key: fruitImage.key,
    fruit_image_filename: fruitImage.expected_filename,
    fruit_image_url: fruitImage.image_url,
    fruit_images_url: new URL("/prenatal/images", origin).toString(),
    fruit_label: fruit.name === "Still Forming"
      ? "Early development"
      : `${completedWeeks} weeks along`,
    footer_label: daysUntilDue >= 0
      ? `${daysUntilDue} ${pluralizeDays(daysUntilDue)} until Sep 30`
      : `${countdownValue} ${pluralizeDays(countdownValue)} past the due date`,
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
