# mcp-hts

HTS MCP — US import tariff rates via the USITC Harmonized Tariff Schedule.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 884+ live data sources.

## Tools

| Tool | Description |
|------|-------------|

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "hts": {
      "url": "https://gateway.pipeworx.io/hts/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 884+ data sources:

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
ask_pipeworx({ question: "your question about Hts data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [All tools and guides](https://github.com/pipeworx-io/examples)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
