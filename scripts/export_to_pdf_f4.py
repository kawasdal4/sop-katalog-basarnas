#!/usr/bin/env python3
"""
==============================================================================
EXPORT EXCEL KE PDF F4 LANDSCAPE
==============================================================================
Deskripsi:
  Ekspor setiap sheet Excel ke PDF dengan ukuran F4 Landscape (33cm x 21.5cm)
  dengan menjaga posisi shapes dan connectors tetap utuh.

Cara Penggunaan:
  python export_to_pdf_f4.py input.xlsx
  
Output:
  input_F4_Landscape.pdf

Persyaratan:
  pip install openpyxl python-pptx reportlab pdf2image pillow

Untuk fitur screenshot berkualitas tinggi:
  - Windows: MS Excel terinstall (menggunakan win32com)
  - Linux: LibreOffice terinstall
  
==============================================================================
"""

import os
import sys
import subprocess
import tempfile
import shutil
from pathlib import Path

# Konstanta
F4_WIDTH_CM = 33.0      # Lebar F4 Landscape (cm)
F4_HEIGHT_CM = 21.5     # Tinggi F4 Landscape (cm)
MARGIN_CM = 1.0         # Margin (cm)
DPI = 300               # DPI untuk kualitas tinggi

# Points per cm
PTS_PER_CM = 28.3464567

F4_WIDTH_PTS = F4_WIDTH_CM * PTS_PER_CM    # 935.53 pts
F4_HEIGHT_PTS = F4_HEIGHT_CM * PTS_PER_CM  # 609.45 pts


