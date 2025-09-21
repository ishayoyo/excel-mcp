# 🛠️ Excel MCP Operations Reference

**Complete documentation of all 23 MCP tools available in the Excel MCP Server**

---

## 📋 **Tool Categories Overview**

| Category | Tools | Description |
|----------|-------|-------------|
| 📊 **Basic File Operations** | 5 tools | Read files, access cells, get ranges, headers, search |
| 🔍 **Data Analysis & Filtering** | 2 tools | Filter rows, perform aggregations |
| 📈 **Advanced Data Science** | 4 tools | Statistics, correlations, profiling, pivot tables |
| 💾 **File Writing & Export** | 4 tools | Create files, add sheets, export analysis |
| 🤖 **AI-Powered Tools** | 5 tools | Formula evaluation, natural language, smart analysis |
| ✅ **Data Validation** | 1 tool | Cross-file data integrity validation |
| 🚀 **Bulk Operations** | 2 tools | Multi-file parallel processing |

---

## 📊 **Basic File Operations**

### 1. **read_file**
**Read an entire CSV or Excel file**

**Parameters:**
- `filePath` (string, required): Path to the CSV or Excel file
- `sheet` (string, optional): Sheet name for Excel files (defaults to first sheet)

**Usage Example:**
```
"Read the sales_data.xlsx file"
"Read the Q1 sheet from financial_report.xlsx"
```

**Returns:** Complete file data as array of arrays

---

### 2. **get_cell**
**Get the value of a specific cell using A1 notation**

**Parameters:**
- `filePath` (string, required): Path to the CSV or Excel file
- `cell` (string, required): Cell address in A1 notation (e.g., "A1", "B5")
- `sheet` (string, optional): Sheet name for Excel files

**Usage Example:**
```
"What's in cell B5 of sales_data.xlsx?"
"Get the value from cell A1 in the Summary sheet"
```

**Returns:** Single cell value

---

### 3. **get_range**
**Get values from a range of cells**

**Parameters:**
- `filePath` (string, required): Path to the CSV or Excel file
- `startCell` (string, required): Start cell in A1 notation (e.g., "A1")
- `endCell` (string, required): End cell in A1 notation (e.g., "D10")
- `sheet` (string, optional): Sheet name for Excel files

**Usage Example:**
```
"Get the range A1:D10 from sales_data.xlsx"
"Extract cells B2:F20 from the Data sheet"
```

**Returns:** Array of arrays containing the range data

---

### 4. **get_headers**
**Get the column headers (first row) of a file**

**Parameters:**
- `filePath` (string, required): Path to the CSV or Excel file
- `sheet` (string, optional): Sheet name for Excel files

**Usage Example:**
```
"What are the column headers in employee_data.csv?"
"Show me the headers from the Sales sheet"
```

**Returns:** Array of column header names

---

### 5. **search**
**Search for cells containing a specific value**

**Parameters:**
- `filePath` (string, required): Path to the CSV or Excel file
- `searchValue` (string, required): Value to search for
- `exact` (boolean, optional): Whether to match exactly or contains (default: false)
- `sheet` (string, optional): Sheet name for Excel files

**Usage Example:**
```
"Find all cells containing 'Electronics' in products.xlsx"
"Search for exact match of 'Manager' in employee_data.csv"
```

**Returns:** Array of matching cell locations and values

---

## 🔍 **Data Analysis & Filtering**

### 6. **filter_rows**
**Filter rows based on column values**

**Parameters:**
- `filePath` (string, required): Path to the CSV or Excel file
- `column` (string, required): Column name or index (0-based)
- `condition` (string, required): One of: `equals`, `contains`, `greater_than`, `less_than`
- `value` (string, required): Value to compare against
- `sheet` (string, optional): Sheet name for Excel files

**Usage Example:**
```
"Show all rows where salary > 50000"
"Filter for rows where department equals 'Sales'"
"Find rows where product name contains 'iPhone'"
```

**Returns:** Filtered data matching the criteria

---

### 7. **aggregate**
**Perform aggregation operations on a column**

**Parameters:**
- `filePath` (string, required): Path to the CSV or Excel file
- `column` (string, required): Column name or index (0-based)
- `operation` (string, required): One of: `sum`, `average`, `count`, `min`, `max`
- `sheet` (string, optional): Sheet name for Excel files

**Usage Example:**
```
"Calculate the total revenue"
"Find the average salary by department"
"Count the number of products"
```

**Returns:** Aggregated result (number)

---

## 📈 **Advanced Data Science**

### 8. **statistical_analysis**
**Perform comprehensive statistical analysis on a column**

