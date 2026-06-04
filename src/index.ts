interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * Visual Crossing Weather MCP — wraps the Visual Crossing Weather Timeline API
 * (weather.visualcrossing.com).
 *
 * The single Timeline endpoint serves BOTH historical weather (past dates) and
 * forecast (future / no dates), so `weather_timeline` is the go-to tool for
 * questions like "what was the weather in Paris on 2023-07-04".
 *
 * Tools:
 * - weather_timeline: historical OR forecast daily weather for a location +
 *   optional date range. THE tool for past-date / historical weather lookups.
 * - current_conditions: live current conditions right now for a location.
 * - forecast: 15-day daily forecast for a location.
 *
 * Dual-key model: pass your own Visual Crossing key via the OPTIONAL _apiKey
 * arg for higher limits, or omit it to use the shared Pipeworx key. The key is
 * sent as the `key` query param; location + dates go in the URL path.
 */


const BASE_URL =
  'https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline';

const tools: McpToolExport['tools'] = [
  {
    name: 'weather_timeline',
    description:
      'Get daily weather for a location — works for BOTH historical weather (past dates) and forecast (future or no dates). Use this for HISTORICAL weather and "weather on a past date" questions, e.g. "what was the weather in Paris on 2023-07-04" (location: "Paris", start_date: "2023-07-04"). Pass start_date alone for a single day, or start_date + end_date for a range (weather timeline). Returns per-day temp/min/max, humidity, precipitation, wind, and conditions. Example: weather_timeline({ location: "London", start_date: "2024-01-01", end_date: "2024-01-07" }).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        location: {
          type: 'string',
          description: 'City name (e.g. "Paris", "New York, NY") or "lat,lon" (e.g. "48.8566,2.3522").',
        },
        start_date: {
          type: 'string',
          description: 'Optional start date in YYYY-MM-DD format. Past dates return HISTORICAL weather; future dates return forecast. Omit for the default 15-day forecast.',
        },
        end_date: {
          type: 'string',
          description: 'Optional end date in YYYY-MM-DD format. Only used when start_date is also given; produces a date-range timeline.',
        },
        units: {
          type: 'string',
          enum: ['metric', 'us', 'uk'],
          description: 'Unit group: "metric" (°C, km/h — default), "us" (°F, mph), or "uk".',
        },
        _apiKey: {
          type: 'string',
          description: 'Optional — your own Visual Crossing API key for higher limits; omit to use the shared Pipeworx key.',
        },
      },
      required: ['location'],
    },
  },
  {
    name: 'current_conditions',
    description:
      'Get the live CURRENT weather conditions right now for a location — temperature, feels-like, humidity, wind, and conditions. Example: current_conditions({ location: "Tokyo" }).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        location: {
          type: 'string',
          description: 'City name (e.g. "Tokyo") or "lat,lon".',
        },
        units: {
          type: 'string',
          enum: ['metric', 'us', 'uk'],
          description: 'Unit group: "metric" (default), "us", or "uk".',
        },
        _apiKey: {
          type: 'string',
          description: 'Optional — your own Visual Crossing API key for higher limits; omit to use the shared Pipeworx key.',
        },
      },
      required: ['location'],
    },
  },
  {
    name: 'forecast',
    description:
      'Get the upcoming 15-day daily weather FORECAST for a location — per-day temp/min/max, humidity, precipitation chance, wind, and conditions. Example: forecast({ location: "Berlin" }).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        location: {
          type: 'string',
          description: 'City name (e.g. "Berlin") or "lat,lon".',
        },
        units: {
          type: 'string',
          enum: ['metric', 'us', 'uk'],
          description: 'Unit group: "metric" (default), "us", or "uk".',
        },
        _apiKey: {
          type: 'string',
          description: 'Optional — your own Visual Crossing API key for higher limits; omit to use the shared Pipeworx key.',
        },
      },
      required: ['location'],
    },
  },
];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

