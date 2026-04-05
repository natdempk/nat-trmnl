import { getMbtaData } from "./plugins/mbta";
import { getCalendarData } from "./plugins/calendar";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/mbta") {
      const data = await getMbtaData(env);
      return Response.json(data);
    }

    if (url.pathname === "/calendar") {
      const data = await getCalendarData(env);
      return Response.json(data);
    }

    return Response.json({ error: "not found" }, { status: 404 });
  },
} satisfies ExportedHandler<Env>;

interface Env {
  MBTA_API_KEY?: string;
  GOOGLE_CALENDAR_ICS_URL: string;
}
