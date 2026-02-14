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

## License

MIT