**Parameters:**
- `filePath` (string, required): Path to the CSV or Excel file
- `column` (string, required): Column name or index (0-based)
- `sheet` (string, optional): Sheet name for Excel files

**Usage Example:**
```
"Analyze the sales revenue statistics"
"Show statistical summary of employee ages"
```

**Returns:** Complete statistical profile including:
- Mean, median, mode
- Standard deviation, variance
- Quartiles (Q1, Q2, Q3)
- Skewness, coefficient of variation
- Min, max, range

---

### 9. **correlation_analysis**
**Calculate correlation between two numeric columns**

**Parameters:**
- `filePath` (string, required): Path to the CSV or Excel file
- `column1` (string, required): First column name or index (0-based)
- `column2` (string, required): Second column name or index (0-based)
- `sheet` (string, optional): Sheet name for Excel files

**Usage Example:**
```
"Find correlation between sales and marketing spend"
"Calculate correlation between age and salary"
```

**Returns:**
- Pearson correlation coefficient
- Correlation strength interpretation
- Statistical significance

---

### 10. **data_profile**
**Generate comprehensive data profiling report for all columns**

**Parameters:**
- `filePath` (string, required): Path to the CSV or Excel file
- `sheet` (string, optional): Sheet name for Excel files

**Usage Example:**
```
"Give me a complete data profile of customer_data.xlsx"
"Analyze all columns in the sales dataset"
```

**Returns:** For each column:
- Data type detection
- Missing value count and percentage
- Unique value count
- Basic statistics (for numeric columns)
- Sample values

---

### 11. **pivot_table**
**Create pivot table with grouping and aggregation**

**Parameters:**
- `filePath` (string, required): Path to the CSV or Excel file
- `groupBy` (string, required): Column to group by
- `aggregateColumn` (string, required): Column to aggregate
- `operation` (string, required): One of: `sum`, `average`, `count`, `min`, `max`
- `sheet` (string, optional): Sheet name for Excel files

**Usage Example:**
```
"Create pivot table: group by department, sum salaries"
"Show average sales by region"
"Count products by category"
```

**Returns:** Pivot table as array with grouped results

---

## 💾 **File Writing & Export**

### 12. **write_file**
**Write data to a new CSV or Excel file (supports multiple sheets for Excel)**

**Parameters:**
- `filePath` (string, required): Path for the new file (must end with .csv, .xlsx, or .xls)

**Single Sheet Mode:**
- `data` (array, optional): Array of arrays representing rows of data
- `headers` (array, optional): Optional headers for the first row
- `sheet` (string, optional): Sheet name for Excel files (defaults to "Sheet1")

**Multi-Sheet Mode:**
- `sheets` (array, optional): Array of sheet objects
  - Each sheet: `name` (required), `data` (required), `headers` (optional)

**Usage Example:**
```
"Create a new Excel file with this filtered data"
"Export the analysis results to summary_report.xlsx"
```

**Returns:** Success confirmation with file details

---

### 13. **add_sheet**
**Add a new sheet to an existing Excel file**

**Parameters:**
- `filePath` (string, required): Path to the existing Excel file (.xlsx or .xls)
- `sheetName` (string, required): Name for the new sheet
- `data` (array, required): Array of arrays representing rows of data
- `headers` (array, optional): Optional headers for the first row
- `position` (number, optional): Position to insert the sheet (0-based index)

**Usage Example:**
```
"Add a new 'Q4_Results' sheet to annual_report.xlsx"
"Insert this data as a new sheet called 'Analysis'"
```

**Returns:** Success confirmation with sheet details

---

### 14. **write_multi_sheet**
**Create a complex Excel file with multiple sheets, formulas, and inter-sheet references**

**Parameters:**
- `filePath` (string, required): Path for the new Excel file (must end with .xlsx or .xls)
- `sheets` (array, required): Array of sheet definitions
  - Each sheet: `name`, `data`, `headers` (optional), `formulas` (optional)
  - Formula objects: `cell` (required), `formula` (required)
- `sheetReferences` (boolean, optional): Enable inter-sheet formula references (default: true)

**Usage Example:**
```
"Create a multi-sheet workbook with formulas linking the sheets"
"Build a comprehensive report with Summary, Data, and Calculations sheets"
```

**Returns:** Success confirmation with workbook details

**Special Features:**
- Cross-sheet formula references (e.g., `=Data!A1+Summary!B2`)
- Complex Excel formulas
- Automatic formula dependency resolution

---

### 15. **export_analysis**
**Export analysis results (pivot tables, statistics, etc.) to a new file**

