# Excel Mirror Preview Engine

Enterprise-grade Excel to PDF conversion engine that guarantees **100% mirror imaging** of complex Excel files (flowcharts, shapes, connectors, SmartArt) into F4 Landscape PDF.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    EXCEL MIRROR PREVIEW ENGINE                   │
│                                                                   │
│  ┌─────────────┐    ┌──────────────────┐    ┌────────────────┐  │
│  │   Excel     │    │   Windows COM    │    │   F4 Landscape │  │
│  │   File      │───▶│   Automation     │───▶│   PDF Output   │  │
│  │   (.xlsx)   │    │   (Excel.exe)    │    │   (100% Mirror)│  │
│  └─────────────┘    └──────────────────┘    └────────────────┘  │
│                                                                   │
│  Why Windows COM?                                                │
│  ✅ Preserves shape anchor positions                              │
│  ✅ Maintains connector glue points                               │
│  ✅ Correct object-to-cell alignment                              │
│  ✅ Consistent DPI scaling                                        │
│  ✅ Identical to Excel Print Preview                              │
└─────────────────────────────────────────────────────────────────┘
```

## Requirements

### Server Environment
- **Windows Server 2016/2019/2022**
- **Microsoft Excel Desktop** (Office 365 or Office 2016+)
- **.NET 6.0+ Runtime** (for C# implementation)

### NOT Supported
- LibreOffice
- OpenXML conversion
- Google Sheets API
- Client-side rendering

## Implementation Options

### Option 1: C# .NET (Recommended)

Best performance, native COM interop, enterprise-grade.

```bash
cd dotnet-engine
dotnet restore
dotnet run
```

### Option 2: Python + win32com

Good for rapid development, easier debugging.

```bash
cd python-engine
pip install -r requirements.txt
python engine.py
```

### Option 3: Node.js + edge-js

JavaScript-friendly, integrates with existing Node.js apps.

```bash
cd nodejs-engine
npm install
node engine.js
```

## API Endpoints

### Convert Excel to PDF

```http
POST /convert
Content-Type: application/json

{
  "fileBase64": "<base64-encoded-excel-file>",
  "fileName": "document.xlsx",
  "options": {
    "paperSize": "F4",          // F4, A4, A3, Letter
    "orientation": "Landscape", // Landscape, Portrait
    "fitToPage": true,
    "dpi": 300
  }
}
```

Response:
```json
{
  "success": true,
  "pdfBase64": "<base64-encoded-pdf>",
  "pageCount": 2,
  "pageSize": "F4 Landscape (33cm x 21.5cm)"
}
```

### Health Check

```http
GET /health
```

Response:
```json
{
  "status": "ok",
  "excelVersion": "Microsoft 365",
  "engine": "Windows COM Automation"
}
```

## How It Works

### Excel Automation Logic

```csharp
// 1. Initialize Excel (Headless Mode)
Application excel = new Application();
excel.Visible = false;
excel.DisplayAlerts = false;
excel.ScreenUpdating = false;
excel.EnableEvents = false;

// 2. Open Workbook (Read Only)
Workbook workbook = excel.Workbooks.Open(
    filePath,
    ReadOnly: true,
    CorruptLoad: XlCorruptLoad.xlNormalLoad
);

// 3. Configure Page Setup for F4 Landscape
foreach (Worksheet sheet in workbook.Worksheets)
{
    sheet.PageSetup.Zoom = false;                    // Disable zoom scaling
    sheet.PageSetup.FitToPagesWide = 1;              // Fit width to 1 page
    sheet.PageSetup.FitToPagesTall = false;          // Don't limit height
    sheet.PageSetup.Orientation = XlPageOrientation.xlLandscape;
    sheet.PageSetup.PaperSize = XlPaperSize.xlPaperFolio;  // F4
    sheet.PageSetup.CenterHorizontally = true;
    sheet.PageSetup.PrintArea = sheet.UsedRange.Address;
}

// 4. Export to PDF
workbook.ExportAsFixedFormat(
    XlFixedFormatType.xlTypePDF,
    outputPath,
    XlFixedFormatQuality.xlQualityStandard,
    IncludeDocProperties: true,
    IgnorePrintAreas: false
);

// 5. Cleanup
workbook.Close(false);
excel.Quit();
Marshal.ReleaseComObject(workbook);
Marshal.ReleaseComObject(excel);
GC.Collect();
GC.WaitForPendingFinalizers();
```

## Concurrency Control

The engine implements:

1. **Rendering Queue**: Sequential processing of conversion jobs
2. **File Locking**: Prevents simultaneous access to the same file
3. **Process Monitoring**: Automatic cleanup of orphan Excel processes
4. **Memory Management**: Forced GC after each conversion

## Memory Leak Prevention

Excel COM objects are notorious for memory leaks. Our implementation:

```csharp
// Pattern for safe COM object handling
public void SafeRelease(object obj)
{
    if (obj != null)
    {
        Marshal.ReleaseComObject(obj);
        obj = null;
    }
}

// Force cleanup after each conversion
public void Cleanup()
{
    GC.Collect();
    GC.WaitForPendingFinalizers();
    GC.Collect();
    GC.WaitForPendingFinalizers();
    
    // Kill orphan Excel processes older than 5 minutes
    KillOrphanExcelProcesses();
}
```

## Deployment

### Windows Server Setup

1. Install Microsoft Excel Desktop
2. Configure DCOM permissions for Excel
3. Set up the conversion service
4. Configure firewall for API port

### DCOM Configuration

```powershell
# Grant DCOM permissions for Excel
$dcomConfig = Get-WmiObject -Class Win32_DCOMApplicationSetting -Filter 'AppId="{00020812-0000-0000-C000-000000000046}"'
$dcomConfig.SetLaunchSecurityDescriptor("O:BAG:BAD:(A;;CCDCLCSWRP;;BA)(A;;CCDCLCSWRP;;IU)")
```

### Service Installation

```powershell
# Install as Windows Service
sc.exe create "ExcelMirrorEngine" binPath="C:\path\to\engine.exe" start=auto
sc.exe start ExcelMirrorEngine
```

## Testing

### Test with Sample File

```bash
# Convert test file
curl -X POST http://localhost:5000/convert \
  -H "Content-Type: application/json" \
  -d @test-payload.json \
  -o output.pdf
```

### Verify Output

1. Open PDF in Adobe Reader
2. Check page size is F4 Landscape (330mm × 215mm)
3. Verify shapes are in correct positions
4. Confirm connectors are attached properly

## License

Enterprise License - Direktorat Kesiapsiagaan, Basarnas

---

**Created by: Foe**