interface Day {
  datetime: string;
  tempmax: number;
  tempmin: number;
  temp: number;
  humidity: number;
  precip: number;
  precipprob: number;
  windspeed: number;
  conditions: string;
  description: string;
}

interface TimelineResponse {
  resolvedAddress: string;
  timezone: string;
  days?: Day[];
  currentConditions?: Record<string, unknown>;
}

function mapDays(days: Day[] | undefined) {
  return (days ?? []).map((d) => ({
    date: d.datetime,
    temp: d.temp,
    tempmax: d.tempmax,
    tempmin: d.tempmin,
    humidity: d.humidity,
    precip: d.precip,
    precipprob: d.precipprob,
    windspeed: d.windspeed,
    conditions: d.conditions,
    description: d.description,
  }));
}

async function vcGet(path: string, params: URLSearchParams): Promise<TimelineResponse> {
  const res = await fetch(`${BASE_URL}/${path}?${params}`);
  if (!res.ok) {
    const text = await res.text();
    throw new VcError(res.status, text);
  }
  return res.json() as Promise<TimelineResponse>;
}

// Carries the upstream status + body so callTool can shape the
// { error, message } payload the spec requires for non-2xx responses.
class VcError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string) {
    super(body);
    this.status = status;
    this.body = body;
  }
}

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const apiKey = args._apiKey as string | undefined;
  delete args._apiKey;

  if (!apiKey) {
    return { error: 'api_key_required', message: 'No Visual Crossing key available.' };
  }

  const units = (args.units as string | undefined) || 'metric';
  const location = (args.location as string | undefined) ?? '';
  if (!location) {
    return { error: 'location_required', message: 'A location (city name or "lat,lon") is required.' };
  }
  const encodedLocation = encodeURIComponent(location);

  try {
    switch (name) {
      case 'weather_timeline':
        return await weatherTimeline(encodedLocation, args.start_date as string | undefined, args.end_date as string | undefined, units, apiKey);
      case 'current_conditions':
        return await currentConditions(encodedLocation, units, apiKey);
      case 'forecast':
        return await forecast(encodedLocation, units, apiKey);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (err) {
    if (err instanceof VcError) {
      return { error: err.status, message: err.body };
    }
    throw err;
  }
}

async function weatherTimeline(
  encodedLocation: string,
  startDate: string | undefined,
  endDate: string | undefined,
  units: string,
  apiKey: string,
) {
  let path = encodedLocation;
  if (startDate) {
    if (!ISO_DATE.test(startDate)) {
      throw new VcError(400, `start_date must be YYYY-MM-DD format (e.g. "2023-07-04"). Got "${startDate}".`);
    }
    path += `/${encodeURIComponent(startDate)}`;
    if (endDate) {
      if (!ISO_DATE.test(endDate)) {
        throw new VcError(400, `end_date must be YYYY-MM-DD format (e.g. "2023-07-10"). Got "${endDate}".`);
      }
      path += `/${encodeURIComponent(endDate)}`;
    }
  }

  const params = new URLSearchParams({ key: apiKey, unitGroup: units, contentType: 'json', include: 'days' });
  const data = await vcGet(path, params);

  return {
    location: data.resolvedAddress,
    timezone: data.timezone,
    days: mapDays(data.days),
  };
}

async function currentConditions(encodedLocation: string, units: string, apiKey: string) {
  const params = new URLSearchParams({ key: apiKey, unitGroup: units, contentType: 'json', include: 'current' });
  const data = await vcGet(`${encodedLocation}/today`, params);

  return {
    location: data.resolvedAddress,
    current: data.currentConditions ?? null,
  };
}

async function forecast(encodedLocation: string, units: string, apiKey: string) {
  const params = new URLSearchParams({ key: apiKey, unitGroup: units, contentType: 'json', include: 'days' });
  const data = await vcGet(encodedLocation, params);

  return {
    location: data.resolvedAddress,
    timezone: data.timezone,
    days: mapDays(data.days),
  };
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
