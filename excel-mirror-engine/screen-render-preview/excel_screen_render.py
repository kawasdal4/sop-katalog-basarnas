"""
WINDOWS COM EXCEL SCREEN RENDER PREVIEW ENGINE
Captures worksheet layout exactly as displayed on screen

Strategy:
- NO print engine (ExportAsFixedFormat)
- NO page setup scaling
- NO printer dependency
- Use CopyPicture to capture screen-rendered view
- Create PDF from captured image

Output:
- Landscape PDF
- Fixed width (A4/F4 landscape)
- Flexible height (auto-expand)
- All columns fit horizontally
- Vertical scrolling in viewer
"""

import sys
import os
import time
import pythoncom
import win32com.client
from win32com.client import constants as xlConstants
import tempfile
import shutil

# Excel Constants
xlScreen = 1
xlPicture = -4147  # xlPicture (Windows Metafile)
xlBitmap = 2       # xlBitmap (Bitmap)
xlLandscape = 2
xlPortrait = 1

def capture_excel_screen(input_path, output_pdf_path, dpi=150):
    """
    Capture Excel worksheet as screen-rendered image and create PDF
    
    Process:
    1. Open Excel with Zoom = 100%
    2. Get UsedRange
    3. Adjust window to fit all columns
    4. CopyPicture (xlScreen, xlBitmap)
    5. Save as PNG
    6. Create Landscape PDF with flexible height
    """
    
    print(f"[Screen Render] Starting capture...")
    print(f"  Input: {input_path}")
    print(f"  Strategy: Screen-based rendering (NO print engine)")
    print(f"  DPI: {dpi}")
    
    excel = None
    workbook = None
    temp_dir = tempfile.mkdtemp(prefix='excel_screen_')
    
    try:
        # === STEP 1: INITIALIZE EXCEL ===
        print("\\n[Step 1] Initializing Excel COM...")
        
        pythoncom.CoInitialize()
        
        excel = win32com.client.Dispatch("Excel.Application")
        excel.Visible = True  # Required for CopyPicture to work correctly
        excel.DisplayAlerts = False
        excel.ScreenUpdating = True  # Need screen updating for capture
        excel.EnableEvents = False
        
        # CRITICAL: Set zoom to 100% - no scaling
        print("  ✓ Excel initialized")
        
        # === STEP 2: OPEN WORKBOOK ===
        print("\\n[Step 2] Opening workbook...")
        workbook = excel.Workbooks.Open(
            os.path.abspath(input_path),
            ReadOnly=True,
            UpdateLinks=0
        )
        print(f"  ✓ Workbook opened: {workbook.Name}")
        
        # Process each worksheet
        captured_images = []
        
        for sheet_index in range(1, workbook.Sheets.Count + 1):
            ws = workbook.Sheets(sheet_index)
            sheet_name = ws.Name
            print(f"\\n  [Sheet {sheet_index}] Processing: {sheet_name}")
            
            # Activate worksheet
            ws.Activate()
            time.sleep(0.5)  # Wait for screen refresh
            
            # Set zoom to 100%
            ws.Application.ActiveWindow.Zoom = 100
            print("    ✓ Zoom: 100%")
            
            # === STEP 3: GET USEDRANGE ===
            used_range = ws.UsedRange
            print(f"    ✓ UsedRange: {used_range.Address}")
            
            # === STEP 4: CAPTURE SCREEN IMAGE ===
            print("    ✓ Capturing screen image...")
            
            # Method 1: CopyPicture + Paste to Chart
            try:
                # Select the used range
                used_range.Select()
                time.sleep(0.3)
                
                # Copy as picture (screen appearance)
                used_range.CopyPicture(Appearance=xlScreen, Format=xlBitmap)
                print("    ✓ CopyPicture executed")
                
                # Create a chart sheet to paste the image
                chart_sheet = workbook.Charts.Add()
                chart_sheet.Location(Where=2, Name=f"_temp_capture_{sheet_index}")
                
                # Configure chart for clean image
                chart = workbook.Charts(f"_temp_capture_{sheet_index}")
                chart.ChartArea.Format.Line.Visible = False  # No border
                chart.ChartArea.Format.Fill.Visible = False   # Transparent fill
                
                # Paste the image
                chart.Paste()
                time.sleep(0.3)
                
                # Export chart as PNG
                image_path = os.path.join(temp_dir, f"sheet_{sheet_index}.png")
                chart.Export(image_path, FilterName="PNG")
                print(f"    ✓ Image saved: {image_path}")
                
                captured_images.append({
                    'path': image_path,
                    'sheet': sheet_name
                })
                
                # Delete temp chart
                chart.Delete()
                
            except Exception as e:
                print(f"    ⚠ CopyPicture method failed: {e}")
                print("    → Trying alternative capture method...")
                
                # Method 2: Direct window capture
                try:
                    image_path = capture_window_alternative(ws, temp_dir, sheet_index)
                    if image_path:
                        captured_images.append({
                            'path': image_path,
                            'sheet': sheet_name
                        })
                except Exception as e2:
                    print(f"    ⚠ Alternative method also failed: {e2}")
        
        # === STEP 5: CREATE PDF FROM IMAGES ===
        print(f"\\n[Step 5] Creating PDF from {len(captured_images)} captured images...")
        
        if captured_images:
            pdf_path = create_pdf_from_images(captured_images, output_pdf_path, dpi)
            print(f"  ✓ PDF created: {pdf_path}")
        else:
            raise Exception("No images captured")
        
        # === CLEANUP ===
        print("\\n[Cleanup] Closing Excel...")
        workbook.Close(SaveChanges=False)
        workbook = None
        excel.Quit()
        excel = None
        print("  ✓ Excel closed")
        
        # Cleanup temp directory
        shutil.rmtree(temp_dir, ignore_errors=True)
        
        print("\\n[Success] Screen render preview created!")
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


