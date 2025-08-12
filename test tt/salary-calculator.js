// Global variables
let payTiers = [
    { threshold: 0, rate: 15 },
    { threshold: 300, rate: 17 },
    { threshold: 600, rate: 19 },
    { threshold: 900, rate: 21 }
];

let uploadedData = [];
let processedData = [];
let rawExcelData = [];
let columnMappings = {
    date: 0,    // Column A: Date
    sales: 2,   // Column C: Sales - Total
    refund: 4,  // Column E: Refunds - Total
    hours: 9    // Column J: Hours - Worked
};

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    renderTiers();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // File upload handling
    document.getElementById('fileInput').addEventListener('change', handleFileUpload);
}

// Convert Excel serial date to readable date
function excelDateToJSDate(excelDate) {
    if (!excelDate || isNaN(excelDate)) return '';
    
    // Only convert if it looks like an Excel date (between 1 and 100000)
    if (excelDate < 1 || excelDate > 100000) return '';
    
    console.log('Converting Excel date:', excelDate);
    
    // Excel dates are number of days since 1900-01-01
    // But Excel incorrectly treats 1900 as a leap year
    // So we need to adjust for this bug
    let days = excelDate;
    
    // If the date is >= 60, it's after the leap year bug
    if (days >= 60) {
        days = days - 1;
    }
    
    // Create date from 1900-01-01 + days
    const excelEpoch = new Date(1900, 0, 1);
    const jsDate = new Date(excelEpoch.getTime() + (days - 1) * 24 * 60 * 60 * 1000);
    
    // Check if the resulting date is reasonable (between 1900 and 2100)
    const year = jsDate.getFullYear();
    if (year < 1900 || year > 2100) {
        console.log('Invalid date range, returning original value');
        return '';
    }
    
    // Additional validation: check if the date makes sense
    const month = jsDate.getMonth();
    const day = jsDate.getDate();
    if (month < 0 || month > 11 || day < 1 || day > 31) {
        console.log('Invalid date components, returning original value');
        return '';
    }
    
    // Format as MM/DD/YYYY
    const result = jsDate.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
    });
    
    console.log('Converted to:', result);
    return result;
}

// Clean Excel data and extract proper headers
function cleanExcelData(jsonData) {
    console.log('Cleaning Excel data...');
    console.log('Original data:', jsonData);
    
    // Find the header row (first non-empty row)
    let headerRowIndex = 0;
    for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (row && row.some(cell => cell !== null && cell !== undefined && cell !== '')) {
            headerRowIndex = i;
            break;
        }
    }
    
    console.log('Header row index:', headerRowIndex);
    
    // Extract headers from the header row
    const headerRow = jsonData[headerRowIndex];
    const headers = headerRow.map((header, index) => {
        if (!header || header === '') {
            return `Column ${String.fromCharCode(65 + index)}`;
        }
        return header.toString().trim();
    });
    
    console.log('Extracted headers:', headers);
    
    // Get data rows (everything after the header row)
    const dataRows = jsonData.slice(headerRowIndex + 1).filter(row => 
        row && row.some(cell => cell !== null && cell !== undefined && cell !== '')
    );
    
    console.log('Data rows count:', dataRows.length);
    
    // Combine headers with data rows
    const cleanedData = [headers, ...dataRows];
    
    return cleanedData;
}

// Set the correct headers based on your table structure
function setCorrectHeadersFromTable() {
    if (rawExcelData.length > 0) {
        const correctHeaders = [
            'Date',           // Column A
            'Salary',         // Column B
            'Sales - Total',  // Column C
            'Sales - Comm.',  // Column D
            'Refunds - Total', // Column E
            'Refunds - Sales Comm.', // Column F
            'Products - Comm.', // Column G
            'Spare',          // Column H
            'Tips',           // Column I
            'Hours - Worked', // Column J
            'Hours - Salary', // Column K
            'Avg Sales/Hour', // Column L
            'Deductions',     // Column M
            'Reimburs.',      // Column N
            'Profit'          // Column O
        ];
        
        // Replace the headers in rawExcelData
        rawExcelData[0] = correctHeaders;
        
        // Convert dates in the data before displaying
        const dataRows = rawExcelData.slice(1);
        const processedRows = dataRows.map(row => {
            return row.map((cell, cellIndex) => {
                // Always convert dates in the first column (Date column)
                if (cellIndex === 0) {
                    const cellNumber = parseFloat(cell);
                    if (!isNaN(cellNumber) && cellNumber > 1000 && cellNumber < 100000) {
                        const convertedDate = excelDateToJSDate(cellNumber);
                        if (convertedDate && convertedDate !== '') {
                            console.log(`Converting date in setCorrectHeadersFromTable: ${cell} → ${convertedDate}`);
                            return convertedDate;
                        }
                    }
                }
                return cell;
            });
        });
        
        // Update raw data with converted dates
        rawExcelData = [correctHeaders, ...processedRows];
        
        // Refresh the display with proper column names
        showRawDataTable(rawExcelData);
        populateColumnDropdowns(correctHeaders);
        setDefaultColumnSelections(correctHeaders);
        
        console.log('Set correct headers from table:', correctHeaders);
        showMessage('Column names set correctly from table!', 'success');
    }
}

