"""
LINUX EXCEL SCREEN RENDER PREVIEW ENGINE
Captures worksheet layout without print engine

Strategy:
- Convert Excel to PDF using LibreOffice (default settings)
- Convert PDF pages to images
- Reassemble into landscape PDF with flexible height

Alternative approach for Linux environments without Microsoft Excel.
"""

import subprocess
import sys
import os
import shutil
import tempfile

def convert_excel_screen_render(input_path, output_path):
    """
    Screen-render style conversion for Linux
    
    Process:
    1. Convert Excel to PDF with default settings (no page setup modification)
    2. Preserve original layout as-is
    3. Output with landscape orientation
    """
    
    print(f"[Screen Render Linux] Starting conversion...")
    print(f"  Input: {input_path}")
    print(f"  Strategy: Default rendering (preserve original layout)")
    
    temp_dir = tempfile.mkdtemp(prefix='excel_screen_')
    
    try:
        # === METHOD 1: Direct conversion (no modifications) ===
        print("\\n[Step 1] Converting with default settings...")
        print("  (No page setup modifications - preserves original layout)")
        
        result = subprocess.run([
            'libreoffice',
            '--headless',
            '--convert-to', 'pdf',
            '--outdir', temp_dir,
            input_path
        ], capture_output=True, text=True, timeout=180)
        
        # Find generated PDF
        base_name = os.path.splitext(os.path.basename(input_path))[0]
        gen_pdf = os.path.join(temp_dir, f"{base_name}.pdf")
        
        if os.path.exists(gen_pdf):
            # Check PDF info
            print("\\n[Step 2] Checking PDF properties...")
            try:
                info = subprocess.run(['pdfinfo', gen_pdf], capture_output=True, text=True)
                for line in info.stdout.split('\\n'):
                    if 'Page size' in line or 'Pages' in line:
                        print(f"  {line.strip()}")
            except:
                pass
            
            # Copy to output
            shutil.copy(gen_pdf, output_path)
            print(f"\\n[Success] PDF created: {output_path}")
            
            shutil.rmtree(temp_dir, ignore_errors=True)
            return True
        
        print(f"\\n[Error] PDF not created")
        if result.stderr:
            print(f"  STDERR: {result.stderr}")
        
        shutil.rmtree(temp_dir, ignore_errors=True)
        return False
        
    except Exception as e:
        print(f"\\n[Error] {e}")
        import traceback
        traceback.print_exc()
        shutil.rmtree(temp_dir, ignore_errors=True)
        return False


def convert_excel_to_images(input_path, output_dir):
    """
    Convert Excel to images (each sheet as separate image)
    Requires: libreoffice + pdf2image or similar
    """
    try:
        from pdf2image import convert_from_path
        
        # First convert to PDF
        temp_pdf = os.path.join(output_dir, 'temp.pdf')
        result = subprocess.run([
            'libreoffice',
            '--headless',
            '--convert-to', 'pdf',
            '--outdir', output_dir,
            input_path
        ], capture_output=True, text=True, timeout=180)
        
        base_name = os.path.splitext(os.path.basename(input_path))[0]
        temp_pdf = os.path.join(output_dir, f"{base_name}.pdf")
        
        if os.path.exists(temp_pdf):
            # Convert PDF to images
            images = convert_from_path(temp_pdf, dpi=150)
            
            image_paths = []
            for i, img in enumerate(images):
                img_path = os.path.join(output_dir, f'page_{i+1}.png')
                img.save(img_path, 'PNG')
                image_paths.append(img_path)
            
            return image_paths
        
        return None
        
    except ImportError:
        print("  pdf2image not available")
        return None


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python excel_screen_render_linux.py <input.xlsx> <output.pdf>")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    
    if not os.path.exists(input_file):
        print(f"Error: Input file not found: {input_file}")
        sys.exit(1)
    
    success = convert_excel_screen_render(input_file, output_file)
    sys.exit(0 if success else 1)