def capture_window_alternative(worksheet, temp_dir, sheet_index):
    """
    Alternative capture using Windows API
    """
    import ctypes
    from ctypes import wintypes
    
    # Get Excel window handle
    hwnd = worksheet.Application.Hwnd
    
    # Use PIL for screenshot
    try:
        from PIL import ImageGrab
        
        # Get window rectangle
        user32 = ctypes.windll.user32
        
        rect = wintypes.RECT()
        user32.GetWindowRect(hwnd, ctypes.byref(rect))
        
        left, top, right, bottom = rect.left, rect.top, rect.right, rect.bottom
        
        # Capture window
        img = ImageGrab.grab(bbox=(left, top, right, bottom))
        image_path = os.path.join(temp_dir, f"sheet_{sheet_index}.png")
        img.save(image_path, 'PNG')
        
        return image_path
        
    except ImportError:
        print("    ⚠ PIL not available for window capture")
        return None


def create_pdf_from_images(images, output_path, dpi=150):
    """
    Create a landscape PDF from captured images
    - Fixed width (landscape A4/F4)
    - Flexible height (auto-expand to fit image)
    """
    try:
        from PIL import Image
        from reportlab.lib.pagesizes import landscape, A4
        from reportlab.pdfgen import canvas
        from reportlab.lib.units import inch, cm
        
        # F4 Landscape dimensions (33cm x 21.5cm)
        F4_LANDSCAPE = (33*cm, 21.5*cm)
        
        # Use A4 landscape as base
        page_width, page_height = landscape(A4)
        
        print(f"  PDF page size: {page_width/28.35:.1f} x {page_height/28.35:.1f} points (A4 Landscape)")
        
        # Create PDF
        c = canvas.Canvas(output_path)
        
        for img_data in images:
            img_path = img_data['path']
            sheet_name = img_data['sheet']
            
            print(f"  Processing: {sheet_name}")
            
            # Load image
            img = Image.open(img_path)
            img_width, img_height = img.size
            
            print(f"    Image size: {img_width} x {img_height} pixels")
            
            # Calculate scaling to fit width
            # All columns must fit horizontally
            scale = page_width / img_width
            
            # Scaled dimensions
            scaled_width = page_width
            scaled_height = img_height * scale
            
            print(f"    Scaled to: {scaled_width/28.35:.1f} x {scaled_height/28.35:.1f} points")
            
            # Set page size (flexible height)
            c.setPageSize((page_width, scaled_height))
            
            # Draw image
            c.drawImage(img_path, 0, 0, width=scaled_width, height=scaled_height)
            
            # New page for next sheet
            c.showPage()
        
        c.save()
        return output_path
        
    except ImportError as e:
        print(f"  ⚠ PIL or ReportLab not available: {e}")
        # Fallback to img2pdf
        return create_pdf_img2pdf(images, output_path)


def create_pdf_img2pdf(images, output_path):
    """
    Alternative PDF creation using img2pdf
    """
    import img2pdf
    
    image_paths = [img['path'] for img in images]
    
    # Create PDF with auto layout
    with open(output_path, 'wb') as f:
        f.write(img2pdf.convert(image_paths, layout_fun=img2pdf.get_layout_fun()))
    
    return output_path


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python excel_screen_render.py <input.xlsx> <output.pdf> [dpi]")
        print("  dpi: optional, default 150")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    dpi = int(sys.argv[3]) if len(sys.argv) > 3 else 150
    
    if not os.path.exists(input_file):
        print(f"Error: Input file not found: {input_file}")
        sys.exit(1)
    
    success = capture_excel_screen(input_file, output_file, dpi)
    sys.exit(0 if success else 1)
