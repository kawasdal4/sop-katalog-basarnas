"""
WINDOWS COM EXCEL TO PDF CONVERTER
STRICT LANDSCAPE + LAYOUT LOCK

Requirements:
- Windows Server with Microsoft Excel installed
- Microsoft Print to PDF as default printer
- F4 paper size configured in printer preferences (21cm x 33cm)

Usage:
    python excel_to_pdf_strict.py <input.xlsx> <output.pdf>
"""

import sys
import os
import time
import pythoncom
import win32com.client
from win32com.client import constants as xlConstants

# Excel Constants
xlTypePDF = 0
xlQualityStandard = 0
xlLandscape = 2
xlPortrait = 1
xlMoveAndSize = 2  # Shape placement - moves and sizes with cells
xlMove = 3         # Shape placement - moves but doesn't size with cells
xlFreeFloating = 3 # Shape placement - doesn't move or size with cells

def convert_excel_to_pdf_strict(input_path, output_path):
    """
    STRICT LANDSCAPE + LAYOUT LOCK conversion using Windows COM
    
    Implementation Order (CRITICAL):
    1. Initialize Excel with PrintCommunication disabled
    2. Open workbook
    3. For each worksheet:
       a. ACTIVATE worksheet
       b. SELECT UsedRange
       c. LOCK shape positions (xlMoveAndSize)
       d. APPLY PageSetup (Landscape, FitToPagesWide ONLY)
    4. Enable PrintCommunication
    5. Export to PDF
    6. Cleanup (close workbook, quit Excel, kill orphans)
    """
    
    print(f"[STRICT COM Converter] Starting conversion...")
    print(f"  Input: {input_path}")
    print(f"  Strategy: STRICT LANDSCAPE + LAYOUT LOCK")
    
    excel = None
    workbook = None
    
    try:
        # === STEP 1: INITIALIZE EXCEL ===
        print("\\n[Step 1] Initializing Excel COM...")
        
        # CoInitialize for COM
        pythoncom.CoInitialize()
        
        excel = win32com.client.Dispatch("Excel.Application")
        excel.Visible = False
        excel.DisplayAlerts = False
        excel.ScreenUpdating = False
        excel.EnableEvents = False
        
        # CRITICAL: Disable PrintCommunication for stable DPI
        # This prevents Excel from recalculating layout multiple times
        excel.PrintCommunication = False
        print("  ✓ Excel initialized")
        print("  ✓ PrintCommunication disabled")
        
        # === STEP 2: OPEN WORKBOOK ===
        print("\\n[Step 2] Opening workbook...")
        workbook = excel.Workbooks.Open(
            os.path.abspath(input_path),
            ReadOnly=True,
            UpdateLinks=0
        )
        print(f"  ✓ Workbook opened: {workbook.Name}")
        print(f"  ✓ Sheets: {workbook.Sheets.Count}")
        
        # === STEP 3: PROCESS EACH WORKSHEET ===
        for sheet_index in range(1, workbook.Sheets.Count + 1):
            ws = workbook.Sheets(sheet_index)
            sheet_name = ws.Name
            print(f"\\n  [Sheet {sheet_index}] Processing: {sheet_name}")
            
            # === STEP 3a: ACTIVATE WORKSHEET ===
            ws.Activate()
            print("    ✓ Worksheet ACTIVATED")
            
            # === STEP 3b: SELECT USEDRANGE ===
            used_range = ws.UsedRange
            used_range.Select()
            print(f"    ✓ UsedRange SELECTED: {used_range.Address}")
            
            # === STEP 3c: LOCK SHAPE POSITIONING ===
            # Set all shapes to xlMoveAndSize (2)
            # This ensures shapes stay attached to cells during scaling
            shape_count = ws.Shapes.Count if ws.Shapes.Count > 0 else 0
            if shape_count > 0:
                for shape in ws.Shapes:
                    shape.Placement = xlMoveAndSize
                print(f"    ✓ LOCKED {shape_count} shapes (xlMoveAndSize)")
            else:
                print("    ✓ No shapes to lock")
            
            # === STEP 3d: APPLY PAGE SETUP (STRICT LANDSCAPE) ===
            # CRITICAL: Do NOT set Zoom - use ONLY FitToPagesWide
            
            # DISABLE ZOOM
            ws.PageSetup.Zoom = False
            print("    ✓ Zoom: DISABLED")
            
            # FIT TO PAGE
            ws.PageSetup.FitToPagesWide = 1   # Fit columns to 1 page width
            ws.PageSetup.FitToPagesTall = False  # Auto height (unlimited)
            print("    ✓ FitToPagesWide: 1")
            print("    ✓ FitToPagesTall: Auto")
            
            # ORIENTATION - STRICT LANDSCAPE
            ws.PageSetup.Orientation = xlLandscape
            print("    ✓ Orientation: LANDSCAPE")
            
            # CENTER HORIZONTALLY
            ws.PageSetup.CenterHorizontally = True
            ws.PageSetup.CenterVertically = False
            print("    ✓ Center: Horizontal")
            
            # MARGINS (1cm = 28.35 points, or use InchesToPoints)
            cm_to_points = excel.CentimetersToPoints
            ws.PageSetup.LeftMargin = cm_to_points(1)
            ws.PageSetup.RightMargin = cm_to_points(1)
            ws.PageSetup.TopMargin = cm_to_points(1)
            ws.PageSetup.BottomMargin = cm_to_points(1)
            print("    ✓ Margins: 1cm (all sides)")
            
            # PRINT AREA
            try:
                ws.PageSetup.PrintArea = used_range.Address
                print(f"    ✓ PrintArea: {used_range.Address}")
            except:
                pass
            
            # === DO NOT SET PAPERSIZE ===
            # Paper size is controlled by printer defaults
            # ws.PageSetup.PaperSize = xlPaperFolio  # ❌ NEVER SET THIS
            
            # === DO NOT CALL AUTOFIT ===
            # ws.Columns.AutoFit()  # ❌ NEVER CALL THIS
            # ws.Rows.AutoFit()     # ❌ NEVER CALL THIS
        
        # === STEP 4: ENABLE PRINTCOMMUNICATION ===
        print("\\n[Step 4] Enabling PrintCommunication...")
        excel.PrintCommunication = True
        print("  ✓ PrintCommunication enabled")
        
        # === STEP 5: EXPORT TO PDF ===
        print("\\n[Step 5] Exporting to PDF...")
        workbook.ExportAsFixedFormat(
            Type=xlTypePDF,
            Filename=os.path.abspath(output_path),
            Quality=xlQualityStandard,
            IncludeDocProperties=True,
            IgnorePrintAreas=False,
            OpenAfterPublish=False
        )
        print(f"  ✓ PDF exported: {output_path}")
        
        # === STEP 6: CLEANUP ===
        print("\\n[Step 6] Cleanup...")
        
        # Close workbook without saving
        workbook.Close(SaveChanges=False)
        workbook = None
        print("  ✓ Workbook closed")
        
        # Quit Excel
        excel.Quit()
        excel = None
        print("  ✓ Excel quit")
        
        # Release COM objects
        import gc
        gc.collect()
        print("  ✓ COM objects released")
        
        print("\\n[Success] PDF created successfully!")
        return True
        
    except Exception as e:
        print(f"\\n[Error] {e}")
        import traceback
        traceback.print_exc()
        
        # Cleanup on error
        try:
            if workbook:
                workbook.Close(SaveChanges=False)
        except:
            pass
        try:
            if excel:
                excel.Quit()
        except:
            pass
        
        return False
        
    finally:
        # CoUninitialize
        try:
            pythoncom.CoUninitialize()
        except:
            pass
        
        # Kill orphan Excel processes
        try:
            import subprocess
            subprocess.run(['taskkill', '/F', '/IM', 'EXCEL.EXE'], 
                          capture_output=True, timeout=10)
        except:
            pass


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python excel_to_pdf_strict.py <input.xlsx> <output.pdf>")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    
    if not os.path.exists(input_file):
        print(f"Error: Input file not found: {input_file}")
        sys.exit(1)
    
    success = convert_excel_to_pdf_strict(input_file, output_file)
    sys.exit(0 if success else 1)