// File upload handling
function handleFileUpload(e) {
    const file = e.target.files[0];
    if (file) {
        console.log('File selected:', file.name, 'Size:', file.size, 'Type:', file.type);
        
        // Show file info
        document.getElementById('fileName').textContent = file.name;
        document.getElementById('fileInfo').classList.add('show');
        
        // Show loading
        document.getElementById('loading').style.display = 'block';
        document.getElementById('dataPreview').style.display = 'none';
        document.getElementById('columnSelection').style.display = 'none';

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                console.log('File read successfully, processing...');
                const data = new Uint8Array(e.target.result);
                console.log('Data length:', data.length);
                
                const workbook = XLSX.read(data, { type: 'array' });
                console.log('Workbook sheets:', workbook.SheetNames);
                
                // Get first sheet
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                console.log('Processing sheet:', firstSheetName);
                
                // Convert to JSON with proper header handling
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                console.log('JSON data length:', jsonData.length);
                console.log('First few rows:', jsonData.slice(0, 3));
                
                if (jsonData.length === 0) {
                    showMessage('File is empty or has no data.', 'error');
                    document.getElementById('loading').style.display = 'none';
                    return;
                }

                // Clean up the data - remove empty rows and normalize headers
                const cleanedData = cleanExcelData(jsonData);
                console.log('Cleaned data:', cleanedData);
                
                // Store raw data
                rawExcelData = cleanedData;
                
                // Show data preview with column selection
                showDataPreviewWithColumns(jsonData);
                
                // Hide loading
                document.getElementById('loading').style.display = 'none';
                
            } catch (error) {
                console.error('Error reading file:', error);
                showMessage('Error reading file: ' + error.message + '. Please make sure it\'s a valid XLS/XLSX file.', 'error');
                document.getElementById('loading').style.display = 'none';
            }
        };
        
        reader.onerror = function() {
            console.error('FileReader error');
            showMessage('Error reading file. Please try again.', 'error');
            document.getElementById('loading').style.display = 'none';
        };
        
        reader.readAsArrayBuffer(file);
    } else {
        console.log('No file selected');
    }
}

// Show data preview with column selection
function showDataPreviewWithColumns(jsonData) {
    const headers = jsonData[0];
    const dataRows = jsonData.slice(1);
    
    console.log('Headers found:', headers);
    console.log('Number of data rows:', dataRows.length);
    
    // Convert dates in the data before showing
    const processedData = convertDatesInData(jsonData);
    
    // Show raw data table with converted dates
    showRawDataTable(processedData);
    
    // Automatically set correct headers from table structure
    setCorrectHeadersFromTable();
    
    // Show column selection section
    document.getElementById('columnSelection').style.display = 'block';
    document.getElementById('dataPreview').style.display = 'block';
}

// Convert dates in the data
function convertDatesInData(jsonData) {
    const headers = jsonData[0];
    const dataRows = jsonData.slice(1);
    
    const processedRows = dataRows.map(row => {
        return row.map((cell, cellIndex) => {
            // Always convert dates in the first column (Date column)
            if (cellIndex === 0) {
                const cellNumber = parseFloat(cell);
                if (!isNaN(cellNumber) && cellNumber > 1000 && cellNumber < 100000) {
                    const convertedDate = excelDateToJSDate(cellNumber);
                    if (convertedDate && convertedDate !== '') {
                        console.log(`Auto-converting date: ${cell} → ${convertedDate}`);
                        return convertedDate;
                    }
                }
            }
            return cell;
        });
    });
    
    return [headers, ...processedRows];
}

