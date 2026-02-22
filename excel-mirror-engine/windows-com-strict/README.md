# Windows COM Excel to PDF Converter - STRICT LANDSCAPE + LAYOUT LOCK

## Server Requirements

### 1. Microsoft Excel
- Install Microsoft Excel (Office 365 or Office 2019+)
- Activate license

### 2. Printer Configuration

#### Install Microsoft Print to PDF
```powershell
# Check if installed
Get-Printer -Name "Microsoft Print to PDF"

# If not installed, add it
Add-Printer -Name "Microsoft Print to PDF"
```

#### Set as Default Printer
```powershell
# Set as default
(Get-WmiObject -Query "SELECT * FROM Win32_Printer WHERE Name='Microsoft Print to PDF'").SetDefaultPrinter()
```

#### Configure F4 Paper Size
1. Open **Control Panel** → **Devices and Printers**
2. Right-click **Microsoft Print to PDF** → **Printing preferences**
3. Click **Paper/Quality** tab
4. Click **Custom Paper Size**
5. Add new size:
   - **Name**: F4
   - **Width**: 21 cm
   - **Height**: 33 cm
6. Click **OK** to save
7. Set F4 as default paper size

### 3. Python Dependencies
```powershell
pip install pywin32
```

## Usage

### Command Line
```powershell
python excel_to_pdf_strict.py input.xlsx output.pdf
```

### From Node.js
```javascript
const { exec } = require('child_process');
const path = require('path');

async function convertExcelToPdf(inputPath, outputPath) {
  const scriptPath = path.join(__dirname, 'excel_to_pdf_strict.py');
  
  return new Promise((resolve, reject) => {
    exec(`python "${scriptPath}" "${inputPath}" "${outputPath}"`, 
      { timeout: 180000 },
      (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve({ stdout, stderr });
        }
      }
    );
  });
}
```

## Features

| Feature | Implementation |
|---------|---------------|
| Worksheet Activation | ✅ ws.Activate() before PageSetup |
| UsedRange Selection | ✅ UsedRange.Select() |
| Shape Positioning Lock | ✅ shape.Placement = xlMoveAndSize |
| Zoom Disabled | ✅ PageSetup.Zoom = False |
| FitToPagesWide | ✅ = 1 (fit columns to 1 page) |
| FitToPagesTall | ✅ = False (auto height) |
| Orientation | ✅ xlLandscape (strict) |
| PrintCommunication | ✅ Disabled during setup |
| AutoFit | ❌ NOT CALLED |
| PaperSize | ❌ NOT SET (printer default) |

## Expected Results

- ✅ PDF orientation: LANDSCAPE
- ✅ No portrait fallback
- ✅ Shapes remain anchored to cells
- ✅ Connectors remain attached
- ✅ No layout shift
- ✅ Layout identical to Excel Print Preview

## Troubleshooting

### "ExportAsFixedFormat failed"
- Check printer is configured correctly
- Verify F4 paper size exists
- Try without custom margins

### "Shapes displaced"
- Verify shape.Placement is set to xlMoveAndSize
- Check PrintCommunication was disabled during setup

### "Portrait output instead of Landscape"
- Verify Orientation = xlLandscape
- Check printer preferences

### "Excel process stuck"
- Run: `taskkill /F /IM EXCEL.EXE`
- Check for zombie processes
