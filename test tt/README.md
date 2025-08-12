# 💰 Salary Calculator Server

A Flask-based web application that processes Excel files and calculates daily salaries based on commission tiers.

## 🚀 Features

- **Smart Column Detection**: Automatically detects Date, Sales, Refund, and Hours columns
- **Server-Side Processing**: Reliable file handling with Python backend
- **Commission Tiers**: Customizable sales-based hourly rates
- **Real-time Calculations**: Instant salary calculations
- **CSV Export**: Download results as CSV files
- **Responsive Design**: Works on desktop and mobile devices

## 📋 Requirements

- Python 3.7+
- pip (Python package installer)

## 🛠️ Installation

1. **Clone or download the project files**

2. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the server:**
   ```bash
   python server.py
   ```

4. **Open your browser and go to:**
   ```
   http://localhost:5000
   ```

## 📊 How to Use

### 1. Prepare Your Excel File
Your Excel file should have columns for:
- **Date** (required) - Can be named: Date, Day, Time, etc.
- **Sales** (required) - Can be named: Sales, Amount, Revenue, etc.
- **Refund** (optional) - Can be named: Refund, Returns, etc.
- **Hours** (optional) - Can be named: Hours, H, Time, Work, etc.

### 2. Upload and Process
1. Click "📁 Choose XLS/XLSX File" to upload your Excel file
2. The server will automatically detect columns and process the data
3. Review the data preview
4. Click "💰 Calculate Salaries" to process with commission tiers

### 3. Commission Tiers
- **Default tiers:**
  - $0-299 sales → $15/hour
  - $300-599 sales → $17/hour
  - $600-899 sales → $19/hour
  - $900+ sales → $21/hour
- **Customize tiers** using the interface
- **Import/Export** tier configurations as JSON

### 4. Export Results
- Click "📊 Export CSV" to download your salary report
- Results include: Date, Sales, Refund, Real Sales, Hours, Rate, Salary

## 🔧 Server Features

### Smart Column Detection
The server automatically detects columns regardless of naming:
- **Date columns**: Date, Day, Time, etc.
- **Sales columns**: Sales, Amount, Revenue, etc.
- **Refund columns**: Refund, Returns, Return, etc.
- **Hours columns**: Hours, H, Time, Work, etc.

### Automatic Processing
- Handles files with or without headers
- Processes multiple data formats
- Calculates real sales (Sales - Refund)
- Applies commission tiers automatically

### Error Handling
- Comprehensive error messages
- File validation
- Data type checking
- Graceful failure handling

## 📁 File Structure

```
salary-calculator/
├── server.py              # Flask server
├── requirements.txt       # Python dependencies
├── templates/
│   └── salary-calculator.html  # Web interface
├── uploads/              # Temporary upload folder
└── README.md            # This file
```

## 🐛 Troubleshooting

### File Upload Issues
- **"Required columns not found"**: Make sure your Excel file has Date and Sales columns
- **"File is empty"**: Check that your Excel file has data
- **"Error reading file"**: Ensure the file is a valid .xls or .xlsx format

### Server Issues
- **Port 5000 in use**: Change the port in `server.py` line 150
- **Permission errors**: Run with administrator privileges
- **Import errors**: Make sure all dependencies are installed

### Column Detection Issues
The server will try to detect columns automatically, but if it fails:
1. Make sure your Excel file has clear column headers
2. Try renaming columns to standard names (Date, Sales, etc.)
3. Check that data is in the correct format (numbers for sales/hours)

## 🔄 API Endpoints

- `GET /` - Main application page
- `POST /upload` - Upload and process Excel file
- `POST /calculate` - Calculate salaries with commission tiers
- `POST /export-csv` - Export results as CSV

## 📝 Example Excel Format

| Date       | Sales | Refund | Hours |
|------------|-------|--------|-------|
| 2024-01-01 | 500   | 50     | 8     |
| 2024-01-02 | 800   | 0      | 7.5   |
| 2024-01-03 | 1200  | 100    | 9     |

## 🎯 Commission Logic

The system calculates salaries using this formula:
```
Real Sales = Sales - Refund
Rate = Commission tier rate based on Real Sales
Salary = Rate × Hours
```

## 📞 Support

If you encounter issues:
1. Check the browser console (F12) for error messages
2. Verify your Excel file format
3. Ensure all Python dependencies are installed
4. Check that the server is running on port 5000

---

**Happy calculating! 💰✨** 