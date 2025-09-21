const XLSX = require('xlsx');
const path = require('path');

// Create sample Excel file with multiple sheets
function createSampleExcel() {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Financial Data
  const financialData = [
    ['Account', 'Q1', 'Q2', 'Q3', 'Q4', 'Total'],
    ['Revenue', 100000, 120000, 130000, 140000, 490000],
    ['Cost of Goods Sold', 60000, 72000, 78000, 84000, 294000],
    ['Gross Profit', 40000, 48000, 52000, 56000, 196000],
    ['Operating Expenses', 25000, 28000, 30000, 32000, 115000],
    ['Net Income', 15000, 20000, 22000, 24000, 81000]
  ];

  const financialSheet = XLSX.utils.aoa_to_sheet(financialData);
  XLSX.utils.book_append_sheet(workbook, financialSheet, 'Financial');

  // Sheet 2: Product Inventory
  const inventoryData = [
    ['Product_ID', 'Product_Name', 'Category', 'Stock_Quantity', 'Unit_Price', 'Supplier'],
    ['P001', 'Widget A', 'Electronics', 150, 25.99, 'TechCorp'],
    ['P002', 'Widget B', 'Electronics', 75, 45.50, 'TechCorp'],
    ['P003', 'Gadget X', 'Home', 200, 15.75, 'HomePlus'],
    ['P004', 'Tool Z', 'Tools', 300, 8.99, 'ToolMaster'],
    ['P005', 'Device Y', 'Electronics', 50, 199.99, 'TechCorp']
  ];

  const inventorySheet = XLSX.utils.aoa_to_sheet(inventoryData);
  XLSX.utils.book_append_sheet(workbook, inventorySheet, 'Inventory');

  // Sheet 3: Sales Summary
  const salesData = [
    ['Month', 'Total_Sales', 'Units_Sold', 'Average_Order_Value'],
    ['January', 2500.89, 45, 55.57],
    ['February', 3200.45, 58, 55.18],
    ['March', 2890.12, 52, 55.58],
    ['April', 3850.67, 71, 54.24],
    ['May', 4120.33, 76, 54.21]
  ];

  const salesSheet = XLSX.utils.aoa_to_sheet(salesData);
  XLSX.utils.book_append_sheet(workbook, salesSheet, 'Sales_Summary');

  // Save the file
  const filePath = path.join(__dirname, '..', 'data', 'excel', 'sample_workbook.xlsx');
  XLSX.writeFile(workbook, filePath);
  console.log('Sample Excel file created:', filePath);
}

// Create the directory if it doesn't exist
const fs = require('fs');
const excelDir = path.join(__dirname, '..', 'data', 'excel');
if (!fs.existsSync(excelDir)) {
  fs.mkdirSync(excelDir, { recursive: true });
}

createSampleExcel();