#!/usr/bin/env python3
"""
Excel to PDF Converter - Using LibreOffice Filter Options

Strategy:
1. Convert XLSX to ODS (preserves shapes/connectors exactly)
2. Export ODS to PDF with filter options:
   - ScaleToPagesX=1 (fit all columns to 1 page width)
   
This approach:
- Does NOT modify any XML
- Uses LibreOffice's native export engine
- Preserves shapes and connectors exactly as they appear in the original file
"""

import sys
import os
import subprocess
import tempfile
import shutil
import json

def convert_excel_to_pdf(input_path: str, output_path: str) -> bool:
    """
    Convert Excel to PDF with fit-to-width using LibreOffice filter options.
    
    This preserves shapes and connectors exactly.
    """
    print(f"[Convert] Starting conversion...")
    print(f"  Input: {input_path}")
    print(f"  Output: {output_path}")
    
    if not os.path.exists(input_path):
        print(f"  Error: Input file not found")
        return False
    
    # Create temp directory
    work_dir = tempfile.mkdtemp(prefix='excel_convert_')
    
    try:
        # Step 1: Convert XLSX to ODS first
        # This ensures shapes and connectors are properly converted
        print("  [Step 1/2] Converting XLSX to ODS (preserving shapes)...")
        
        result = subprocess.run([
            'soffice', '--headless',
            '--convert-to', 'ods',
            '--outdir', work_dir,
            input_path
        ], capture_output=True, text=True, timeout=120)
        
        # Find the ODS file
        ods_path = None
        for f in os.listdir(work_dir):
            if f.endswith('.ods'):
                ods_path = os.path.join(work_dir, f)
                break
        
        if not ods_path:
            print(f"  ✗ ODS conversion failed")
            print(f"  STDOUT: {result.stdout}")
            print(f"  STDERR: {result.stderr}")
            return False
        
        print(f"    Created: {ods_path}")
        
        # Step 2: Export ODS to PDF with filter options
        # Using ScaleToPagesX=1 to fit all columns to 1 page width
        print("  [Step 2/2] Exporting to PDF with fit-to-width...")
        
        # Build filter options JSON
        filter_options = {
            "ScaleToPagesX": {"type": "long", "value": 1}
        }
        filter_str = json.dumps(filter_options)
        
        # LibreOffice filter format: pdf:calc_pdf_Export:{"key":{"type":"type","value":value}}
        convert_filter = f'pdf:calc_pdf_Export:{filter_str}'
        
        print(f"    Filter: {convert_filter}")
        
        result = subprocess.run([
            'soffice', '--headless',
            '--convert-to', convert_filter,
            '--outdir', work_dir,
            ods_path
        ], capture_output=True, text=True, timeout=180)
        
        # Find the PDF file
        pdf_path = None
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
            print(f"  ✗ PDF not created")
            print(f"  STDOUT: {result.stdout}")
            print(f"  STDERR: {result.stderr}")
            
            # List files for debugging
            print(f"  Files in {work_dir}:")
            for f in os.listdir(work_dir):
                print(f"    {f}")
            return False
    
    except Exception as e:
        print(f"  ✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    finally:
        if os.path.exists(work_dir):
            shutil.rmtree(work_dir, ignore_errors=True)


def convert_with_simple_scale(input_path: str, output_path: str) -> bool:
    """
    Simple approach: Direct conversion with filter options.
    May not work for all files.
    """
    print(f"[Convert] Direct conversion with filter options...")
    
    filter_options = '{"ScaleToPagesX":{"type":"long","value":"1"}}'
    convert_filter = f'pdf:calc_pdf_Export:{filter_options}'
    
    output_dir = os.path.dirname(output_path) or '.'
    
    result = subprocess.run([
        'soffice', '--headless',
        '--convert-to', convert_filter,
        '--outdir', output_dir,
        input_path
    ], capture_output=True, text=True, timeout=180)
    
    # Find PDF
    base = os.path.splitext(os.path.basename(input_path))[0]
    pdf_path = os.path.join(output_dir, f"{base}.pdf")
    
    if os.path.exists(pdf_path):
        if pdf_path != output_path:
            shutil.move(pdf_path, output_path)
        print(f"  ✓ PDF created: {output_path}")
        return True
    else:
        print(f"  ✗ PDF not created")
        return False


def main():
    if len(sys.argv) < 3:
        print("Usage: python3 convert_with_print_settings.py <input_excel> <output_pdf>")
        print("\nApplies:")
        print("  - Fit all columns to 1 page width")
        print("  - Preserves shapes and connectors")
        sys.exit(1)
    
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    
    success = convert_excel_to_pdf(input_path, output_path)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
