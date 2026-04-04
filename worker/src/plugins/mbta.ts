const MBTA_BASE = "https://api-v3.mbta.com";
const DAVIS_STOP = "place-davis";
const RED_LINE = "Red";
// direction_id=1 = inbound (southbound, towards Ashmont/Braintree)
const DIRECTION_INBOUND = 1;

interface Env {
  MBTA_API_KEY?: string;
}

interface MbtaPrediction {
  id: string;
  attributes: {
    arrival_time: string | null;
    departure_time: string | null;
    direction_id: number;
    status: string | null;
    schedule_relationship: string | null;
  };
  relationships: {
    route: { data: { id: string } };
    trip: { data: { id: string } };
  };
}

interface MbtaAlert {
  id: string;
  attributes: {
    header: string;
    description: string | null;
    cause: string;
    effect: string;
    severity: number;
    service_effect: string;
    active_period: Array<{ start: string; end: string | null }>;
    lifecycle: string;
  };
}

function headers(env: Env): Record<string, string> {
  const h: Record<string, string> = { Accept: "application/vnd.api+json" };
  if (env.MBTA_API_KEY) h["x-api-key"] = env.MBTA_API_KEY;
  return h;
}

function minutesUntil(isoTime: string): number {
  return Math.round((new Date(isoTime).getTime() - Date.now()) / 60000);
}

function formatTime(isoTime: string): string {
  return new Date(isoTime).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });
}

export async function getMbtaData(env: Env) {
  const [predictionsRes, alertsRes] = await Promise.all([
    fetch(
      `${MBTA_BASE}/predictions?filter[stop]=${DAVIS_STOP}&filter[route]=${RED_LINE}&filter[direction_id]=${DIRECTION_INBOUND}&sort=departure_time`,
      { headers: headers(env) }
    ),
    fetch(
      `${MBTA_BASE}/alerts?filter[route]=${RED_LINE}`,
      { headers: headers(env) }
    ),
  ]);

  const predictionsJson = (await predictionsRes.json()) as {
    data: MbtaPrediction[];
  };
  const alertsJson = (await alertsRes.json()) as { data: MbtaAlert[] };

  // Next trains at Davis inbound
  const trains = predictionsJson.data
    .filter(
      (p) =>
        (p.attributes.departure_time || p.attributes.arrival_time) &&
        p.attributes.schedule_relationship !== "CANCELLED"
    )
    .slice(0, 4)
    .map((p) => {
      const time = p.attributes.departure_time || p.attributes.arrival_time!;
      const mins = minutesUntil(time);
      return {
        time: formatTime(time),
        minutes: mins,
        display: mins <= 0 ? "Now" : mins === 1 ? "1 min" : `${mins} min`,
      };
    });

  const now = new Date();

  // Check if an alert is currently active (within any active_period)
  function isActiveNow(a: MbtaAlert): boolean {
    return a.attributes.active_period.some((p) => {
      const start = new Date(p.start);
      const end = p.end ? new Date(p.end) : null;
      return now >= start && (!end || now <= end);
    });
  }

  const allAlerts = alertsJson.data.filter(
    (a) => a.attributes.severity >= 3
  );

  // Live service disruptions: non-maintenance alerts that are active right now
  const liveAlerts = allAlerts
    .filter((a) => a.attributes.cause !== "MAINTENANCE" && isActiveNow(a))
    .map((a) => ({
      header: a.attributes.header,
      effect: a.attributes.effect,
      service_effect: a.attributes.service_effect,
    }));

  // Planned work: maintenance alerts (show regardless of active period)
  const plannedWork = allAlerts
    .filter((a) => a.attributes.cause === "MAINTENANCE")
    .map((a) => {
      const start = a.attributes.active_period?.[0]?.start;
      return {
        header: a.attributes.header,
        effect: a.attributes.effect,
        service_effect: a.attributes.service_effect,
        time: start ? formatTime(start) : "",
      };
    });

  // Subway status mirrors mbta.com: only live disruptions affect status
  const subway_status = liveAlerts.length > 0
    ? liveAlerts[0].service_effect
    : "Normal Service";
  const status_ok = liveAlerts.length === 0;

  const vars = {
    station: "Davis",
    direction: "Inbound",
    trains,
    has_trains: trains.length > 0,
    subway_status,
    status_ok,
    planned_work: plannedWork,
    has_planned_work: plannedWork.length > 0,
    live_alerts: liveAlerts,
    has_live_alerts: liveAlerts.length > 0,
    updated_at: new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/New_York",
    }),
  };

  // merge_variables is what TRMNL reads; top-level spread is for trmnlp preview
  return { merge_variables: vars, ...vars };
}