**Parameters:**
- `analysisType` (string, required): One of: `pivot_table`, `statistical_analysis`, `correlation`, `data_profile`
- `sourceFile` (string, required): Path to the source data file
- `outputFile` (string, required): Path for the output file
- `analysisParams` (object, required): Parameters specific to the analysis type

**Usage Example:**
```
"Export the pivot table analysis to pivot_summary.xlsx"
"Save the statistical analysis to stats_report.csv"
```

**Returns:** Export confirmation with file details

---

## 🤖 **AI-Powered Tools**

### 16. **evaluate_formula**
**Evaluate an Excel formula with given context**

**Parameters:**
- `formula` (string, required): Excel formula to evaluate (e.g., "=SUM(A1:A10)", "=VLOOKUP(B2,C:D,2,FALSE)")
- `context` (object, optional): Cell values and ranges for formula evaluation

**Usage Example:**
```
"Calculate this formula: =SUM(A1:A10)"
"Evaluate =VLOOKUP(B2,C:D,2,FALSE) with the given data"
```

**Returns:** Formula result and calculation details

**Supported Functions:** 200+ Excel functions including:
- Mathematical: SUM, AVERAGE, COUNT, etc.
- Lookup: VLOOKUP, HLOOKUP, INDEX, MATCH
- Text: CONCATENATE, LEFT, RIGHT, MID
- Date: TODAY, DATE, YEAR, MONTH
- Logical: IF, AND, OR, NOT

---

### 17. **parse_natural_language**
**Convert natural language to Excel formula or command**

**Parameters:**
- `query` (string, required): Natural language query (e.g., "sum all sales", "find duplicates", "average by category")
- `filePath` (string, optional): Path to file for context
- `provider` (string, optional): AI provider: `anthropic`, `openai`, `deepseek`, `gemini`, `local`

**Usage Example:**
```
"Convert to formula: sum all sales in January"
"Create a formula to find the maximum value in column B"
"Generate a VLOOKUP formula to find customer names"
```

**Returns:**
- Generated Excel formula
- Explanation of what the formula does
- Alternative formula suggestions

---

### 18. **explain_formula**
**Explain what an Excel formula does in plain English**

**Parameters:**
- `formula` (string, required): Excel formula to explain (e.g., "=VLOOKUP(A2,B:C,2,FALSE)")
- `provider` (string, optional): AI provider: `anthropic`, `openai`, `deepseek`, `gemini`, `local`

**Usage Example:**
```
"Explain this formula: =SUMIFS(C:C, A:A, '>1000', B:B, 'Electronics')"
"What does this VLOOKUP formula do: =VLOOKUP(A2,Sheet2!B:D,3,FALSE)"
```

**Returns:**
- Plain English explanation
- Parameter breakdown
- Use case examples

---

### 19. **ai_provider_status**
**Check status of available AI providers**

**Parameters:** None

**Usage Example:**
```
"Check which AI providers are available"
"Show the status of OpenAI and Anthropic connections"
```

**Returns:**
- List of configured providers
- Connection status for each
- Available models
- Rate limit information

---

### 20. **smart_data_analysis**
**AI-powered analysis suggestions for your data**

**Parameters:**
- `filePath` (string, required): Path to the CSV or Excel file to analyze
- `sheet` (string, optional): Sheet name for Excel files
- `provider` (string, optional): AI provider: `anthropic`, `openai`, `deepseek`, `gemini`, `local`

**Usage Example:**
```
"Suggest the best analysis approach for this sales dataset"
"What insights can I get from this customer data?"
"Recommend analysis steps for financial data"
```

**Returns:**
- Suggested analysis approaches
- Recommended visualizations
- Key insights to explore
- Potential data quality issues
- Next steps for deeper analysis

---

## ✅ **Data Validation**

### 21. **validate_data_consistency**
**Cross-validate data integrity across related files**

**Parameters:**
- `primaryFile` (string, required): Path to the primary data file to validate
- `referenceFiles` (array, required): Array of reference file paths for validation
- `validationRules` (array, optional): Rules to apply: `referential_integrity`, `data_completeness`, `value_ranges`
- `keyColumns` (array, optional): Specific columns to validate for referential integrity
- `autoDetectRelationships` (boolean, optional): Automatically detect column relationships (default: true)
- `tolerance` (number, optional): Tolerance for numeric validations (default: 0.01)
- `sheet` (string, optional): Sheet name for Excel files
- `reportFormat` (string, optional): Report format: `summary` or `detailed` (default: detailed)

**Usage Example:**
```
"Validate that all branch IDs in sales.xlsx exist in branches.xlsx"
"Check data consistency between employee.xlsx and department.xlsx"
"Find missing values and data quality issues across related files"
```

