import ExcelJS from 'exceljs';

const workbook = new ExcelJS.Workbook();

// Create sheets for 3 months
const months = ['JANUARY', 'FEBRUARY', 'MARCH'];

for (const month of months) {
  const sheet = workbook.addWorksheet(month);
  
  // Headers
  sheet.addRow(['Parish Name', 'First Collection', 'Second Collection', 'Tithe', 'Harvest', 'Special Offering', 'Donations', 'Other Income']);
  
  // Parish data
  sheet.addRow(['St. Peter\'s Parish', 120000, 80000, 150000, 0, 50000, 0, 0]);
  sheet.addRow(['St. Paul\'s Parish', 95000, 60000, 120000, 0, 0, 30000, 0]);
  sheet.addRow(['Holy Trinity Parish', 110000, 75000, 140000, 200000, 0, 0, 0]);
  sheet.addRow(['Our Lady of Fatima', 85000, 55000, 100000, 0, 0, 0, 20000]);
  sheet.addRow(['St. Patrick\'s Parish', 90000, 65000, 110000, 0, 40000, 0, 0]);
}

await workbook.xlsx.writeFile('test-remittance.xlsx');
console.log('✓ test-remittance.xlsx created');
