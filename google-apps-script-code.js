/**
 * GOOGLE APPS SCRIPT - Excel to PDF Converter
 * 
 * PENTING: Export Excel langsung ke PDF TANPA konversi ke Google Spreadsheet
 * Menjaga format asli: merge cell, flowchart, formatting
 */

function doPost(e) {
  try {
    var fileId;
    
    if (e && e.postData && e.postData.contents) {
      var data = JSON.parse(e.postData.contents);
      fileId = data.fileId;
    } else if (e && e.parameter && e.parameter.fileId) {
      fileId = e.parameter.fileId;
    }
    
    if (!fileId) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'error', message: 'File ID tidak ditemukan' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var file = DriveApp.getFileById(fileId);
    var fileName = file.getName();
    var mimeType = file.getMimeType();
    
    console.log('Processing: ' + fileName);
    console.log('MIME: ' + mimeType);
    
    var pdfBlob;
    
    if (mimeType === 'application/vnd.google-apps.spreadsheet') {
      // Google Spreadsheet - export langsung
      pdfBlob = exportSpreadsheetAsPdf(fileId);
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mimeType === 'application/vnd.ms-excel'
    ) {
      // Excel - export LANGSUNG ke PDF tanpa konversi
      pdfBlob = exportExcelDirectToPdf(fileId, accessToken);
    } else if (mimeType === 'application/vnd.google-apps.document') {
      pdfBlob = exportDocAsPdf(fileId);
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword'
    ) {
      // Word - export langsung ke PDF
      pdfBlob = exportWordDirectToPdf(fileId);
    } else {
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'error', message: 'Tipe file tidak didukung: ' + mimeType }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var pdfBase64 = Utilities.base64Encode(pdfBlob.getBytes());
    
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'success', pdfBase64: pdfBase64, fileName: fileName.replace(/\.[^/.]+$/, '') + '.pdf' }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error: ' + error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  if (!e) return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Gunakan: ?fileId=YOUR_FILE_ID' })).setMimeType(ContentService.MimeType.JSON);
  var fileId = e.parameter ? e.parameter.fileId : null;
  if (!fileId) return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Parameter fileId diperlukan' })).setMimeType(ContentService.MimeType.JSON);
  return doPost({ postData: { contents: JSON.stringify({ fileId: fileId }) } });
}

// Export Google Spreadsheet ke PDF
function exportSpreadsheetAsPdf(spreadsheetId) {
  var exportUrl = 'https://docs.google.com/spreadsheets/d/' + spreadsheetId + '/export?' +
    'format=pdf&size=A4&fitw=true&portrait=true&gridlines=false&fzr=false&sheetnames=false&printtitle=false&pagenumbers=false&gid=0';
  
  var response = UrlFetchApp.fetch(exportUrl, {
    headers: { 'Authorization': 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true
  });
  
  if (response.getResponseCode() !== 200) {
    throw new Error('Gagal export spreadsheet: HTTP ' + response.getResponseCode());
  }
  
  return response.getBlob();
}

// Export Excel LANGSUNG ke PDF via Drive API (tanpa konversi ke Spreadsheet)
// Ini menjaga format asli: merge cell, flowchart, dll
function exportExcelDirectToPdf(fileId) {
  var accessToken = ScriptApp.getOAuthToken();
  
  // Drive API v3 export - langsung dari Excel ke PDF
  var exportUrl = 'https://www.googleapis.com/drive/v3/files/' + fileId + '/export?mimeType=application/pdf';
  
  console.log('Export URL: ' + exportUrl);
  
  var response = UrlFetchApp.fetch(exportUrl, {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + accessToken
    },
    muteHttpExceptions: true
  });
  
  console.log('Response code: ' + response.getResponseCode());
  
  if (response.getResponseCode() === 200) {
    return response.getBlob();
  }
  
  // Jika gagal, coba dengan parameter tambahan
  var exportUrl2 = 'https://www.googleapis.com/drive/v3/files/' + fileId + '/export?' +
    'mimeType=application/pdf&fields=*';
  
  var response2 = UrlFetchApp.fetch(exportUrl2, {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + accessToken },
    muteHttpExceptions: true
  });
  
  if (response2.getResponseCode() === 200) {
    return response2.getBlob();
  }
  
  // Jika masih gagal, coba download file dan gunakan layanan lain
  throw new Error('Gagal export Excel ke PDF langsung. HTTP ' + response.getResponseCode() + ' - ' + response.getContentText().substring(0, 300));
}

// Export Word langsung ke PDF
function exportWordDirectToPdf(fileId) {
  var accessToken = ScriptApp.getOAuthToken();
  
  var exportUrl = 'https://www.googleapis.com/drive/v3/files/' + fileId + '/export?mimeType=application/pdf';
  
  var response = UrlFetchApp.fetch(exportUrl, {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + accessToken },
    muteHttpExceptions: true
  });
  
  if (response.getResponseCode() === 200) {
    return response.getBlob();
  }
  
  throw new Error('Gagal export Word ke PDF: HTTP ' + response.getResponseCode());
}

// Export Google Docs ke PDF
function exportDocAsPdf(docId) {
  var exportUrl = 'https://docs.google.com/document/d/' + docId + '/export?format=pdf';
  
  var response = UrlFetchApp.fetch(exportUrl, {
    headers: { 'Authorization': 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true
  });
  
  if (response.getResponseCode() !== 200) {
    throw new Error('Gagal export doc: HTTP ' + response.getResponseCode());
  }
  
  return response.getBlob();
}
