/**
 * Excel Modifier Service
 * Modifies Excel file page setup directly using Python/openpyxl
 * This is needed because Graph API pageSetup endpoint doesn't work with Application permissions
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../utils/logger');

class ExcelModifier {
  constructor() {
    this.tempDir = '/tmp/excel-modify';
  }

  /**
   * Ensure temp directory exists
   */
  async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (err) {
      // Ignore if exists
    }
  }

  /**
   * Modify Excel page setup using Python/openpyxl
   * @param {Buffer} excelBuffer - Original Excel file buffer
   * @param {string} margin - Margin option ('normal', 'wide', 'extra-wide')
   * @returns {Promise<Buffer>} - Modified Excel buffer
   */
  async modifyPageSetup(excelBuffer, margin = 'normal') {
    const startTime = Date.now();
    
    // Define margin values in inches (openpyxl uses inches)
    const marginSettings = {
      'normal': { left: 0.39, right: 0.39, top: 0.39, bottom: 0.20 },      // ~1cm left/right/top, 0.5cm bottom
      'wide': { left: 0.59, right: 0.59, top: 0.59, bottom: 0.39 },        // ~1.5cm left/right/top, 1cm bottom
      'extra-wide': { left: 0.79, right: 0.79, top: 0.79, bottom: 0.59 }   // ~2cm left/right/top, 1.5cm bottom
    };
    
    const margins = marginSettings[margin] || marginSettings['normal'];
    
    logger.info('Modifying Excel page setup', { margin, margins });

    await this.ensureTempDir();
    
    const timestamp = Date.now();
    const inputPath = path.join(this.tempDir, `input-${timestamp}.xlsx`);
    const outputPath = path.join(this.tempDir, `output-${timestamp}.xlsx`);
    const scriptPath = path.join(this.tempDir, `script-${timestamp}.py`);
    
    try {
      // Write input file
      await fs.writeFile(inputPath, excelBuffer);
      
      // Python script to modify page setup
      const pythonScript = `#!/usr/bin/env python3
import sys
sys.path.insert(0, '/home/z/.venv/lib/python3.12/site-packages')
from openpyxl import load_workbook
from openpyxl.utils import get_column_letter

# Margin values in inches
left_margin = ${margins.left}
right_margin = ${margins.right}
top_margin = ${margins.top}
bottom_margin = ${margins.bottom}

# Load workbook
wb = load_workbook('${inputPath}')

# Modify each worksheet
for sheet_name in wb.sheetnames:
    sheet = wb[sheet_name]
    
    # Set page setup
    sheet.page_setup.orientation = 'landscape'
    sheet.page_setup.paperSize = 'A4'
    sheet.page_setup.fitToPage = True
    sheet.page_setup.fitToWidth = 1
    sheet.page_setup.fitToHeight = 0
    
    # Set margins (in inches)
    sheet.page_margins.left = left_margin
    sheet.page_margins.right = right_margin
    sheet.page_margins.top = top_margin
    sheet.page_margins.bottom = bottom_margin
    sheet.page_margins.header = 0.3
    sheet.page_margins.footer = 0.3
    
    # Set print area to used range
    if sheet.max_column > 0 and sheet.max_row > 0:
        last_col = get_column_letter(sheet.max_column)
        sheet.print_area = f'A1:{last_col}{sheet.max_row}'
    
    # Print titles (repeat first row)
    sheet.print_title_rows = '1:1'

# Save
wb.save('${outputPath}')
print('SUCCESS')
`;
      
      // Write script to file
      await fs.writeFile(scriptPath, pythonScript);
      
      // Execute Python script
      const result = await this.executePythonScript(scriptPath);
      
      if (!result.includes('SUCCESS')) {
        throw new Error(`Python script failed: ${result}`);
      }
      
      // Read modified file
      const modifiedBuffer = await fs.readFile(outputPath);
      
      const duration = Date.now() - startTime;
      logger.info('Excel page setup modified', { 
        margin, 
        originalSize: excelBuffer.length,
        modifiedSize: modifiedBuffer.length,
        duration: `${duration}ms`
      });
      
      return modifiedBuffer;
      
    } catch (error) {
      logger.error('Failed to modify Excel page setup', { 
        error: error.message,
        margin 
      });
      // Return original buffer if modification fails
      return excelBuffer;
    } finally {
      // Cleanup temp files
      try {
        await fs.unlink(inputPath).catch(() => {});
        await fs.unlink(outputPath).catch(() => {});
        await fs.unlink(scriptPath).catch(() => {});
      } catch (err) {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Execute Python script from file
   */
  executePythonScript(scriptPath) {
    return new Promise((resolve, reject) => {
      exec(`python3 "${scriptPath}"`, 
        { timeout: 30000 },
        (error, stdout, stderr) => {
          if (error) {
            reject(new Error(stderr || error.message));
          } else {
            resolve(stdout);
          }
        }
      );
    });
  }
}

// Export singleton instance
module.exports = new ExcelModifier();
