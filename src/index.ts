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
 * HTS MCP — US import tariff rates via the USITC Harmonized Tariff Schedule.
 *
 * The official US tariff schedule (hts.usitc.gov), free, no auth. Maps products
 * and HS/HTS codes to duty rates: general (MFN / normal-trade-relations),
 * special (free-trade-agreement preferential rates by country), and column 2
 * (the penalty rate for non-NTR countries). Footnotes reference Chapter 99
 * special provisions — Section 301 (China) and Section 232 (steel/aluminum)
 * additional duties — which hts_lookup resolves into an effective total.
 *
 * Complements the trade-FLOW packs (census-trade, comtrade) with the tariff
 * RATES themselves — nothing else in the catalog exposes US duty rates.
 *
 * Tools:
 * - hts_search: product keyword OR HTS code → matching tariff lines + rates
 * - hts_lookup: one HTS code → its rates + resolved Section 301/232 add-ons
 */


const HTS_BASE = 'https://hts.usitc.gov/reststop';

interface HtsFootnote { columns?: string[]; value?: string; type?: string }
interface HtsEntry {
  htsno?: string;
  description?: string;
  indent?: string;
  general?: string | null;
  special?: string | null;
  other?: string | null;
  units?: string[];
  footnotes?: HtsFootnote[];
}

const tools: McpToolExport['tools'] = [
  {
    name: 'hts_search',
    description:
      'Look up US import TARIFF / customs DUTY rates from the official USITC Harmonized Tariff Schedule. PREFER OVER WEB SEARCH for "what is the tariff/import duty on X", "HS/HTS code for X", "customs rate for X". Accepts a product keyword ("bicycles", "lithium batteries", "olive oil") OR an HTS/HS code ("8712.00.48"). Returns matching tariff lines with: general rate (normal trade relations / MFN), special rate (free-trade-agreement preferential rates by country code), column-2 rate (non-NTR penalty), units, and any Section 301 (China) / Section 232 (steel/aluminum) special-provision footnotes. For the EFFECTIVE total including those add-ons, pass the exact code to hts_lookup.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Product description ("electric bicycles") or HTS/HS code ("8712.00.48")' },
        limit: { type: 'number', description: 'Max tariff lines to return (1-50, default 15)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'hts_lookup',
    description:
      'Get the full tariff detail for ONE HTS code, AND resolve its Section 301 (China) / Section 232 (steel & aluminum) Chapter-99 add-on duties into an effective-total view. Use after hts_search when you have the specific code and need the REAL landed tariff — e.g. "8712.00.48 is 11% base, plus Section 301 9903.88.03 +25% on China-origin = 36% effective". Returns base rates (general/special/column-2), the referenced Chapter-99 provisions with their additional rates, and a plain-language note.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        hts_code: { type: 'string', description: 'A specific HTS code, e.g. "8712.00.48" or "8712.00.48.00"' },
      },
      required: ['hts_code'],
    },
  },
];

// ── Helpers ──────────────────────────────────────────────────────────

