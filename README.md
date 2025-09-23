# Excel MCP Server

An MCP server that brings Excel/CSV data analysis capabilities to Claude, with a custom-built formula engine and AI-powered features.

## How It Works

This server acts as a bridge between Claude and your data files, providing:

1. **Formula Engine**: A complete Excel-compatible formula parser and evaluator built from scratch, supporting 82 functions with proper operator precedence and dependency tracking.

2. **Data Operations**: Direct read/write access to CSV and Excel files with intelligent parsing and type detection.

3. **AI Integration**: Multi-provider AI support that intelligently routes requests to the best available AI service for natural language processing and formula generation.

4. **Bulk Processing**: Parallel operations across multiple files for improved performance on large datasets.

## Features

- **82 Excel functions** implemented from scratch
- **AI-powered natural language** data queries
- **Multi-provider AI support** (Anthropic, OpenAI, DeepSeek, Gemini)
- **Bulk operations** across multiple files
- **Smart data validation** and consistency checking
- **Statistical analysis** and data profiling
- **Formula evaluation** with dependency tracking

## Installation

```bash
git clone https://github.com/ishayoyo/excel-mcp.git
cd excel-mcp
npm install
npm run build
```

## Claude Code Setup

### Option 1: Direct MCP Configuration
```bash
# Add to Claude Code
claude mcp add excel-csv "node" "C:/path/to/excel-mcp/dist/index.js"
```

### Option 2: Global Install
```bash
npm install -g .
# Then configure in Claude Code with:
# Command: npx
# Args: -y excel-csv-mcp
```

## AI Providers

Create a `.env` file with your API keys:

```bash
cp .env.example .env
```

```env
ANTHROPIC_API_KEY=your-key-here
OPENAI_API_KEY=your-key-here
DEEPSEEK_API_KEY=your-key-here
GEMINI_API_KEY=your-key-here
```

Supported providers: Anthropic, OpenAI, DeepSeek, Gemini, Local fallback

## Usage Examples

Ask questions in natural language:

- "What's the total revenue in sales_data.csv?"
- "Sum all sales where region is 'North'"
- "Find duplicates in customer_data.xlsx"
- "Generate a formula to calculate average of last 30 days"
- "Validate data consistency between sales.xlsx and branches.xlsx"
- "Create a pivot table by department and export to report.xlsx"

## Available Tools

### Core Operations
- `read_file` - Read CSV/Excel files
- `get_cell` / `get_range` - Access specific cells or ranges
- `search` / `filter_rows` - Find and filter data
- `aggregate` - SUM, AVG, COUNT, MIN, MAX operations

### Bulk Operations
- `bulk_aggregate_multi_files` - Aggregate across multiple files (3x faster)
- `bulk_filter_multi_files` - Filter multiple files simultaneously

### Formula Engine
- `evaluate_formula` - Execute Excel formulas
- `parse_natural_language` - Convert text to formulas
- `explain_formula` - Explain formula functionality

### Analytics
- `statistical_analysis` - Comprehensive statistics
- `correlation_analysis` - Find relationships between columns
- `data_profile` - Complete data profiling
- `pivot_table` - Group and aggregate data

### AI Features
- `smart_data_analysis` - AI-powered analysis suggestions
- `ai_provider_status` - Check AI provider availability

### Validation & Export
- `validate_data_consistency` - Cross-file data integrity checks
- `write_file` / `export_analysis` - Create and export files

## Comparison with Other Solutions

Several Excel MCP servers exist. Here's how this one compares:

| Feature | This Server | excel-mcp-server (uvx) | Traditional Excel |
|---------|-------------|-----------------------|-------------------|
| **Formula Engine** | ✅ 82 functions from scratch | ✅ Full Excel formula support | ✅ 400+ functions |
| **AI Integration** | ✅ Multi-provider AI | ❌ None | ❌ None |
| **Natural Language** | ✅ "Sum sales in Q4" | ❌ Manual operations | ❌ Manual operations |
| **Bulk Operations** | ✅ Multi-file parallel processing | ❌ Single file only | ❌ Manual |
| **Data Validation** | ✅ Cross-file integrity checks | ✅ Built-in validation | ✅ Cell validation |
| **Analytics** | ✅ Statistics, correlations, profiling | ❌ None | ✅ Basic stats |
| **Platform Support** | ✅ Cross-platform | ✅ Cross-platform | 💰 Windows/Mac |
| **Excel Required** | ❌ No Excel needed | ❌ No Excel needed | ✅ Excel required |
| **Remote/Local** | ✅ Local only | ✅ Both local & remote | ✅ Local only |
| **Charts & Formatting** | ❌ Basic support | ✅ Full Excel formatting, charts, pivot tables | ✅ Native |
| **Transport Options** | ✅ Stdio only | ✅ Stdio, SSE, HTTP | ✅ Local files |
| **Installation** | ✅ npm install + build | ✅ uvx (zero-install) | ✅ Microsoft Office |

**Choose this server if you want:**
- **AI-powered data analysis** with natural language queries
- **Custom formula engine** for complex calculations
- **Multi-file bulk operations** (3x faster processing)
- **Advanced statistical analysis** and data profiling
- **Cross-file data validation** and consistency checking
- **Developer-friendly** with full source code access

**Choose excel-mcp-server if you need:**
- **Full Excel compatibility** without Microsoft Excel installed
- **Complete formatting, charts, and pivot tables**
- **Remote server capabilities** with HTTP/SSE transport
- **Zero-install deployment** with uvx
- **Enterprise Excel manipulation** features

## Development

```bash
npm run dev    # Development server with hot reload
npm run build  # Build for production
npm run lint   # Run linter
```

## License

MIT