# mcp-visualcrossing

Visual Crossing Weather MCP — wraps the Visual Crossing Weather Timeline API

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

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

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Visualcrossing data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
