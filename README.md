# mcp-hts

HTS MCP — US import tariff rates via the USITC Harmonized Tariff Schedule.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1683+ live data sources.

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

### What this endpoint actually serves

`tools/list` at `https://gateway.pipeworx.io/hts/mcp` returns the tools in the table
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

Both URLs reach the same gateway and the same 1683+ data sources. The
only difference is which pack's tools are listed **directly**; `ask_pipeworx`
reaches all of them from either one.

## No MCP client? Call it over HTTP

```bash
curl -X POST https://gateway.pipeworx.io/v1/tools/hts_search \
  -H 'Content-Type: application/json' \
  -d '{"query":"lithium batteries"}'
```

No account needed for the first calls. Inspect any tool: `GET https://gateway.pipeworx.io/v1/tools/hts_search`. Find one: `POST https://gateway.pipeworx.io/v1/tools/search_packs` with `{"query":"..."}`.

## Standalone (no gateway account)

This package also runs as a local stdio MCP server — no Pipeworx account, no
gateway round-trip:

```json
{
  "mcpServers": {
    "hts": {
      "command": "npx",
      "args": ["-y", "@pipeworx/mcp-hts"]
    }
  }
}
```

Or run it directly to confirm it starts:

```bash
npx -y @pipeworx/mcp-hts
```

It speaks MCP over stdin/stdout and answers `initialize`/`tools/list`/`tools/call`
for **only** this pack's tools — none of the shared meta-tools the gateway
connection above adds. Same source, same tools, no ask_pipeworx routing.

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English —
this works on the pack endpoint above as well as on the full gateway:

```
ask_pipeworx({ question: "your question about Hts data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