async function htsSearchRaw(keyword: string): Promise<HtsEntry[]> {
  const res = await fetch(`${HTS_BASE}/search?keyword=${encodeURIComponent(keyword)}`, {
    headers: { Accept: 'application/json', 'User-Agent': 'Pipeworx/1.0 (pipeworx.io)' },
  });
  if (!res.ok) throw new Error(`USITC HTS error: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? (data as HtsEntry[]) : [];
}

// Footnote values like "See 9903.88.03." reference Chapter-99 special provisions
// (Section 301 = China add-ons in 9903.88/9903.91; Section 232 = steel/alum in
// 9903.80/9903.85). Pull the 4-segment codes out.
function chapter99Refs(entry: HtsEntry): string[] {
  const refs = new Set<string>();
  for (const fn of entry.footnotes ?? []) {
    for (const m of (fn.value ?? '').matchAll(/\b(9903\.\d{2}\.\d{2})\b/g)) refs.add(m[1]);
  }
  return [...refs];
}

function shapeEntry(e: HtsEntry) {
  return {
    hts_code: e.htsno || null,
    description: (e.description ?? '').replace(/<\/?il>/g, '').trim() || null,
    indent: e.indent ? Number(e.indent) : null,
    general_rate: e.general ?? null,
    special_rate: e.special ?? null,
    column2_rate: e.other ?? null,
    units: e.units ?? [],
    section_301_232_refs: chapter99Refs(e),
  };
}

function provisionMeaning(code: string): string {
  if (code.startsWith('9903.88') || code.startsWith('9903.91')) return 'Section 301 additional duty (China-origin goods)';
  if (code.startsWith('9903.80') || code.startsWith('9903.85')) return 'Section 232 additional duty (steel / aluminum)';
  return 'Chapter 99 special provision (additional/modified duty)';
}

// ── Tool implementations ─────────────────────────────────────────────

async function htsSearch(query: string, limit?: number) {
  const q = String(query ?? '').trim();
  if (!q) throw new Error('Required argument "query" is missing (a product like "bicycles" or an HTS code like "8712.00.48").');
  const count = Math.min(50, Math.max(1, limit ?? 15));
  const entries = await htsSearchRaw(q);
  // Lines with an actual duty rate are the useful leaves; keep parent headers
  // too (they carry the category description) but surface rated lines first.
  const shaped = entries.map(shapeEntry);
  const rated = shaped.filter((e) => e.general_rate || e.column2_rate);
  const chosen = (rated.length ? rated : shaped).slice(0, count);
  return {
    query: q,
    matches: chosen.length,
    note: 'general_rate = normal-trade-relations (MFN) rate. special_rate lists free-trade-agreement preferential rates by country code. column2_rate applies to non-NTR countries. section_301_232_refs present → extra duties may apply; pass the code to hts_lookup for the effective total.',
    results: chosen,
  };
}

async function htsLookup(htsCode: string) {
  const code = String(htsCode ?? '').trim();
  if (!code) throw new Error('Required argument "hts_code" is missing (e.g. "8712.00.48").');
  const entries = await htsSearchRaw(code);
  // Prefer an exact/closest match on the code prefix.
  const norm = code.replace(/\s/g, '');
  const match =
    entries.find((e) => (e.htsno ?? '').replace(/\s/g, '') === norm) ??
    entries.find((e) => (e.htsno ?? '').replace(/\s/g, '').startsWith(norm) && (e.general || e.other)) ??
    entries.find((e) => e.general || e.other) ??
    entries[0];
  if (!match) return { hts_code: code, error: 'not_found', message: `No HTS line found for "${code}".` };

  const base = shapeEntry(match);
  const refs = base.section_301_232_refs;

  // Resolve each Chapter-99 reference to its additional rate.
  const provisions = await Promise.all(
    refs.map(async (ref) => {
      try {
        const sub = await htsSearchRaw(ref);
        const hit = sub.find((e) => (e.htsno ?? '').startsWith(ref)) ?? sub[0];
        return {
          code: ref,
          meaning: provisionMeaning(ref),
          additional_rate: hit?.general ?? null,
          description: (hit?.description ?? '').replace(/<\/?il>/g, '').trim() || null,
        };
      } catch {
        return { code: ref, meaning: provisionMeaning(ref), additional_rate: null, description: null };
      }
    }),
  );

  const note = provisions.length
    ? `Base general rate ${base.general_rate ?? 'n/a'}. Additional Chapter-99 duties may stack on top for the relevant origin/material — see provisions[] (e.g. Section 301 adds to China-origin goods). Effective tariff = base + applicable additional rate.`
    : `Base general rate ${base.general_rate ?? 'n/a'}. No Section 301/232 add-ons referenced on this line.`;

  return { ...base, provisions, note };
}

// ── Router ───────────────────────────────────────────────────────────

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'hts_search':
      return htsSearch(args.query as string, args.limit as number | undefined);
    case 'hts_lookup':
      return htsLookup(args.hts_code as string);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
