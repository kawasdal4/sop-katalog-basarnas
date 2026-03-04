const fs = require('fs');
const { marked } = require('marked');
const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  try {
    console.log('Membaca file Markdown...');
    const md = fs.readFileSync(path.join(__dirname, 'public', 'User_Manual_E-Katalog_SOP.md'), 'utf8');

    console.log('Parsing Markdown ke HTML...');
    let htmlContent = marked.parse(md);

    // Inject custom CSS styling
    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            
            body { 
              font-family: 'Inter', Arial, sans-serif; 
              padding: 0;
              margin: 0;
              color: #334155; 
              line-height: 1.6;
              font-size: 14px;
            }
            h1 { color: #0f172a; font-size: 28px; margin-top: 24px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
            h2 { color: #1e293b; font-size: 22px; margin-top: 20px; }
            h3 { color: #334155; font-size: 18px; margin-top: 16px; }
            p { margin-bottom: 12px; }
            ul, ol { margin-bottom: 16px; padding-left: 24px; }
            li { margin-bottom: 6px; }
            code { 
              background: #f1f5f9; 
              padding: 2px 6px; 
              border-radius: 4px; 
              font-family: monospace;
              font-size: 13px;
              color: #e11d48;
            }
            a { color: #2563eb; text-decoration: none; }
            strong { color: #0f172a; }
            .page-break { page-break-after: always; }
          </style>
        </head>
        <body>
          <div style="max-width: 800px; margin: 0 auto;">
            ${htmlContent}
          </div>
        </body>
      </html>
    `;

    console.log('Menjalankan Puppeteer...');
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-web-security']
    });

    const page = await browser.newPage();

    await page.setContent(fullHtml, { waitUntil: ['networkidle0', 'load', 'domcontentloaded'] });

    console.log('Merender PDF...');
    await page.pdf({
      path: path.join(__dirname, 'public', 'User_Manual_E-Katalog_SOP.pdf'),
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: '<div style="font-size: 10px; width: 100%; text-align: center; color: #94a3b8;">Halaman <span class="pageNumber"></span> dari <span class="totalPages"></span></div>'
    });

    await browser.close();
    console.log('✅ SUKSES: PDF User Manual berhasil digenerate di folder public!');
  } catch (err) {
    console.error('❌ GAGAL:', err);
    process.exit(1);
  }
})();
