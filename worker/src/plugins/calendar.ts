import ICAL from "ical.js";

const TZ = "America/New_York";
const LOOKAHEAD_DAYS = 28; // how far ahead to expand recurring events

interface Env {
  GOOGLE_CALENDAR_ICS_URL: string;
}

interface CalendarEvent {
  title: string;
  location?: string;
  start: Date;
  end: Date;
  allDay: boolean;
  multiDay: boolean;
}

interface DisplayEvent {
  title: string;
  time?: string; // 24h format, omitted for all-day
  location?: string;
  all_day: boolean;
}

interface LaterEvent {
  title: string;
  time?: string;
  date_label: string; // e.g. "Fri Apr 10"
  location?: string;
  all_day: boolean;
}

interface UpcomingTrip {
  title: string;
  dates: string; // e.g. "Apr 12–15"
}

function nowInTZ(): Date {
  return new Date();
}

function toLocalDateParts(d: Date): { year: number; month: number; day: number; weekday: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).formatToParts(d);

  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  return {
    year: parseInt(get("year")),
    month: parseInt(get("month")),
    day: parseInt(get("day")),
    weekday: weekdayMap[get("weekday")],
  };
}

function startOfDayInTZ(year: number, month: number, day: number): Date {
  // Use a binary-search-like approach: we want the UTC instant when it's midnight on year/month/day in TZ
  // ET is UTC-5 (EST) or UTC-4 (EDT), so midnight ET is 04:00 or 05:00 UTC
  // Try both offsets and check which gives the right local date
  for (const offsetHours of [4, 5]) {
    const d = new Date(Date.UTC(year, month - 1, day, offsetHours, 0, 0));
    const parts = toLocalDateParts(d);
    if (parts.year === year && parts.month === month && parts.day === day) {
      return d;
    }
  }
  // Fallback: assume UTC-4 (EDT)
  return new Date(Date.UTC(year, month - 1, day, 4, 0, 0));
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function formatTime24(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

function formatDateShort(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    month: "short",
    day: "numeric",
  }).format(d);
}

function parseICS(icsText: string): CalendarEvent[] {
  const jcal = ICAL.parse(icsText);
  const comp = new ICAL.Component(jcal);
  const now = nowInTZ();
  const horizon = addDays(now, LOOKAHEAD_DAYS);
  const events: CalendarEvent[] = [];

  // Register timezones from the calendar so ical.js can resolve them
  for (const vtimezone of comp.getAllSubcomponents("vtimezone")) {
    const tz = new ICAL.Timezone(vtimezone);
    ICAL.TimezoneService.register(tz);
  }

  for (const vevent of comp.getAllSubcomponents("vevent")) {
    const event = new ICAL.Event(vevent);

    if (event.isRecurring()) {
      const iter = event.iterator();
      let next: ICAL.Time | null;
      while ((next = iter.next())) {
        const details = event.getOccurrenceDetails(next);
        const start = details.startDate.toJSDate();
        const end = details.endDate.toJSDate();
        if (start > horizon) break;
        if (end < now) continue;

        const allDay = details.startDate.isDate;
        const diffMs = end.getTime() - start.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        events.push({
          title: event.summary,
          location: event.location || undefined,
          start,
          end,
          allDay,
          multiDay: allDay && diffDays >= 2,
        });
      }
    } else {
      const start = event.startDate.toJSDate();
      const end = event.endDate.toJSDate();
      if (end < now || start > horizon) continue;

      const allDay = event.startDate.isDate;
      const diffMs = end.getTime() - start.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      events.push({
        title: event.summary,
        location: event.location || undefined,
        start,
        end,
        allDay,
        multiDay: allDay && diffDays >= 2,
      });
    }
  }

  events.sort((a, b) => a.start.getTime() - b.start.getTime());
  return events;
}

function toDisplayEvent(e: CalendarEvent): DisplayEvent {
  return {
    title: e.title,
    time: e.allDay ? undefined : formatTime24(e.start),
    location: e.location,
    all_day: e.allDay,
  };
}

function getWeekendRange(today: { year: number; month: number; day: number; weekday: number }): { start: Date; end: Date } | null {
  const todayDate = startOfDayInTZ(today.year, today.month, today.day);

  // weekday: 0=Sun, 1=Mon, ..., 6=Sat
  if (today.weekday === 0) {
    // Sunday — "this weekend" is today only (rest of Sunday)
    return { start: todayDate, end: addDays(todayDate, 1) };
  }

  // Monday through Friday — this weekend is next Sat+Sun
  // Saturday — this weekend is today+tomorrow
  const daysUntilSat = (6 - today.weekday + 7) % 7 || 7;
  const satStart = addDays(todayDate, today.weekday === 6 ? 0 : daysUntilSat);
  const sunEnd = addDays(satStart, 2); // end of Sunday
  return { start: satStart, end: sunEnd };
}

