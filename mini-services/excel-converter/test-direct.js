/**
 * Direct test script for Excel to PDF conversion
 * Tests if margin settings are properly applied
 */
const fs = require('fs');
const path = require('path');
const graphService = require('./src/services/graphService');

async function testConversion() {
  const testFile = '/home/z/my-project/upload/1771456953993_SOP-0002.xlsx';
  
  console.log('=== Direct Excel to PDF Conversion Test ===\n');
  console.log('Test file:', testFile);
  
  // Read the Excel file
  const excelBuffer = fs.readFileSync(testFile);
  console.log('File size:', (excelBuffer.length / 1024).toFixed(2), 'KB');
  
  // Test with different margin settings
  const margins = ['normal', 'wide', 'extra-wide'];
  
  for (const margin of margins) {
    console.log(`\n--- Testing with margin: ${margin} ---`);
    
    try {
      const startTime = Date.now();
      
      // Generate unique filename
      const testId = Date.now().toString(36);
      const tempFileName = `test-${margin}-${testId}.xlsx`;
      
      // Convert using Graph API
      const pdfBuffer = await graphService.convertExcelToPdf(excelBuffer, tempFileName, margin);
      
      const duration = Date.now() - startTime;
      
      // Save the PDF for inspection
      const outputPath = `/tmp/test-${margin}.pdf`;
      fs.writeFileSync(outputPath, pdfBuffer);
      
      console.log(`✓ Conversion successful!`);
      console.log(`  PDF size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
      console.log(`  Duration: ${duration}ms`);
      console.log(`  Output: ${outputPath}`);
      
    } catch (error) {
      console.log(`✗ Conversion failed:`, error.message);
    }
  }
  
  console.log('\n=== Test Complete ===');
}

testConversion().catch(console.error);
