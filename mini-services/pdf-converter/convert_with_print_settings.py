#!/usr/bin/env python3
"""
Excel/Word to PDF Converter - Respects Source File Print Settings

Strategy:
1. Read print settings from the source file (Excel: worksheet XML, Word: document XML)
2. Use LibreOffice to convert with proper settings preservation
3. Fall back to simple conversion if needed

This approach:
- Preserves the original file's page setup
- Maintains shapes, connectors, and formatting
- Works for both Excel (.xlsx, .xls) and Word (.docx, .doc) files
"""

import sys
import os
import subprocess
import tempfile
import shutil
import zipfile
import xml.etree.ElementTree as ET

def read_excel_print_settings(xlsx_path: str) -> dict:
    """
    Read print settings from Excel file by parsing worksheet XML.
    
    Returns dict with:
    - orientation: 'landscape' or 'portrait'
    - paperSize: paper size code
    - fitToPage: whether fit to page is enabled
    - fitToWidth: pages wide
    - fitToHeight: pages tall
    """
    settings = {
        'orientation': 'portrait',
        'paperSize': 9,  # A4
        'fitToPage': False,
        'fitToWidth': 1,
        'fitToHeight': 0,
        'hasSettings': False
    }
    
    try:
        with zipfile.ZipFile(xlsx_path, 'r') as zf:
            # Try to read from first worksheet
            sheet_files = [f for f in zf.namelist() if f.startswith('xl/worksheets/sheet') and f.endswith('.xml')]
            
            if sheet_files:
                sheet_files.sort()
                with zf.open(sheet_files[0]) as f:
                    tree = ET.parse(f)
                    root = tree.getroot()
                    ns = {'main': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
                    
                    # Find pageSetup element
                    page_setup = root.find('.//main:pageSetup', ns)
                    if page_setup is not None:
                        settings['hasSettings'] = True
                        
                        orientation = page_setup.get('orientation')
                        if orientation:
                            settings['orientation'] = orientation.lower()
                        
                        paper_size = page_setup.get('paperSize')
                        if paper_size:
                            settings['paperSize'] = int(paper_size)
                    
                    # Check for sheetPr with pageSetUpPr (fitToPage settings)
                    sheet_pr = root.find('.//main:sheetPr', ns)
                    if sheet_pr is not None:
                        page_setup_pr = sheet_pr.find('main:pageSetUpPr', ns)
                        if page_setup_pr is not None:
                            fit_to_page = page_setup_pr.get('fitToPage')
                            if fit_to_page == '1' or fit_to_page == 'true':
                                settings['fitToPage'] = True
                                # Try to get fit values
                                fit_width = page_setup_pr.get('fitToWidth')
                                fit_height = page_setup_pr.get('fitToHeight')
                                if fit_width:
                                    settings['fitToWidth'] = int(fit_width)
                                if fit_height:
                                    settings['fitToHeight'] = int(fit_height)
            
            # Also check for sheetPr at root level
            if not settings['fitToPage']:
                try:
                    with zf.open(sheet_files[0]) as f:
                        content = f.read().decode('utf-8')
                        if 'fitToPage="1"' in content or 'fitToPage="true"' in content:
                            settings['fitToPage'] = True
                except:
                    pass
        
        print(f"  [Excel Print Settings]")
        print(f"    Orientation: {settings['orientation']}")
        print(f"    Paper Size: {settings['paperSize']}")
        print(f"    Fit to Page: {settings['fitToPage']}")
        if settings['fitToPage']:
            print(f"    Fit: {settings['fitToWidth']}x{settings['fitToHeight']} pages")
        
    except Exception as e:
        print(f"  [Excel Print Settings] Could not read: {e}")
    
    return settings


def read_word_page_settings(docx_path: str) -> dict:
    """
    Read page settings from Word document.
    
    Returns dict with:
    - orientation: 'landscape' or 'portrait'
    - pageSize: (width, height) in twips
    """
    settings = {
        'orientation': 'portrait',
        'pageSize': None,
        'hasSettings': False
    }
    
    try:
        with zipfile.ZipFile(docx_path, 'r') as zf:
            # Word stores settings in word/settings.xml or word/document.xml
            if 'word/document.xml' in zf.namelist():
                with zf.open('word/document.xml') as f:
                    content = f.read().decode('utf-8')
                    
                    # Check for landscape orientation
                    # In Word, landscape is indicated by w:orient="landscape" in w:sectPr
                    if 'w:orient="landscape"' in content or 'w:orient="landscape"' in content:
                        settings['orientation'] = 'landscape'
                        settings['hasSettings'] = True
                    
                    # Try to parse properly
                    try:
                        tree = ET.parse(f)
                        root = tree.getroot()
                        ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
                        
                        sect_pr = root.find('.//w:sectPr', ns)
                        if sect_pr is not None:
                            pg_sz = sect_pr.find('w:pgSz', ns)
                            if pg_sz is not None:
                                w = pg_sz.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}w')
                                h = pg_sz.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}h')
                                orient = pg_sz.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}orient')
                                
                                if orient:
                                    settings['orientation'] = orient
                                    settings['hasSettings'] = True
                                elif w and h:
                                    # Width > Height means landscape
                                    if int(w) > int(h):
                                        settings['orientation'] = 'landscape'
                                        settings['hasSettings'] = True
                    except:
                        pass
        
        print(f"  [Word Page Settings]")
        print(f"    Orientation: {settings['orientation']}")
        
    except Exception as e:
        print(f"  [Word Page Settings] Could not read: {e}")
    
    return settings


