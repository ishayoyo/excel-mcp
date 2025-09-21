# Installation Guide for Excel-CSV MCP Server

## Prerequisites
- Node.js installed (version 14 or higher)
- npm (comes with Node.js)
- Claude Code installed

## Installation Steps

### 1. Clone or Copy the Project
```bash
# Clone the repository or copy the excel-mcp folder to your desired location
cd C:\Users\HOME\documents\excel-mcp
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Build the Project
```bash
npm run build
```
This will compile TypeScript files and create the `dist/` folder with the compiled JavaScript files.

### 4. Configure MCP Server in Claude Code

#### For Windows:
```bash
# Add the MCP server to Claude Code using forward slashes
claude mcp add excel-csv "node" "C:/Users/HOME/documents/excel-mcp/dist/index.js"

# Alternative with backslashes (escaped)
claude mcp add excel-csv "node" "C:\\Users\\HOME\\documents\\excel-mcp\\dist\\index.js"
```

#### For Other Directories:
Replace the path with your actual installation path:
```bash
# Example for different directory
claude mcp add excel-csv "node" "C:/path/to/your/excel-mcp/dist/index.js"
```

### 5. Verify Installation
```bash
# List configured MCP servers
claude mcp list

# Expected output:
# excel-csv: node C:/Users/HOME/documents/excel-mcp/dist/index.js - ✓ Connected

# Get details about the server
claude mcp get excel-csv
```

## Available MCP Tools After Installation

Once installed, the following tools will be available with the prefix `mcp__excel-csv__`:

- `read_file` - Read Excel/CSV files
- `write_file` - Write Excel/CSV files
- `get_cell` - Get specific cell value
- `get_headers` - Get column headers from a file
- `statistical_analysis` - Perform statistical analysis
- `pivot_table` - Create pivot tables
- `export_analysis` - Export analysis results
- `evaluate_formula` - Evaluate Excel formulas
- `write_multi_sheet` - Create multi-sheet Excel files with formulas

## Formula Engine Features

The MCP server includes a complete formula engine supporting:

### Functions
- Math: SUM, AVERAGE, COUNT, MAX, MIN, ROUND, ABS, SQRT, POWER, etc.
- Text: CONCATENATE, LEFT, RIGHT, MID, UPPER, LOWER, TRIM, etc.
- Logical: IF, AND, OR, NOT, IFERROR, IFNA, XOR
- Lookup: VLOOKUP, HLOOKUP, INDEX, MATCH
- Conditional: SUMIF, COUNTIF, SUMIFS, COUNTIFS
- Date/Time: TODAY, NOW, DATE, YEAR, MONTH, DAY

### Capabilities
- Cross-sheet references (Sheet1!A1, Sheet2!B2:C10)
- Named ranges
- Nested functions
- All Excel operators (+, -, *, /, ^, &, comparison)
- Circular reference detection
- Error handling (#VALUE!, #DIV/0!, #REF!, etc.)

## Troubleshooting

### If MCP server doesn't connect:

1. **Check Node.js is installed:**
   ```bash
   node --version
   ```

2. **Verify the dist folder exists:**
   ```bash
   ls C:\Users\HOME\documents\excel-mcp\dist\
   ```

3. **Rebuild if necessary:**
   ```bash
   cd C:\Users\HOME\documents\excel-mcp
   npm run build
   ```

4. **Remove and re-add the server:**
   ```bash
   claude mcp remove excel-csv
   claude mcp add excel-csv "node" "C:/Users/HOME/documents/excel-mcp/dist/index.js"
   ```

### Windows Path Notes:
- Use forward slashes `/` or escaped backslashes `\\` in paths
- Full absolute paths are more reliable than relative paths
- Ensure no spaces in the path or wrap in quotes

## Usage in Claude Code

After installation, you can:
1. Use `/mcp` command to see available tools
2. Tools will be available with prefix `mcp__excel-csv__`
3. The formula engine can be used through the `evaluate_formula` and `write_multi_sheet` tools

## Configuration Files

The MCP server configuration is stored in:
- Local project config: `.claude.json` in your project directory
- Global config: `C:\Users\HOME\.claude.json`

## Uninstallation

To remove the MCP server:
```bash
claude mcp remove excel-csv
```

## Support

For issues or questions, check:
- The README.md file for usage examples
- The `src/formula/` directory for formula engine implementation details
- The `src/index.ts` file for available MCP tools and their parameters