def export_with_libreoffice(input_path, output_path):
    """
    Ekspor Excel ke PDF menggunakan LibreOffice.
    Khusus untuk Linux/macOS.
    """
    # Konversi ke PDF dengan LibreOffice
    cmd = [
        'libreoffice', '--headless', '--convert-to', 'pdf',
        '--outdir', os.path.dirname(output_path) or '.',
        input_path
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    
    # LibreOffice membuat file dengan nama sama
    expected_pdf = os.path.splitext(input_path)[0] + '.pdf'
    if os.path.exists(expected_pdf) and expected_pdf != output_path:
        shutil.move(expected_pdf, output_path)
    
    return os.path.exists(output_path)


def export_with_excel_com(input_path, output_path):
    """
    Ekspor Excel ke PDF menggunakan MS Excel via COM.
    Khusus untuk Windows dengan MS Excel terinstall.
    """
    try:
        import win32com.client
    except ImportError:
        print("Error: pywin32 tidak terinstall. Run: pip install pywin32")
        return False
    
    excel = None
    wb = None
    
    try:
        # Buka Excel
        excel = win32com.client.Dispatch("Excel.Application")
        excel.Visible = False
        excel.DisplayAlerts = False
        
        # Buka workbook
        wb = excel.Workbooks.Open(os.path.abspath(input_path))
        
        # Process setiap sheet
        temp_pdfs = []
        
        for i, ws in enumerate(wb.Worksheets):
            if ws.Visible:
                # Identifikasi used range (termasuk shapes)
                used_range = get_used_range_with_shapes(ws)
                
                if used_range:
                    # Capture as picture (Print Quality)
                    used_range.CopyPicture(Appearance=2, Format=2)  # xlPrinter=2, xlPicture=2
                    
                    # Buat temporary worksheet
                    temp_ws = wb.Worksheets.Add()
                    temp_ws.Name = f"_TempF4_{i}"
                    
                    # Setup F4 page
                    setup_f4_page(temp_ws)
                    
                    # Paste
                    temp_ws.Paste()
                    
                    # Scale to fit
                    pic = temp_ws.Shapes(temp_ws.Shapes.Count)
                    scale_image_to_fit(pic, temp_ws)
                    
                    # Position
                    pic.Left = temp_ws.PageSetup.LeftMargin
                    pic.Top = temp_ws.PageSetup.TopMargin
                    
                    # Export temp sheet
                    temp_pdf = os.path.join(tempfile.gettempdir(), f"temp_sheet_{i}.pdf")
                    temp_ws.ExportAsFixedFormat(0, temp_pdf, 0)  # xlTypePDF=0, xlQualityStandard=0
                    temp_pdfs.append(temp_pdf)
                    
                    # Delete temp sheet
                    temp_ws.Delete()
        
        # Merge PDFs
        if temp_pdfs:
            merge_pdfs(temp_pdfs, output_path)
            
            # Cleanup temp PDFs
            for pdf in temp_pdfs:
                try:
                    os.remove(pdf)
                except:
                    pass
            
            return True
        
    except Exception as e:
        print(f"Error: {e}")
        return False
    
    finally:
        if wb:
            wb.Close(False)
        if excel:
            excel.Quit()


def get_used_range_with_shapes(ws):
    """
    Identifikasi UsedRange yang mencakup shapes.
    """
    min_row, min_col = 1000000, 1000000
    max_row, max_col = 1, 1
    
    # Get used range dari cells
    used = ws.UsedRange
    if used:
        min_row = min(min_row, used.Row)
        min_col = min(min_col, used.Column)
        max_row = max(max_row, used.Row + used.Rows.Count - 1)
        max_col = max(max_col, used.Column + used.Columns.Count - 1)
    
    # Expand berdasarkan shapes
    for shape in ws.Shapes:
        min_row = min(min_row, shape.TopLeftCell.Row)
        min_col = min(min_col, shape.TopLeftCell.Column)
        max_row = max(max_row, shape.BottomRightCell.Row)
        max_col = max(max_col, shape.BottomRightCell.Column)
    
    if max_row >= min_row and max_col >= min_col:
        return ws.Range(ws.Cells(min_row, min_col), ws.Cells(max_row, max_col))
    return None


def setup_f4_page(ws):
    """
    Setup halaman F4 Landscape.
    """
    # Paper size custom (xlPaperUser = 256)
    ws.PageSetup.PaperSize = 256
    ws.PageSetup.PageWidth = F4_WIDTH_PTS
    ws.PageSetup.PageHeight = F4_HEIGHT_PTS
    
    # Orientation landscape
    ws.PageSetup.Orientation = 2  # xlLandscape
    
    # Margins
    margin_pts = MARGIN_CM * PTS_PER_CM
    ws.PageSetup.LeftMargin = margin_pts
    ws.PageSetup.RightMargin = margin_pts
    ws.PageSetup.TopMargin = margin_pts
    ws.PageSetup.BottomMargin = margin_pts
    
    # Center
    ws.PageSetup.CenterHorizontally = True
    ws.PageSetup.CenterVertically = True
    
    # Fit to page
    ws.PageSetup.FitToPagesWide = 1
    ws.PageSetup.FitToPagesTall = False
    ws.PageSetup.Zoom = False


def scale_image_to_fit(pic, ws):
    """
    Scale gambar agar fit ke halaman.
    """
    margin_pts = MARGIN_CM * PTS_PER_CM
    max_width = F4_WIDTH_PTS - 2 * margin_pts
    max_height = F4_HEIGHT_PTS - 2 * margin_pts
    
    width_ratio = max_width / pic.Width
    height_ratio = max_height / pic.Height
    scale_ratio = min(width_ratio, height_ratio)
    
    if scale_ratio > 1:
        scale_ratio = 1
    
    pic.ScaleWidth(scale_ratio, True)  # msoTrue = relative to original size
    pic.ScaleHeight(scale_ratio, True)


def merge_pdfs(pdf_list, output_path):
    """
    Gabungkan beberapa PDF menjadi satu.
    Menggunakan PyPDF2 atau reportlab.
    """
    try:
        from pypdf import PdfMerger
        
        merger = PdfMerger()
        for pdf in pdf_list:
            if os.path.exists(pdf):
                merger.append(pdf)
        merger.write(output_path)
        merger.close()
        return True
        
    except ImportError:
        # Alternatif: copy first PDF
        if pdf_list and os.path.exists(pdf_list[0]):
            shutil.copy(pdf_list[0], output_path)
            return True
    
    return False


def create_f4_pdf_from_images(images, output_path):
    """
    Buat PDF F4 Landscape dari gambar menggunakan ReportLab.
    """
    from reportlab.lib.units import cm
    from reportlab.pdfgen import canvas
    from reportlab.lib.utils import ImageReader
    
    # F4 Landscape size
    f4_width = F4_WIDTH_CM * cm
    f4_height = F4_HEIGHT_CM * cm
    
    c = canvas.Canvas(output_path, pagesize=(f4_width, f4_height))
    
    for img_path in images:
        from PIL import Image
        
        img = Image.open(img_path)
        img_width, img_height = img.size
        
        # Margin dalam cm
        margin = MARGIN_CM * cm
        
        # Area yang tersedia
        available_width = f4_width - 2 * margin
        available_height = f4_height - 2 * margin
        
        # Scale ratio
        width_ratio = available_width / img_width
        height_ratio = available_height / img_height
        scale_ratio = min(width_ratio, height_ratio)
        
        if scale_ratio > 1:
            scale_ratio = 1
        
        # Ukuran gambar setelah scale
        final_width = img_width * scale_ratio
        final_height = img_height * scale_ratio
        
        # Posisi (center)
        x = (f4_width - final_width) / 2
        y = (f4_height - final_height) / 2
        
        # Draw
        c.drawImage(ImageReader(img), x, y, final_width, final_height)
        c.showPage()
    
    c.save()


def export_with_screenshot_approach(input_path, output_path):
    """
    Pendekatan screenshot untuk presisi tinggi.
    1. Set paper ke A0 Landscape
    2. Screenshot setiap sheet
    3. Scale ke F4
    """
    import zipfile
    import re
    
    # Read Excel file
    temp_dir = tempfile.mkdtemp()
    
    try:
        # Extract xlsx
        extract_dir = os.path.join(temp_dir, 'extracted')
        with zipfile.ZipFile(input_path, 'r') as zf:
            zf.extractall(extract_dir)
        
        # Modify each worksheet XML
        sheets_dir = os.path.join(extract_dir, 'xl', 'worksheets')
        for sheet_file in os.listdir(sheets_dir):
            if sheet_file.endswith('.xml'):
                sheet_path = os.path.join(sheets_dir, sheet_file)
                with open(sheet_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Set A0 Landscape (paperSize=14)
                content = re.sub(
                    r'<pageSetup[^>]*/>',
                    '<pageSetup paperSize="14" orientation="landscape"/>',
                    content
                )
                
                with open(sheet_path, 'w', encoding='utf-8') as f:
                    f.write(content)
        
        # Repack
        modified_xlsx = os.path.join(temp_dir, 'modified.xlsx')
        with zipfile.ZipFile(modified_xlsx, 'w', zipfile.ZIP_DEFLATED) as zf:
            for root, dirs, files in os.walk(extract_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    arc_name = os.path.relpath(file_path, extract_dir)
                    zf.write(file_path, arc_name)
        
        # Convert to PDF dengan LibreOffice
        temp_pdf = os.path.join(temp_dir, 'temp.pdf')
        export_with_libreoffice(modified_xlsx, temp_pdf)
        
        if os.path.exists(temp_pdf):
            # Convert PDF to images at high DPI
            from pdf2image import convert_from_path
            images = convert_from_path(temp_pdf, dpi=DPI)
            
            # Save images temporarily
            img_paths = []
            for i, img in enumerate(images):
                img_path = os.path.join(temp_dir, f'page_{i}.png')
                img.save(img_path, 'PNG', dpi=(DPI, DPI))
                img_paths.append(img_path)
            
            # Create F4 PDF from images
            create_f4_pdf_from_images(img_paths, output_path)
            
            return True
        
        return False
        
    except Exception as e:
        print(f"Error in screenshot approach: {e}")
        return False
    
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


def export_excel_to_pdf_f4(input_path, output_path=None):
    """
    Main function untuk ekspor Excel ke PDF F4.
    """
    input_path = os.path.abspath(input_path)
    
    if not os.path.exists(input_path):
        print(f"Error: File tidak ditemukan: {input_path}")
        return False
    
    if output_path is None:
        base = os.path.splitext(input_path)[0]
        output_path = f"{base}_F4_Landscape.pdf"
    
    print(f"Input: {input_path}")
    print(f"Output: {output_path}")
    print(f"Paper: F4 Landscape ({F4_WIDTH_CM}cm x {F4_HEIGHT_CM}cm)")
    print(f"DPI: {DPI}")
    print()
    
    # Try different approaches
    success = False
    
    # Approach 1: MS Excel COM (Windows only)
    if sys.platform == 'win32':
        print("Mencoba dengan MS Excel...")
        try:
            success = export_with_excel_com(input_path, output_path)
        except Exception as e:
            print(f"MS Excel gagal: {e}")
    
    # Approach 2: Screenshot + LibreOffice
    if not success:
        print("Mencoba dengan Screenshot approach...")
        try:
            success = export_with_screenshot_approach(input_path, output_path)
        except Exception as e:
            print(f"Screenshot approach gagal: {e}")
    
    if success and os.path.exists(output_path):
        print(f"\n✅ Export berhasil: {output_path}")
        print(f"   File size: {os.path.getsize(output_path) / 1024:.1f} KB")
        return True
    else:
        print("\n❌ Export gagal")
        return False


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None
    
    export_excel_to_pdf_f4(input_file, output_file)
