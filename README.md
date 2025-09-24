# Excel MCP Server

An MCP server that brings Excel/CSV data analysis capabilities to Claude, with a custom-built formula engine and AI-powered features.

**What makes this different:** The world's first conversational data analysis MCP server powered by HyperFormula (394 Excel functions) + multi-provider AI. Ask questions in natural language and get instant insights from your Excel/CSV files. Built for analysts who want AI-powered conversations with their data, not just spreadsheet manipulation.

## How It Works

This server acts as a bridge between Claude and your data files, providing:

1. **Formula Engine**: A complete Excel-compatible formula parser and evaluator built from scratch, supporting 82 functions with proper operator precedence and dependency tracking.

2. **Data Operations**: Direct read/write access to CSV and Excel files with intelligent parsing and type detection.

3. **AI Integration**: Multi-provider AI support that intelligently routes requests to the best available AI service for natural language processing and formula generation.

4. **Bulk Processing**: Parallel operations across multiple files for improved performance on large datasets.

## Features

- **394 Excel functions** via HyperFormula (battle-tested library)
- **AI-powered natural language** data queries
- **Multi-provider AI support** (Anthropic, OpenAI, DeepSeek, Gemini)
- **Large file support** with intelligent chunking for files >100MB
- **Bulk operations** across multiple files (3x faster)
- **Smart data validation** and consistency checking
- **Advanced statistical analysis** and data profiling
- **Formula evaluation** with dependency tracking
- **Pivot tables** and aggregation
- **Cross-file referential integrity** validation
- **Excel styling and formatting** with auto-fitting columns and cell formatting

### 🏢 CFO-Level Financial Analysis

- **DCF Valuation Models** - Complete discounted cash flow analysis with NPV, IRR, terminal value
- **Financial Ratio Analysis** - Comprehensive ratios with industry benchmarks (liquidity, profitability, leverage)
- **Budget Variance Analysis** - Automated budget vs actual comparisons with variance reporting
- **Scenario Modeling** - What-if analysis with multiple assumption scenarios
- **Financial Functions** - NPV, IRR, PMT, FV, PV, RATE, depreciation schedules, and more
- **Industry Benchmarking** - Automatic comparison against industry standards

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

## Cursor Claude Desktop Setup

### Option 1: Direct MCP Configuration
Edit your Cursor MCP configuration file (`%APPDATA%\Cursor\mcp.json` on Windows, `~/Library/Application Support/Cursor/mcp.json` on macOS):

```json
{
  "mcpServers": {
    "excel-csv": {
      "command": "node",
      "args": ["C:/path/to/excel-mcp/dist/index.js"]
    }
  }
}
```

Replace `C:/path/to/excel-mcp/dist/index.js` with the actual path to your built `dist/index.js` file.

### Option 2: Using npx (Recommended)
```json
{
  "mcpServers": {
    "excel-csv": {
      "command": "npx",
      "args": ["-y", "excel-csv-mcp"]
    }
  }
}
```

This requires a global npm install:
```bash
npm install -g .
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
- "Analyze this 500MB dataset in chunks to avoid memory issues"
- "Get file info and optimal chunk size for large_dataset.csv"

## Available Tools

### Core Operations
- `read_file` - Read CSV/Excel files (supports offset/limit for large files)
- `read_file_chunked` - Stream large files in manageable chunks to avoid memory limits
- `get_file_info` - Analyze file size and get chunking recommendations for large datasets
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

### Styling & Formatting
- `format_cells` - Apply fonts, colors, borders, alignment to Excel cells
- `auto_fit_columns` - Automatically adjust column widths to fit content
- `write_multi_sheet` - Create complex Excel files with formulas and formatting

### Validation & Export
- `validate_data_consistency` - Cross-file data integrity checks
- `write_file` / `export_analysis` - Create and export files

## Key Features

🤖 **AI-Powered Intelligence**
- Ask "What's the correlation between sales and marketing spend?" → Gets instant statistical analysis
- Say "Find all customers who spent over $1000 last quarter" → AI generates complex formulas automatically
- Request "Explain what this VLOOKUP formula does" → Gets plain English explanation

⚡ **Bulk Data Processing**
- "Sum total revenue across 10 quarterly files" → Processes in parallel (3x faster than manual)
- "Find all employees with 'Manager' in their title across 5 HR spreadsheets" → Multi-file search
- "Aggregate sales data from Q1, Q2, Q3, Q4 files into one report" → Automated consolidation

🧮 **Programmatic Formula Engine**
- Evaluates `=SUMIFS(C:C, A:A, ">=1/1/2024")` without Excel installed
- Computes complex nested formulas with proper precedence
- Handles circular references and dependency tracking
- 82 functions implemented programmatically

📊 **Advanced Analytics**
- Comprehensive statistical profiling of every column
- Correlation analysis between any numeric columns
- Smart data quality validation across multiple files
- Automated outlier detection and data consistency checks

🔍 **Smart Cross-File Operations**
- "Validate that all customer IDs in sales.xlsx exist in customers.xlsx"
- "Check for duplicate emails across 3 contact lists"
- "Find missing data between related spreadsheets"
- Referential integrity validation (like database foreign keys but for spreadsheets)

🎯 **Natural Language Data Conversations**
- "Show me the top 10 products by revenue" → AI understands intent and executes
- "Calculate average order value for customers from California" → Generates optimal query
- "Create a summary of sales trends by month" → Suggests best analysis approach

📈 **Large File Processing (NEW)**
- **Intelligent Chunking**: Automatically handles files >100MB without memory errors
- **Smart Recommendations**: `get_file_info` analyzes files and suggests optimal chunk sizes
- **Seamless Navigation**: Read any chunk with proper headers and metadata
- **Memory Efficient**: Constant memory usage regardless of file size (tested up to 1M+ rows)
- **Progress Tracking**: Chunk navigation with hasNext/hasPrevious indicators

## Why This Approach Matters

**Traditional Excel tools** focus on file manipulation - reading, writing, formatting. They treat spreadsheets as static documents.

**This server** treats your data as a dynamic knowledge base you can have conversations with. It's not about pretty formatting - it's about CFO-level financial modeling, strategic analysis, and executive decision-making powered by AI.

**Built for CFOs, financial analysts, and executives who need:** 💰 DCF valuations and investment analysis 📊 Financial ratio analysis with benchmarks 🎯 Scenario planning and risk modeling 💼 Budget variance tracking and reporting 🤖 AI-powered financial insights at conversational speed

## License

MIT