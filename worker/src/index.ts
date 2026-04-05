import { getMbtaData } from "./plugins/mbta";
import { getCalendarData } from "./plugins/calendar";
import { getPrenatalData, getPrenatalImageManifestData } from "./plugins/prenatal";
import { getPrenatalImageResponse } from "./plugins/prenatal-images";

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

    if (url.pathname === "/prenatal") {
      const data = getPrenatalData(request);
      return Response.json(data);
    }

    if (url.pathname === "/prenatal/images") {
      const data = getPrenatalImageManifestData(request);
      return Response.json(data);
    }

    if (url.pathname.startsWith("/prenatal-images/")) {
      return getPrenatalImageResponse(request, env);
    }

    if (url.pathname === "/prenatal-review" || url.pathname === "/prenatal-review/") {
      return env.ASSETS.fetch(new URL("/prenatal-review/index.html", url.origin));
    }

    return Response.json({ error: "not found" }, { status: 404 });
  },
} satisfies ExportedHandler<Env>;

interface Env {
  ASSETS: Fetcher;
  MBTA_API_KEY?: string;
  GOOGLE_CALENDAR_ICS_URL: string;
}