export async function getCalendarData(env: Env) {
  const res = await fetch(env.GOOGLE_CALENDAR_ICS_URL);
  if (!res.ok) {
    return { merge_variables: { error: `Failed to fetch calendar: ${res.status}` }, error: `Failed to fetch calendar: ${res.status}` };
  }
  const icsText = await res.text();
  const allEvents = parseICS(icsText);

  const now = nowInTZ();
  const today = toLocalDateParts(now);
  const todayStart = startOfDayInTZ(today.year, today.month, today.day);
  const tomorrowStart = addDays(todayStart, 1);
  const dayAfterTomorrow = addDays(todayStart, 2);

  // Separate multi-day events for "upcoming" section
  const multiDayEvents = allEvents.filter((e) => e.multiDay);
  const singleEvents = allEvents.filter((e) => !e.multiDay);

  // Today: events that overlap with today and haven't ended yet
  const todayEvents = singleEvents.filter((e) => {
    return e.start < tomorrowStart && e.end > now;
  }).map(toDisplayEvent);

  // Tomorrow
  const tomorrowEvents = singleEvents.filter((e) => {
    return e.start >= tomorrowStart && e.start < dayAfterTomorrow;
  }).map(toDisplayEvent);

  // This weekend (skip if tomorrow IS the weekend and we'd double-show)
  const weekend = getWeekendRange(today);
  let weekendEvents: DisplayEvent[] = [];
  let showWeekend = false;

  if (weekend) {
    const tomorrowIsWeekend = today.weekday === 5 || today.weekday === 6;
    // Only show weekend section if it doesn't fully overlap with today+tomorrow
    if (!tomorrowIsWeekend || today.weekday === 5) {
      // On Friday, weekend = Sat+Sun (tomorrow is Sat, so weekend section shows Sun too)
      // On Sat, weekend is today+tomorrow (but today/tomorrow sections handle those)
      // On weekdays, weekend is distinct from today/tomorrow
      weekendEvents = singleEvents.filter((e) => {
        // Exclude events already in today or tomorrow sections
        if (e.start < dayAfterTomorrow && e.end > now) return false;
        return e.start >= weekend.start && e.start < weekend.end;
      }).map(toDisplayEvent);
      showWeekend = weekendEvents.length > 0;
    }
  }

  // Upcoming multi-day events
  const upcoming: UpcomingTrip[] = multiDayEvents.map((e) => {
    const startStr = formatDateShort(e.start);
    const endDate = addDays(e.end, -1); // end is exclusive for all-day events
    const endStr = formatDateShort(endDate);
    return { title: e.title, dates: `${startStr}–${endStr}` };
  });

  // "Later" — events beyond today/tomorrow/weekend, to fill space
  const alreadyShown = new Set<CalendarEvent>();
  // Mark events that are in today/tomorrow/weekend
  singleEvents.forEach((e) => {
    if (e.start < tomorrowStart && e.end > now) alreadyShown.add(e);
    if (e.start >= tomorrowStart && e.start < dayAfterTomorrow) alreadyShown.add(e);
    if (showWeekend && weekend && e.start >= weekend.start && e.start < weekend.end && !(e.start < dayAfterTomorrow && e.end > now)) {
      alreadyShown.add(e);
    }
  });

  const laterEvents: LaterEvent[] = singleEvents
    .filter((e) => !alreadyShown.has(e))
    .slice(0, upcoming.length > 0 ? 2 : 5)
    .map((e) => ({
      title: e.title,
      time: e.allDay ? undefined : formatTime24(e.start),
      date_label: new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short", month: "short", day: "numeric" }).format(e.start).replace(",", ""),
      location: e.location,
      all_day: e.allDay,
    }));

  const todayLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(now);

  const vars = {
    today_label: todayLabel,
    today_events: todayEvents,
    has_today: todayEvents.length > 0,
    tomorrow_events: tomorrowEvents,
    has_tomorrow: tomorrowEvents.length > 0,
    weekend_events: weekendEvents,
    has_weekend: showWeekend,
    later_events: laterEvents,
    has_later: laterEvents.length > 0,
    upcoming,
    has_upcoming: upcoming.length > 0,
    updated_at: formatTime24(now),
  };

  return { merge_variables: vars, ...vars };
}
