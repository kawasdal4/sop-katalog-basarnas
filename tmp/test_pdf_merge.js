const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const fs = require('fs');

async function testPdfMerge() {
    try {
        console.log('1. Creating Fallback Cover PDF...');
        const coverDoc = await PDFDocument.create();
        const page1 = coverDoc.addPage([595.28, 841.89]);
        const fontBold = await coverDoc.embedFont(StandardFonts.HelveticaBold);
        page1.drawText('Test Cover SOP', { x: 50, y: 700, size: 24, font: fontBold });
        const coverBytes = await coverDoc.save();
        const coverBuffer = Buffer.from(coverBytes);

        console.log('2. Creating Content PDF...');
        const contentDoc = await PDFDocument.create();
        const page2 = contentDoc.addPage([841.89, 595.28]); // Landscape
        page2.drawText('Test Content Flowchart', { x: 50, y: 500, size: 14, font: fontBold });
        const contentBytes = await contentDoc.save();
        const contentBuffer = Buffer.from(contentBytes);

        console.log('3. Merging PDFs...');
        const finalDoc = await PDFDocument.create();

        // Merge Cover
        const loadedCover = await PDFDocument.load(coverBuffer);
        const copiedCoverPages = await finalDoc.copyPages(loadedCover, loadedCover.getPageIndices());
        copiedCoverPages.forEach(p => finalDoc.addPage(p));

        // Merge Content
        const loadedContent = await PDFDocument.load(contentBuffer);
        const copiedContentPages = await finalDoc.copyPages(loadedContent, loadedContent.getPageIndices());
        copiedContentPages.forEach(p => finalDoc.addPage(p));

        const finalBytes = await finalDoc.save();
        fs.writeFileSync('tmp/test_merged.pdf', finalBytes);
        console.log('✅ PDF Merge successful. Saved to tmp/test_merged.pdf');

    } catch (err) {
        console.error('❌ PDF Merge failed:', err);
    }
}

testPdfMerge();
