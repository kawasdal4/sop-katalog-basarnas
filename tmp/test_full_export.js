/**
 * Full reproduction of the export route logic.
 * Run this to generate a local Excel file and verify it opens.
 */
const ExcelJS = require('exceljs');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const COLORS = {
    orange: 'FFf97316',
    yellow: 'FFeab308',
    green: 'FF22c55e',
    red: 'FFef4444',
    blue: 'FF3b82f6',
    cyan: 'FF06b6d4',
    purple: 'FF8b5cf6',
    slate: 'FF64748b'
};

async function main() {
    console.log('Fetching data...');

    const sopFiles = await prisma.sopFile.findMany({
        where: { OR: [{ isPublicSubmission: false }, { verificationStatus: 'DISETUJUI' }] },
        include: { user: { select: { name: true } } },
        orderBy: { uploadedAt: 'desc' }
    });

    console.log(`Found ${sopFiles.length} SOP files`);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'BASARNAS SOP Katalog';
    workbook.created = new Date();

    // === Simple SHEET 1: Data SOP ===
    const dataSheet = workbook.addWorksheet('Data SOP');
    dataSheet.columns = [
        { header: 'No', key: 'no', width: 5 },
        { header: 'Judul', key: 'judul', width: 50 },
        { header: 'Tahun', key: 'tahun', width: 10 },
        { header: 'Kategori', key: 'kategori', width: 20 },
        { header: 'Jenis', key: 'jenis', width: 10 },
        { header: 'Lingkup', key: 'lingkup', width: 15 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Diupload Oleh', key: 'uploadedBy', width: 25 },
        { header: 'Tanggal Upload', key: 'uploadedAt', width: 18 }
    ];

    // Style header
    const headerRow = dataSheet.getRow(1);
    headerRow.height = 30;
    headerRow.eachCell((cell) => {
        cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.orange } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // Add data rows
    sopFiles.forEach((sop, index) => {
        dataSheet.addRow({
            no: index + 1,
            judul: sop.judul,
            tahun: sop.tahun,
            kategori: sop.kategori,
            jenis: sop.jenis,
            lingkup: sop.lingkup || 'N/A',
            status: sop.status,
            uploadedBy: sop.user?.name || 'N/A',
            uploadedAt: sop.uploadedAt.toLocaleDateString('id-ID')
        });
    });

    // Try logo (wrap in try/catch to not crash the export)
    try {
        const logoPath = path.join(process.cwd(), 'public', 'logo-sar.png');
        if (fs.existsSync(logoPath)) {
            const logoBuffer = fs.readFileSync(logoPath);
            const logoId = workbook.addImage({ buffer: logoBuffer, extension: 'png' });
            dataSheet.addImage(logoId, { tl: { col: 0, row: 0 }, br: { col: 2, row: 3 } });
            console.log('Logo added successfully');
        }
    } catch (e) {
        console.error('Logo error (non-fatal):', e.message);
    }

    const outPath = path.join(process.cwd(), 'tmp', 'local_test.xlsx');
    await workbook.xlsx.writeFile(outPath);

    const stat = fs.statSync(outPath);
    console.log(`✅ File written: ${outPath} (${stat.size} bytes)`);

    // Verify magic bytes
    const buf = fs.readFileSync(outPath);
    const hex = buf.slice(0, 4).toString('hex');
    console.log(`Header hex: ${hex} (should be 504b0304 for valid XLSX)`);

    if (hex === '504b0304' || hex.startsWith('504b')) {
        console.log('✅ File is valid XLSX/ZIP format');
    } else {
        console.error('❌ CORRUPTED: file does not start with PK header!');
        console.log('First 50 bytes as string:', buf.slice(0, 50).toString());
    }

    await prisma.$disconnect();
}

main().catch(async (e) => {
    console.error('FATAL ERROR:', e);
    await prisma.$disconnect();
});