// Show raw data table
function showRawDataTable(jsonData) {
    const previewDiv = document.getElementById('previewTable');
    let html = '<table class="data-table"><thead><tr>';
    
    // Add row selection column
    html += '<th style="width: 50px;">Row</th>';
    
    // Headers with column letters
    const headers = jsonData[0];
    headers.forEach((header, index) => {
        const columnLetter = String.fromCharCode(65 + index); // A, B, C, etc.
        const headerText = header || 'Empty';
        html += `<th>${columnLetter}<br><small>${headerText}</small></th>`;
    });
    html += '</tr></thead><tbody>';
    
    // Data rows with checkboxes
    jsonData.slice(1).forEach((row, rowIndex) => {
        html += `<tr>
            <td><input type="checkbox" id="row${rowIndex + 2}" checked></td>`;
        
        row.forEach((cell, cellIndex) => {
            let displayValue = cell;
            
            // Always convert dates in the first column (Date column)
            if (cellIndex === 0) {
                const cellNumber = parseFloat(cell);
                if (!isNaN(cellNumber) && cellNumber > 1000 && cellNumber < 100000) {
                    // This could be an Excel date, try to convert it
                    const convertedDate = excelDateToJSDate(cellNumber);
                    if (convertedDate && convertedDate !== '') {
                        displayValue = convertedDate;
                        console.log(`Excel Sheet View - Converted date cell ${cellIndex}: ${cell} → ${convertedDate}`);
                    } else {
                        console.log(`Excel Sheet View - Failed to convert date: ${cell} in column ${cellIndex}`);
                    }
                }
            }
            
            // Escape any quotes in the value to prevent HTML issues
            const safeValue = (displayValue || '').toString().replace(/"/g, '&quot;');
            
            html += `<td><input type="text" value="${safeValue}" 
                onchange="updateCellValue(${rowIndex + 2}, ${cellIndex}, this.value)"
                onkeydown="if(event.key==='Enter')this.blur();if(event.key==='Escape')this.value=this.defaultValue"></td>`;
        });
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    previewDiv.innerHTML = html;
}

// Populate column dropdowns
function populateColumnDropdowns(headers) {
    const dateSelect = document.getElementById('dateColumn');
    const salesSelect = document.getElementById('salesColumn');
    const refundSelect = document.getElementById('refundColumn');
    const hoursSelect = document.getElementById('hoursColumn');
    
    // Clear existing options
    dateSelect.innerHTML = '<option value="">Select Date Column</option>';
    salesSelect.innerHTML = '<option value="">Select Sales Column</option>';
    refundSelect.innerHTML = '<option value="">Select Refund Column</option>';
    hoursSelect.innerHTML = '<option value="">Select Hours Column</option>';
    
    // Add options for each column
    headers.forEach((header, index) => {
        const columnLetter = String.fromCharCode(65 + index);
        const headerText = header || `Column ${columnLetter}`;
        const optionText = `Column ${columnLetter}: ${headerText}`;
        const option = `<option value="${index}">${optionText}</option>`;
        
        dateSelect.innerHTML += option;
        salesSelect.innerHTML += option;
        refundSelect.innerHTML += option;
        hoursSelect.innerHTML += option;
    });
    
    console.log('Populated dropdowns with headers:', headers);
}

// Set default column selections based on the image
function setDefaultColumnSelections(headers) {
    console.log('Setting default column selections based on headers:', headers);
    
    // Find columns by header names (case-insensitive)
    const dateIndex = findColumnByHeader(headers, ['date', 'Date', 'DATE']);
    const salesIndex = findColumnByHeader(headers, ['sales - total', 'sales total', 'sales', 'Sales', 'SALES', 'amount', 'Amount', 'AMOUNT']);
    const refundIndex = findColumnByHeader(headers, ['refunds - total', 'refunds total', 'refund', 'Refund', 'REFUND', 'returns', 'Returns', 'RETURNS']);
    const hoursIndex = findColumnByHeader(headers, ['hours - worked', 'hours worked', 'hours', 'Hours', 'HOURS', 'time', 'Time', 'TIME']);
    
    console.log('Found columns - Date:', dateIndex, 'Sales:', salesIndex, 'Refund:', refundIndex, 'Hours:', hoursIndex);
    
    // Set default selections based on your table structure
    // Column A: Date
    document.getElementById('dateColumn').value = 0;
    columnMappings.date = 0;
    console.log('Set date column to index: 0 (Column A)');
    
    // Column C: Sales - Total
    document.getElementById('salesColumn').value = 2;
    columnMappings.sales = 2;
    console.log('Set sales column to index: 2 (Column C)');
    
    // Column E: Refunds - Total
    document.getElementById('refundColumn').value = 4;
    columnMappings.refund = 4;
    console.log('Set refund column to index: 4 (Column E)');
    
    // Column J: Hours - Worked
    document.getElementById('hoursColumn').value = 9;
    columnMappings.hours = 9;
    console.log('Set hours column to index: 9 (Column J)');
}

// Find column by header name
function findColumnByHeader(headers, possibleNames) {
    console.log('Looking for columns:', possibleNames, 'in headers:', headers);
    
    for (let name of possibleNames) {
        const index = headers.findIndex(header => {
            if (!header) return false;
            const headerStr = header.toString().toLowerCase().trim();
            const searchStr = name.toLowerCase().trim();
            const match = headerStr.includes(searchStr) || searchStr.includes(headerStr);
            console.log(`Checking "${headerStr}" against "${searchStr}": ${match}`);
            return match;
        });
        if (index !== -1) {
            console.log('Found column:', name, 'at index:', index);
            return index;
        }
    }
    console.log('No column found for:', possibleNames);
    return -1;
}

// Find column by content analysis
function findColumnByContent(headers, dataRows, type) {
    for (let i = 0; i < headers.length; i++) {
        const columnData = dataRows.map(row => row[i]).filter(val => val !== undefined && val !== '');
        
        if (type === 'date') {
            // Look for Excel serial dates (numbers > 1000)
            if (columnData.some(val => !isNaN(val) && val > 1000)) {
                return i;
            }
        } else if (type === 'sales') {
            // Look for monetary values
            if (columnData.some(val => !isNaN(val) && val > 0)) {
                return i;
            }
        } else if (type === 'refund') {
            // Look for refund-like columns
            const headerLower = (headers[i] || '').toLowerCase();
            if (headerLower.includes('refund') || headerLower.includes('return')) {
                return i;
            }
        } else if (type === 'hours') {
            // Look for time-related columns
            const headerLower = (headers[i] || '').toLowerCase();
            if (headerLower.includes('hour') || headerLower.includes('time')) {
                return i;
            }
        }
    }
    return -1;
}

// Update cell value in raw data
function updateCellValue(rowIndex, cellIndex, value) {
    if (rawExcelData[rowIndex]) {
        rawExcelData[rowIndex][cellIndex] = value;
    }
}

// Process with selected columns
function processWithSelectedColumns() {
    // Get selected columns
    const dateCol = parseInt(document.getElementById('dateColumn').value);
    const salesCol = parseInt(document.getElementById('salesColumn').value);
    const refundCol = parseInt(document.getElementById('refundColumn').value);
    const hoursCol = parseInt(document.getElementById('hoursColumn').value);
    
    if (dateCol === '' || salesCol === '') {
        showMessage('Please select Date and Sales columns.', 'error');
        return;
    }
    
    // Update column mappings
    columnMappings.date = dateCol;
    columnMappings.sales = salesCol;
    columnMappings.refund = refundCol !== '' ? refundCol : -1;
    columnMappings.hours = hoursCol !== '' ? hoursCol : -1;
    
    // Get selected rows
    const selectedRows = [];
    const dataRows = rawExcelData.slice(1);
    
    dataRows.forEach((row, index) => {
        const checkbox = document.getElementById(`row${index + 2}`);
        if (checkbox && checkbox.checked) {
            selectedRows.push({ row, index: index + 1 });
        }
    });
    
    if (selectedRows.length === 0) {
        showMessage('Please select at least one row to process.', 'error');
        return;
    }
    
    // Process selected data
    processSelectedData(selectedRows);
}

// Process selected data
function processSelectedData(selectedRows) {
    uploadedData = selectedRows.map(({ row, index }) => {
        const dateValue = row[columnMappings.date];
        const salesValue = parseFloat(row[columnMappings.sales]) || 0;
        const refundValue = columnMappings.refund !== -1 ? (parseFloat(row[columnMappings.refund]) || 0) : 0;
        const hoursValue = columnMappings.hours !== -1 ? (parseFloat(row[columnMappings.hours]) || 0) : 0;
        
        // Convert Excel date to readable format
        const date = excelDateToJSDate(dateValue) || `Day ${index}`;
        const realSales = salesValue - refundValue;
        
        return {
            date: date,
            sales: salesValue,
            refund: refundValue,
            realSales: realSales,
            hours: hoursValue
        };
    });
    
    // Calculate salaries
    processedData = uploadedData.map(row => ({
        ...row,
        rate: getRateForSales(row.realSales),
        salary: row.hours * getRateForSales(row.realSales)
    }));
    
    // Show results with summary
    renderResultsWithSummary();
    showMessage(`Processed ${processedData.length} entries successfully!`, 'success');
}

// Render results with summary
function renderResultsWithSummary() {
    renderResults();
    renderSummary();
}

// Render summary
function renderSummary() {
    const summarySection = document.getElementById('summarySection');
    const summaryGrid = document.getElementById('summaryGrid');
    
    if (processedData.length === 0) {
        summarySection.style.display = 'none';
        return;
    }
    
    // Calculate summary statistics
    const totalSalary = processedData.reduce((sum, row) => sum + row.salary, 0);
    const totalSales = processedData.reduce((sum, row) => sum + row.sales, 0);
    const totalRefunds = processedData.reduce((sum, row) => sum + row.refund, 0);
    const totalHours = processedData.reduce((sum, row) => sum + row.hours, 0);
    const avgRate = processedData.reduce((sum, row) => sum + row.rate, 0) / processedData.length;
    const avgSalesPerDay = totalSales / processedData.length;
    
    // Create summary cards
    summaryGrid.innerHTML = `
        <div class="summary-card">
            <h4>Total Days</h4>
            <div class="value">${processedData.length}</div>
        </div>
        <div class="summary-card">
            <h4>Total Salary</h4>
            <div class="value">$${totalSalary.toFixed(2)}</div>
        </div>
        <div class="summary-card">
            <h4>Total Sales</h4>
            <div class="value">$${totalSales.toFixed(2)}</div>
        </div>
        <div class="summary-card">
            <h4>Total Refunds</h4>
            <div class="value">$${totalRefunds.toFixed(2)}</div>
        </div>
        <div class="summary-card">
            <h4>Total Hours</h4>
            <div class="value">${totalHours.toFixed(1)} hrs</div>
        </div>
        <div class="summary-card">
            <h4>Avg Rate/Hour</h4>
            <div class="value">$${avgRate.toFixed(2)}</div>
        </div>
        <div class="summary-card">
            <h4>Avg Sales/Day</h4>
            <div class="value">$${avgSalesPerDay.toFixed(2)}</div>
        </div>
    `;
    
    summarySection.style.display = 'block';
}

// Show raw data again
function showRawDataAgain() {
    if (rawExcelData.length > 0) {
        console.log('Refreshing Excel Sheet View with date conversion...');
        // Ensure dates are converted before showing
        const processedData = convertDatesInData(rawExcelData);
        showRawDataTable(processedData);
        document.getElementById('columnSelection').style.display = 'block';
        showMessage('Excel Sheet View refreshed with date conversion!', 'success');
    }
}

// Force refresh data preview with date conversion
function refreshDataPreview() {
    if (rawExcelData.length > 0) {
        console.log('Force refreshing Excel Sheet View with date conversion...');
        // Ensure dates are converted before showing
        const processedData = convertDatesInData(rawExcelData);
        showRawDataTable(processedData);
        showMessage('Excel Sheet View refreshed with date conversion!', 'success');
    }
}

// Force convert all dates in the data
function forceConvertDates() {
    if (rawExcelData.length > 0) {
        console.log('Force converting all dates in Excel Sheet View...');
        const headers = rawExcelData[0];
        const dataRows = rawExcelData.slice(1);
        
        // Process each row and convert dates
        const processedRows = dataRows.map(row => {
            return row.map((cell, cellIndex) => {
                // Always convert dates in the first column (Date column)
                if (cellIndex === 0) {
                    const cellNumber = parseFloat(cell);
                    if (!isNaN(cellNumber) && cellNumber > 1000 && cellNumber < 100000) {
                        const convertedDate = excelDateToJSDate(cellNumber);
                        if (convertedDate && convertedDate !== '') {
                            console.log(`Force converting ${cell} to ${convertedDate} in column ${cellIndex}`);
                            return convertedDate;
                        } else {
                            console.log(`Failed to convert date: ${cell} in column ${cellIndex}`);
                        }
                    }
                }
                return cell;
            });
        });
        
        // Update the raw data with converted dates
        rawExcelData = [headers, ...processedRows];
        
        // Refresh the display
        showRawDataTable(rawExcelData);
        showMessage('Excel Sheet View dates converted successfully!', 'success');
    }
}

// Immediate date conversion and display
function convertAndDisplayDates() {
    if (rawExcelData.length > 0) {
        console.log('Immediately converting and displaying dates...');
        
        // Test the specific dates from your image
        const testDates = [45859, 45860, 45861, 45864];
        testDates.forEach(date => {
            const converted = excelDateToJSDate(date);
            console.log(`Test conversion: ${date} → ${converted}`);
        });
        
        // Convert dates in the actual data
        const headers = rawExcelData[0];
        const dataRows = rawExcelData.slice(1);
        
        const processedRows = dataRows.map(row => {
            return row.map((cell, cellIndex) => {
                if (cellIndex === 0) {
                    const cellNumber = parseFloat(cell);
                    if (!isNaN(cellNumber) && cellNumber > 1000 && cellNumber < 100000) {
                        const convertedDate = excelDateToJSDate(cellNumber);
                        if (convertedDate && convertedDate !== '') {
                            console.log(`Converting ${cell} to ${convertedDate}`);
                            return convertedDate;
                        } else {
                            console.log(`FAILED: Could not convert ${cell}`);
                        }
                    }
                }
                return cell;
            });
        });
        
        // Update raw data
        rawExcelData = [headers, ...processedRows];
        
        // Show the updated table
        showRawDataTable(rawExcelData);
        showMessage('Dates converted and displayed!', 'success');
    }
}

// Test file upload
function testFileUpload() {
    const fileInput = document.getElementById('fileInput');
    if (fileInput.files.length > 0) {
        console.log('Testing file upload...');
        const file = fileInput.files[0];
        console.log('File details:', {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified
        });
        
        // Trigger the file processing
        const event = new Event('change');
        fileInput.dispatchEvent(event);
    } else {
        showMessage('No file selected. Please select a file first.', 'error');
    }
}

// Test date conversion function
function testDateConversion() {
    console.log('Testing date conversion...');
    const testDates = [45859, 45860, 45861, 45864];
    testDates.forEach(date => {
        console.log(`Excel date ${date} converts to: ${excelDateToJSDate(date)}`);
    });
    
    // Also test with the actual data if available
    if (rawExcelData.length > 0) {
        console.log('Testing with actual data...');
        const headers = rawExcelData[0];
        const dataRows = rawExcelData.slice(1);
        
        dataRows.forEach((row, rowIndex) => {
            row.forEach((cell, cellIndex) => {
                const cellNumber = parseFloat(cell);
                if (!isNaN(cellNumber) && cellNumber > 1000 && cellNumber < 100000) {
                    const converted = excelDateToJSDate(cellNumber);
                    if (converted) {
                        console.log(`Row ${rowIndex + 2}, Column ${cellIndex}: ${cell} → ${converted}`);
                    } else {
                        console.log(`Row ${rowIndex + 2}, Column ${cellIndex}: ${cell} → FAILED TO CONVERT`);
                    }
                }
            });
        });
    }
}

// Debug column headers
function debugHeaders() {
    if (rawExcelData.length > 0) {
        const headers = rawExcelData[0];
        console.log('All headers found:');
        headers.forEach((header, index) => {
            const columnLetter = String.fromCharCode(65 + index);
            console.log(`Column ${columnLetter}: "${header}"`);
        });
    } else {
        console.log('No data loaded yet');
    }
}

// Set correct headers based on the image
function setCorrectHeaders() {
    if (rawExcelData.length > 0) {
        const correctHeaders = [
            'Date',           // Column A
            'Salary',         // Column B
            'Sales - Total',  // Column C
            'Sales - Comm.',  // Column D
            'Refunds - Total', // Column E
            'Refunds - Sales Comm.', // Column F
            'Products - Comm.', // Column G
            'Spare',          // Column H
            'Tips',           // Column I
            'Hours - Worked', // Column J
            'Hours - Salary', // Column K
            'Avg Sales/Hour', // Column L
            'Deductions',     // Column M
            'Reimburs.',      // Column N
            'Profit'          // Column O
        ];
        
        // Replace the headers in rawExcelData
        rawExcelData[0] = correctHeaders;
        
        // Convert dates in the data before displaying
        const dataRows = rawExcelData.slice(1);
        const processedRows = dataRows.map(row => {
            return row.map((cell, cellIndex) => {
                // Always convert dates in the first column (Date column)
                if (cellIndex === 0) {
                    const cellNumber = parseFloat(cell);
                    if (!isNaN(cellNumber) && cellNumber > 1000 && cellNumber < 100000) {
                        const convertedDate = excelDateToJSDate(cellNumber);
                        if (convertedDate && convertedDate !== '') {
                            console.log(`Converting date in setCorrectHeaders: ${cell} → ${convertedDate}`);
                            return convertedDate;
                        }
                    }
                }
                return cell;
            });
        });
        
        // Update raw data with converted dates
        rawExcelData = [correctHeaders, ...processedRows];
        
        // Refresh the display with proper date conversion
        showRawDataTable(rawExcelData);
        populateColumnDropdowns(correctHeaders);
        setDefaultColumnSelections(correctHeaders);
        
        console.log('Set correct headers and converted dates:', correctHeaders);
        showMessage('Headers corrected and dates converted!', 'success');
    }
}

// Render results table
function renderResults() {
    const tbody = document.getElementById('daysTableBody');
    tbody.innerHTML = '';

    processedData.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.date}</td>
            <td>$${row.sales.toFixed(2)}</td>
            <td>$${row.refund.toFixed(2)}</td>
            <td>$${row.realSales.toFixed(2)}</td>
            <td><input type="number" step="0.5" value="${row.hours}" onchange="updateHours(this, ${processedData.indexOf(row)})"></td>
            <td class="rate-cell">$${row.rate.toFixed(2)}</td>
            <td class="salary-cell">$${row.salary.toFixed(2)}</td>
        `;
        tbody.appendChild(tr);
    });

    updateTotal();
}

// Update hours for a specific row
function updateHours(input, index) {
    const hours = parseFloat(input.value) || 0;
    processedData[index].hours = hours;
    processedData[index].salary = hours * processedData[index].rate;
    
    // Update salary display
    const row = input.closest('tr');
    row.querySelector('.salary-cell').textContent = `$${processedData[index].salary.toFixed(2)}`;
    
    updateTotal();
    renderSummary();
}

// Render commission tiers
function renderTiers() {
    const container = document.getElementById('tiersContainer');
    container.innerHTML = '';
    
    payTiers.forEach((tier, index) => {
        const tierDiv = document.createElement('div');
        tierDiv.className = 'tier-input';
        tierDiv.innerHTML = `
            <label>Sales Threshold ($)</label>
            <input type="number" value="${tier.threshold}" onchange="updateTier(${index}, 'threshold', this.value)">
            <label>Hourly Rate ($)</label>
            <input type="number" step="0.01" value="${tier.rate}" onchange="updateTier(${index}, 'rate', this.value)">
            <button class="btn btn-secondary" onclick="removeTier(${index})" style="margin-top: 10px; padding: 5px 10px; font-size: 0.8rem;">Remove</button>
        `;
        container.appendChild(tierDiv);
    });
}

// Update tier values
function updateTier(index, field, value) {
    payTiers[index][field] = parseFloat(value);
    sortTiers();
    renderTiers();
    recalculateAll();
}

// Add new tier
function addTier() {
    const maxThreshold = Math.max(...payTiers.map(t => t.threshold));
    payTiers.push({ threshold: maxThreshold + 100, rate: payTiers[payTiers.length - 1].rate + 2 });
    sortTiers();
    renderTiers();
}

// Remove tier
function removeTier(index) {
    if (payTiers.length > 1) {
        payTiers.splice(index, 1);
        renderTiers();
        recalculateAll();
    }
}

// Sort tiers by threshold
function sortTiers() {
    payTiers.sort((a, b) => a.threshold - b.threshold);
}

// Get rate for sales amount
function getRateForSales(sales) {
    let rate = payTiers[0].rate;
    for (let i = payTiers.length - 1; i >= 0; i--) {
        if (sales >= payTiers[i].threshold) {
            rate = payTiers[i].rate;
            break;
        }
    }
    return rate;
}

// Recalculate all data
function recalculateAll() {
    if (processedData.length === 0) return;
    
    processedData.forEach((row, index) => {
        row.rate = getRateForSales(row.realSales);
        row.salary = row.hours * row.rate;
    });
    
    renderResults();
    renderSummary();
}

// Update total row
function updateTotal() {
    const rows = document.querySelectorAll('#daysTableBody tr');
    let totalSalary = 0;
    let totalHours = 0;

    rows.forEach(row => {
        const salaryText = row.querySelector('.salary-cell').textContent;
        const salary = parseFloat(salaryText.replace('$', '')) || 0;
        totalSalary += salary;
        
        const hoursInput = row.querySelector('input[type="number"]');
        if (hoursInput) {
            totalHours += parseFloat(hoursInput.value) || 0;
        }
    });

    // Remove existing total row
    const existingTotal = document.querySelector('.total-row');
    if (existingTotal) {
        existingTotal.remove();
    }

    // Add new total row
    const tbody = document.getElementById('daysTableBody');
    const totalRow = document.createElement('tr');
    totalRow.className = 'total-row';
    totalRow.innerHTML = `
        <td><strong>Total</strong></td>
        <td></td>
        <td></td>
        <td></td>
        <td><strong>${totalHours.toFixed(1)} hrs</strong></td>
        <td></td>
        <td><strong>$${totalSalary.toFixed(2)}</strong></td>
    `;
    tbody.appendChild(totalRow);
}

// Load default tiers
function loadDefaultTiers() {
    payTiers = [
        { threshold: 0, rate: 15 },
        { threshold: 300, rate: 17 },
        { threshold: 600, rate: 19 },
        { threshold: 900, rate: 21 }
    ];
    renderTiers();
    recalculateAll();
    showMessage('Default tiers loaded successfully!', 'success');
}

// Export tiers to JSON
function exportTiers() {
    const dataStr = JSON.stringify(payTiers, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'commission-tiers.json';
    link.click();
    URL.revokeObjectURL(url);
}

// Import tiers from JSON
function importTiers() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function(e) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importedTiers = JSON.parse(e.target.result);
                if (Array.isArray(importedTiers) && importedTiers.length > 0) {
                    payTiers = importedTiers;
                    sortTiers();
                    renderTiers();
                    recalculateAll();
                    showMessage('Tiers imported successfully!', 'success');
                } else {
                    showMessage('Invalid file format. Please select a valid JSON file.', 'error');
                }
            } catch (error) {
                showMessage('Error reading file. Please check the format.', 'error');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// Export results to CSV
function exportToCSV() {
    if (processedData.length === 0) {
        showMessage('No data to export. Please process data first.', 'error');
        return;
    }

    let csv = 'Date,Sales,Refund,Real Sales,Hours,Rate,Salary\n';
    
    processedData.forEach(row => {
        csv += `${row.date},${row.sales},${row.refund},${row.realSales},${row.hours},${row.rate},${row.salary}\n`;
    });

    const dataBlob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'salary-report.csv';
    link.click();
    URL.revokeObjectURL(url);
}

// Clear file
function clearFile() {
    document.getElementById('fileInput').value = '';
    document.getElementById('fileInfo').classList.remove('show');
    document.getElementById('dataPreview').style.display = 'none';
    document.getElementById('columnSelection').style.display = 'none';
    document.getElementById('summarySection').style.display = 'none';
    uploadedData = [];
    processedData = [];
    rawExcelData = [];
    document.getElementById('daysTableBody').innerHTML = '';
    showMessage('File cleared successfully!', 'success');
}

// Clear results
function clearResults() {
    processedData = [];
    document.getElementById('daysTableBody').innerHTML = '';
    document.getElementById('summarySection').style.display = 'none';
    showMessage('Results cleared successfully!', 'success');
}

// Show message
function showMessage(message, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.innerHTML = `<div class="${type}">${message}</div>`;
    setTimeout(() => {
        messageDiv.innerHTML = '';
    }, 5000);
} 