def convert_to_pdf(input_path: str, output_path: str) -> bool:
    """
    Convert Excel/Word to PDF using LibreOffice.
    
    LibreOffice natively preserves the source file's print settings when converting.
    We just need to use the correct filter and let LibreOffice handle the rest.
    """
    print(f"[Convert] Starting conversion...")
    print(f"  Input: {input_path}")
    print(f"  Output: {output_path}")
    
    if not os.path.exists(input_path):
        print(f"  Error: Input file not found")
        return False
    
    # Determine file type and filter
    ext = input_path.lower().split('.')[-1]
    
    if ext in ['xlsx', 'xls', 'xlsm']:
        # Excel file - read settings for logging
        settings = read_excel_print_settings(input_path)
        filter_name = 'calc_pdf_Export'
    elif ext in ['docx', 'doc']:
        # Word file - read settings for logging
        settings = read_word_page_settings(input_path)
        filter_name = 'writer_pdf_Export'
    else:
        print(f"  Error: Unsupported file type: {ext}")
        return False
    
    # Create temp directory
    work_dir = tempfile.mkdtemp(prefix='pdf_convert_')
    
    try:
        # Use LibreOffice to convert directly
        # LibreOffice preserves the original print settings from the file
        print(f"  [Converting] Using LibreOffice filter: {filter_name}")
        
        # Method 1: Direct conversion (LibreOffice uses file's embedded settings)
        result = subprocess.run([
            'soffice', '--headless',
            '--convert-to', f'pdf:{filter_name}',
            '--outdir', work_dir,
            input_path
        ], capture_output=True, text=True, timeout=180)
        
        # Find the PDF file
        pdf_path = None
        base_name = os.path.splitext(os.path.basename(input_path))[0]
        for f in os.listdir(work_dir):
            if f.endswith('.pdf'):
                pdf_path = os.path.join(work_dir, f)
                break
        
        if pdf_path and os.path.exists(pdf_path):
            # Move to output path
            shutil.move(pdf_path, output_path)
            
            file_size = os.path.getsize(output_path)
            print(f"  ✓ PDF created: {output_path} ({file_size} bytes)")
            
            # Cleanup
            shutil.rmtree(work_dir, ignore_errors=True)
            
            return True
        else:
            print(f"  ✗ PDF not created (Method 1)")
            print(f"  STDOUT: {result.stdout}")
            print(f"  STDERR: {result.stderr}")
            
            # Method 2: Try simpler conversion
            print(f"  [Retry] Trying simple conversion...")
            result = subprocess.run([
                'soffice', '--headless',
                '--convert-to', 'pdf',
                '--outdir', work_dir,
                input_path
            ], capture_output=True, text=True, timeout=180)
            
            # Find PDF again
            for f in os.listdir(work_dir):
                if f.endswith('.pdf'):
                    pdf_path = os.path.join(work_dir, f)
                    shutil.move(pdf_path, output_path)
                    file_size = os.path.getsize(output_path)
                    print(f"  ✓ PDF created (Method 2): {output_path} ({file_size} bytes)")
                    shutil.rmtree(work_dir, ignore_errors=True)
                    return True
            
            print(f"  ✗ PDF creation failed")
            return False
    
    except Exception as e:
        print(f"  ✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    finally:
        if os.path.exists(work_dir):
            shutil.rmtree(work_dir, ignore_errors=True)


def main():
    if len(sys.argv) < 3:
        print("Usage: python3 convert_with_print_settings.py <input_file> <output_pdf>")
        print("\nConverts Excel (.xlsx, .xls) or Word (.docx, .doc) to PDF")
        print("Preserves the source file's print settings:")
        print("  - Page orientation (Landscape/Portrait)")
        print("  - Paper size")
        print("  - Fit to page settings")
        print("  - Print area")
        sys.exit(1)
    
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    
    success = convert_to_pdf(input_path, output_path)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
