import ExcelJS from 'exceljs';

const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile('test-remittance.xlsx');

workbook.eachSheet((worksheet) => {
  console.log('\nSheet:', worksheet.name);
  let headers = [];
  let rowCount = 0;
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      row.eachCell((cell) => {
        headers.push(cell.value?.toString().toLowerCase().trim() || '');
      });
      console.log('Headers:', headers);
    } else if (rowNumber === 2) {
      const rowData = {};
      row.eachCell((cell, colNumber) => {
        rowData[headers[colNumber - 1]] = cell.value;
      });
      console.log('First data row:', rowData);
    }
  });
});
