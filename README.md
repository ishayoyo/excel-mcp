# Excel MCP Server

MCP server that gives Claude full read/write/analyze power over Excel and CSV files. 37 tools — from basic cell reads to financial modeling.

## Install

### Option 1: npm (Recommended)

```bash
npm install -g excel-csv-mcp-server
```

Then add to your MCP client:

**Claude Code:**
```bash
claude mcp remove excel-csv  # if previously added
claude mcp add excel-csv --transport stdio excel-csv-mcp-server
```

**Claude Desktop / Cursor** — add to your MCP config (`claude_desktop_config.json` or Cursor's `mcp.json`):
```json
{
  "mcpServers": {
    "excel-csv": {
      "command": "excel-csv-mcp-server"
    }
  }
}
```

### Option 2: npx (No Install)

No global install needed — runs directly:

**Claude Code:**
```bash
claude mcp add excel-csv stdio npx -- excel-csv-mcp-server
```

**Claude Desktop / Cursor:**
```json
{
  "mcpServers": {
    "excel-csv": {
      "command": "npx",
      "args": ["-y", "excel-csv-mcp-server"]
    }
  }
}
```

### Option 3: From Source

```bash
git clone https://github.com/ishayoyo/excel-mcp.git
cd excel-mcp
npm install
npm run build
```

**Claude Code:**
```bash
claude mcp add excel-csv stdio node /path/to/excel-mcp/dist/index.js
```

**Claude Desktop / Cursor:**
```json
{
  "mcpServers": {
    "excel-csv": {
      "command": "node",
      "args": ["/path/to/excel-mcp/dist/index.js"]
    }
  }
}
```

## What It Can Do

| Category | Tools | Examples |
|----------|-------|---------|
| **Read & Navigate** | `read_file`, `get_cell`, `get_range`, `get_headers`, `search`, `filter_rows`, `aggregate` | Read files, search values, filter rows, sum columns |
| **Large Files** | `read_file_chunked`, `get_file_info` | Stream 100MB+ files in chunks |
| **Write & Format** | `write_file`, `add_sheet`, `write_multi_sheet`, `export_analysis`, `format_cells`, `auto_fit_columns` | Create Excel/CSV, multi-sheet with formulas, style cells |
| **Analytics** | `statistical_analysis`, `correlation_analysis`, `data_profile`, `pivot_table` | Stats, correlations, profiling, pivot tables |
| **Financial** | `dcf_analysis`, `budget_variance_analysis`, `ratio_analysis`, `scenario_modeling`, `trend_analysis` | DCF valuation, budget vs actual, financial ratios, what-if scenarios |
| **Data Cleaning** | `find_duplicates`, `data_cleaner`, `vlookup_helper` | Remove duplicates, fix dates/phones/names, cross-file lookups |
| **Bulk Ops** | `bulk_aggregate_multi_files`, `bulk_filter_multi_files` | Aggregate/filter across multiple files |
| **Validation** | `validate_data_consistency` | Cross-file referential integrity checks |
| **AI-Powered** | `evaluate_formula`, `parse_natural_language`, `explain_formula`, `smart_data_analysis`, `ai_provider_status` | Evaluate formulas, natural language to formula, AI analysis |

## AI Providers (Optional)

For AI-powered tools (`parse_natural_language`, `explain_formula`, `smart_data_analysis`), create a `.env` file:

```bash
cp .env.example .env
```

```env
ANTHROPIC_API_KEY=your-key
OPENAI_API_KEY=your-key
DEEPSEEK_API_KEY=your-key
GEMINI_API_KEY=your-key
```

Any single provider is enough. A local fallback works without any keys.

> **Data leaves your machine when a provider key is set.** The AI tools send the
> spreadsheet content they are analysing to whichever provider you configured
> (Anthropic, OpenAI, DeepSeek, or Gemini). Leave the keys unset to keep every
> operation local -- the built-in fallback provider makes no network calls.

## Security

The server reads and writes only `.csv`, `.xlsx`, and `.xls` files, and runs over
stdio as a local process with your own user's permissions.

### Restricting file access

By default any path you name is allowed, because opening a spreadsheet anywhere on
your disk is the point of the tool. If you expose the server to callers you do not
fully trust -- or want a guardrail against a malicious spreadsheet talking the model
into writing somewhere unexpected -- confine it to one directory:

```env
EXCEL_MCP_WORKSPACE_ROOT=/path/to/your/data
```

Every read and write then resolves inside that directory, and anything escaping it
is rejected. Unset the variable to restore the default behaviour.

Note that containment is checked after the path is resolved, so `..` traversal is
handled, but symlinks are not followed: a symlink inside the root that points
outside it will still resolve. Avoid placing untrusted symlinks in the workspace.

### CSV formula injection

Spreadsheet applications evaluate a cell beginning with `=`, `+`, `-`, `@`, tab, or
carriage return as a formula. When writing CSV, this server prefixes such values
with a single quote so they stay literal text (CWE-1236). Plain numbers like `-5`
and `+1.5` are recognised and left alone, so numeric data round-trips unchanged.

This guard is on by default. To emit raw values instead:

```env
EXCEL_MCP_CSV_FORMULA_GUARD=off
```

Excel output is unaffected -- `.xlsx` cells are written as typed strings, which are
never evaluated as formulas.

## License

MIT
