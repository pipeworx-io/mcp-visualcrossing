# mcp-visualcrossing

Visual Crossing Weather MCP — wraps the Visual Crossing Weather Timeline API

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1476+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `weather_timeline` | Get daily weather for a location — works for BOTH historical weather (past dates) and forecast (future or no dates). Use this for HISTORICAL weather and "weather on a past date" questions, e.g. "what was the weather in Paris on 2023-07-04" (location: "Paris", start_date: "2023-07-04"). Pass start_date alone for a single day, or start_date + end_date for a range (weather timeline). Returns per-day temp/min/max, humidity, precipitation, wind, and conditions. Example: weather_timeline({ location: "London", start_date: "2024-01-01", end_date: "2024-01-07" }). |
| `current_conditions` | Get the live CURRENT weather conditions right now for a location — temperature, feels-like, humidity, wind, and conditions. Example: current_conditions({ location: "Tokyo" }). |
| `forecast` | Get the upcoming 15-day daily weather FORECAST for a location — per-day temp/min/max, humidity, precipitation chance, wind, and conditions. Example: forecast({ location: "Berlin" }). |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "visualcrossing": {
      "url": "https://gateway.pipeworx.io/visualcrossing/mcp"
    }
  }
}
```

### What this endpoint actually serves

`tools/list` at `https://gateway.pipeworx.io/visualcrossing/mcp` returns the tools in the table
above **plus the shared Pipeworx meta-tools** — `ask_pipeworx`,
`discover_tools`, `search_within`, `remember`/`recall` and the rest of the
gateway-wide set. So the tool count you see is larger than this table: a
single-pack endpoint currently lists roughly 30 shared tools alongside the
pack's own. The connection's `initialize` response states its exact scope, and
is the authoritative answer for a given day.

This is deliberate, not multiplexing by accident. The meta-tools are what let a
scoped connection answer a question this pack does not cover — via
`ask_pipeworx`, which routes across the whole catalog — without you adding a
second MCP server. There is currently no way to mount a pack endpoint without
them; if the extra schemas cost you more context than the routing is worth,
connect to the full gateway once rather than to several pack endpoints.

Or connect to the full Pipeworx gateway to get every pack's tools listed
directly, instead of just this one's:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

Both URLs reach the same gateway and the same 1476+ data sources. The
only difference is which pack's tools are listed **directly**; `ask_pipeworx`
reaches all of them from either one.

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English —
this works on the pack endpoint above as well as on the full gateway:

```
ask_pipeworx({ question: "your question about Visualcrossing data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