**Returns:**
- **Validation Summary:**
  - Total files processed
  - Total rows validated
  - Issues found (critical, warning, info)
  - Validation time

- **Issue Details:**
  - Issue type and severity
  - Specific location (file, row, column)
  - Clear error message
  - Actionable fix suggestions

- **Validation Rules:**
  - **Referential Integrity**: Check foreign key relationships
  - **Data Completeness**: Identify missing values and gaps
  - **Value Ranges**: Detect outliers and anomalies

**Special Features:**
- Multi-language support (Hebrew, RTL text)
- Automatic relationship detection
- Performance optimized for large datasets
- Detailed error reporting with fix suggestions

---

## 🚀 **Bulk Operations**

### 22. **bulk_aggregate_multi_files**
**Aggregate same column across multiple files in parallel**

**Parameters:**
- `filePaths` (array, required): Array of file paths to process
- `column` (string, required): Column name or index (0-based) to aggregate
- `operation` (string, required): One of: `sum`, `average`, `count`, `min`, `max`
- `consolidate` (boolean, optional): Return consolidated result or per-file breakdown (default: true)
- `sheet` (string, optional): Sheet name for Excel files
- `filters` (array, optional): Optional filters to apply before aggregation
  - Each filter: `column`, `condition`, `value`
  - Conditions: `equals`, `contains`, `greater_than`, `less_than`, `not_equals`

**Usage Example:**
```
"Sum total revenue across sales_2024.csv, sales_2025.csv, and sales_q1.csv"
"Calculate average productivity across all branch files"
"Get revenue breakdown by file for quarterly reports"
```

**Returns:**
- **Consolidated Mode**: Single aggregated result across all files
- **Per-File Mode**: Breakdown showing results for each file
- Processing performance metrics
- Error handling for individual file failures

**Performance:** **3x faster** than processing files sequentially

---

### 23. **bulk_filter_multi_files**
**Filter data across multiple files with optional export**

**Parameters:**
- `filePaths` (array, required): Array of file paths to process
- `filters` (array, required): Filters to apply to the data
  - Each filter: `column`, `condition`, `value`
  - Conditions: `equals`, `contains`, `greater_than`, `less_than`, `not_equals`
- `outputMode` (string, required): One of: `count`, `export`, `summary`
- `outputPath` (string, conditional): Output file path (required when outputMode is "export")
- `sheet` (string, optional): Sheet name for Excel files

**Usage Example:**
```
"Find all rows with 'Excellent' productivity across all branch files"
"Filter for sales > $1000 across quarterly reports and export to high_sales.xlsx"
"Count rows matching criteria across multiple files"
```

**Returns:**
- **Count Mode**: Number of matching rows per file
- **Export Mode**: Filtered data exported to new file
- **Summary Mode**: Overview of matches with sample data
- Processing performance metrics

**Performance:** Parallel processing with intelligent load balancing

---

## 🎯 **Usage Patterns & Best Practices**

### **Natural Language Integration**
All tools work seamlessly with natural language queries:

```
✅ Good: "Sum revenue across all Q1 files where region equals 'North'"
✅ Good: "Validate branch IDs between sales.xlsx and branches.xlsx"
✅ Good: "Create pivot table grouping by department, summing salaries"
```

### **Error Handling**
- Detailed error messages with suggestions
- Graceful handling of missing files or sheets
- Data type validation and conversion
- Performance warnings for large datasets

### **Multi-Language Support**
- Hebrew text handling (RTL)
- Unicode-safe string operations
- International date/number formats
- Multi-language error messages

### **Performance Optimization**
- Parallel processing for bulk operations
- Streaming for large files
- Intelligent caching
- Memory-efficient operations

---

## 📊 **Tool Summary Statistics**

| Category | Tools | Key Capabilities |
|----------|-------|-----------------|
| **Total Tools** | **23** | Complete Excel automation platform |
| **File Formats** | CSV, XLSX, XLS | Universal spreadsheet support |
| **AI Providers** | 5 | Anthropic, OpenAI, DeepSeek, Gemini, Local |
| **Excel Functions** | 200+ | Full formula engine compatibility |
| **Performance Boost** | 3x | Bulk operations vs sequential processing |
| **Validation Rules** | 3 types | Referential integrity, completeness, ranges |
| **Languages** | Multi | Hebrew, RTL, Unicode support |

---

**🚀 This comprehensive toolkit transforms Claude into a powerful data analyst capable of handling enterprise-scale Excel automation with AI-powered intelligence!**