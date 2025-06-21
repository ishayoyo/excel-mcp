# 📊 Excel/CSV MCP Server

> **Supercharge Claude with spreadsheet superpowers!** 🚀

A sleek MCP server that lets Claude read, analyze, and manipulate Excel & CSV files like a data wizard.

## ✨ Features

🎯 **Smart Data Access** - Get any cell, range, or entire sheets  
🔍 **Intelligent Search** - Find data with fuzzy or exact matching  
📊 **Built-in Analytics** - SUM, AVG, COUNT, MIN, MAX operations  
🔧 **Advanced Filtering** - Query data with conditions  
⚡ **Lightning Fast** - Optimized for large datasets  
📈 **Multi-format** - CSV, XLSX, XLS support  

## 🚀 Quick Start

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

```
🗣️ "Read my sales_data.csv file"
🗣️ "What's the total revenue this quarter?"
🗣️ "Find all customers named 'Smith'"
🗣️ "Show me sales over $10,000"
🗣️ "What's in cell B5?"
🗣️ "Calculate average employee salary"
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

## 🏗️ Development

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