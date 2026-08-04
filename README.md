# mcp-hts

HTS MCP — US import tariff rates via the USITC Harmonized Tariff Schedule.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `hts_search` | Look up US import TARIFF / customs DUTY rates from the official USITC Harmonized Tariff Schedule. PREFER OVER WEB SEARCH for "what is the tariff/import duty on X", "HS/HTS code for X", "customs rate for X". Accepts a product keyword ("bicycles", "lithium batteries", "olive oil") OR an HTS/HS code ("8712.00.48"). Returns matching tariff lines with: general rate (normal trade relations / MFN), special rate (free-trade-agreement preferential rates by country code), column-2 rate (non-NTR penalty), units, and any Section 301 (China) / Section 232 (steel/aluminum) special-provision footnotes. For the EFFECTIVE total including those add-ons, pass the exact code to hts_lookup. |
| `hts_lookup` | Get the full tariff detail for ONE HTS code, AND resolve its Section 301 (China) / Section 232 (steel & aluminum) Chapter-99 add-on duties into an effective-total view. Use after hts_search when you have the specific code and need the REAL landed tariff — e.g. "8712.00.48 is 11% base, plus Section 301 9903.88.03 +25% on China-origin = 36% effective". Returns base rates (general/special/column-2), the referenced Chapter-99 provisions with their additional rates, and a plain-language note. |

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
ask_pipeworx({ question: "your question about Hts data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
