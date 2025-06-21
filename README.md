# 📊 Excel/CSV MCP Server

[![smithery badge](https://smithery.ai/badge/@ishayoyo/excel-mcp)](https://smithery.ai/server/@ishayoyo/excel-mcp)

> **Supercharge Claude with spreadsheet superpowers!** 🚀

A sleek MCP server that lets Claude read, analyze, and manipulate Excel & CSV files like a data wizard.

## ✨ Features

🎯 **Smart Data Access** - Get any cell, range, or entire sheets  
🔍 **Intelligent Search** - Find data with fuzzy or exact matching  
📊 **Built-in Analytics** - SUM, AVG, COUNT, MIN, MAX operations  
🔧 **Advanced Filtering** - Query data with conditions  
⚡ **Lightning Fast** - Optimized for large datasets  
📈 **Multi-format** - CSV, XLSX, XLS support  
💾 **Write & Export** - Create new files and export analysis results  
📊 **Statistical Analysis** - Comprehensive stats, correlations, profiling  

## 🚀 Quick Start

### Installing via Smithery

To install Excel/CSV Data Science Server for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@ishayoyo/excel-mcp):

```bash
npx -y @smithery/cli install @ishayoyo/excel-mcp --client claude
```

### Manual Installation
```bash
git clone <your-repo-url>
cd excel-csv-mcp
npm install && npm run build
```

### Setup with Claude Desktop

Add to your config file (`%APPDATA%\Claude\claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "excel-csv": {
      "command": "node",
      "args": ["C:\\path\\to\\excel-csv-mcp\\dist\\index.js"]
    }
  }
}
```

**WSL Users**: Use this instead:
```json
{
  "mcpServers": {
    "excel-csv": {
      "command": "wsl",
      "args": ["-e", "node", "/mnt/c/path/to/excel-csv-mcp/dist/index.js"]
    }
  }
}
```

## 💡 Usage Examples

### Reading & Analysis
```
🗣️ "Read my sales_data.csv file"
🗣️ "What's the total revenue this quarter?"
🗣️ "Find all customers named 'Smith'"
🗣️ "Show me sales over $10,000"
🗣️ "What's in cell B5?"
🗣️ "Calculate average employee salary"
🗣️ "Show me salary statistics by department"
```

### Writing & Exporting
```
🗣️ "Export the pivot table results to department_summary.xlsx"
🗣️ "Save the statistical analysis to salary_stats.csv"
🗣️ "Create a new Excel file with filtered results"
🗣️ "Export correlation analysis between sales and costs"
```

## 🛠️ Available Tools

| Tool | Description | Example |
|------|-------------|---------|
| `read_file` | Read entire file | Get all data |
| `get_cell` | Single cell value | `B5` → "John Doe" |
| `get_range` | Cell range | `A1:D10` |
| `get_headers` | Column names | ["Name", "Age", "City"] |
| `search` | Find values | Search "Electronics" |
| `filter_rows` | Conditional filtering | Sales > $1000 |
| `aggregate` | Math operations | SUM, AVG, COUNT |
| `statistical_analysis` | Comprehensive stats | Mean, median, std dev, quartiles |
| `correlation_analysis` | Correlation between columns | Pearson correlation coefficient |
| `data_profile` | Full data profiling | Complete analysis of all columns |
| `pivot_table` | Group and aggregate | Group by category, sum sales |
| `write_file` | Write new CSV/Excel file | Create files with data |
| `export_analysis` | Export analysis results | Save pivot tables, stats to file |

## 🔧 Alternative Setup (Using npx)

Instead of editing config files, you can also use npx directly:

```bash
npx @modelcontextprotocol/inspector dist/index.js
```

This opens a test interface to try out the tools.

## 🏗️ For Developers Only

```bash
npm run dev    # Hot reload
npm run build  # Production build
npm run lint   # Code quality
```

## 🎯 Perfect For

- 📈 Financial analysis
- 👥 HR data management  
- 🛒 Sales reporting
- 📋 Inventory tracking
- 🎓 Academic research

---

**Made with ❤️ for the Claude ecosystem**
