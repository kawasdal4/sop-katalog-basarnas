import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

const LANES = [
    'Pelapor',
    'Petugas Komunikasi',
    'Asisten Kagahar',
    'Kagahar',
    'Pengawas Siaga',
    'Kantor SAR'
];

const getCellValue = (cell: any) => {
    if (!cell || cell.value === null || cell.value === undefined) return '';
    // Handle Excel Rich Text
    if (typeof cell.value === 'object' && Array.isArray(cell.value.richText)) {
        return cell.value.richText.map((t: any) => t.text).join('').trim();
    }
    // Handle Hyperlink or other objects
    if (typeof cell.value === 'object' && cell.value.text) {
         return cell.value.text.trim();
    }
    return cell.value.toString().trim();
};

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'Tidak ada file yang diunggah' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const workbook = new ExcelJS.Workbook();
        await (workbook.xlsx as any).load(buffer);

        const worksheet = workbook.getWorksheet(1);
        if (!worksheet) {
            return NextResponse.json({ error: 'File Excel kosong atau tidak valid' }, { status: 400 });
        }

        const langkahLangkah: any[] = [];
        let detectedLanes: string[] = [];

        // Detect Lanes from Header (Row 1)
        const headerRow = worksheet.getRow(1);
        if (headerRow) {
            // Lanes are in columns 3 to 8
            for (let i = 3; i <= 8; i++) {
                const headerVal = getCellValue(headerRow.getCell(i));
                if (headerVal && headerVal.length > 0) {
                    detectedLanes.push(headerVal);
                } else {
                    // Default fallback if header is empty/missing
                    detectedLanes.push(`Pelaksana ${i - 2}`);
                }
            }
        }

        // Skip header (Row 1)
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber <= 1) return;

            const no = getCellValue(row.getCell(1));
            const aktivitas = getCellValue(row.getCell(2));

            if (!aktivitas) return; // Skip empty rows

            // Role detection from columns 3 to 8
            const pelaksana: string[] = [];
            let symbolType = 'process'; // Default symbol

            for (let i = 0; i < 6; i++) {
                const cellValue = getCellValue(row.getCell(3 + i));
                if (cellValue) {
                    const valStr = cellValue.toUpperCase();
                    
                    if (valStr.length > 0) {
                        // Use detected lane name instead of hardcoded LANES
                        pelaksana.push(detectedLanes[i]);
                        
                        // Detect symbol type based on cell content keyword
                        if (valStr.includes('START')) symbolType = 'start';
                        else if (valStr.includes('END')) symbolType = 'end';
                        else if (valStr.includes('DECISION')) symbolType = 'decision';
                        else if (valStr.includes('IO')) symbolType = 'input_output'; // Changed to match frontend expected type
                        else if (valStr.includes('CONNECTOR')) symbolType = 'connector'; // Frontend might need mapping for this
                        else if (valStr.includes('DOC')) symbolType = 'document';
                        else if (valStr.includes('PROCESS') || valStr.includes('✔') || valStr === 'V' || valStr === 'X') symbolType = 'process'; // Explicit Process Detection
                    }
                }
            }

            // Fallback: If no symbol detected in lane, check activity text
            if (symbolType === 'process') {
                const actUpper = aktivitas.toUpperCase();
                if (actUpper.startsWith('MULAI') || actUpper.startsWith('START')) symbolType = 'start';
                else if (actUpper.startsWith('SELESAI') || actUpper.startsWith('END')) symbolType = 'end';
                else if (actUpper.includes('?')) symbolType = 'decision';
            }

            langkahLangkah.push({
                order: parseInt(no?.toString() || '0') || rowNumber - 1,
                aktivitas: aktivitas,
                pelaksana: pelaksana[0] || '', // Frontend expects single string for main lane, but we store array just in case
                stepType: symbolType, // Add stepType field
                mutuBakuKelengkapan: getCellValue(row.getCell(9)),
                mutuBakuWaktu: getCellValue(row.getCell(10)),
                mutuBakuOutput: getCellValue(row.getCell(11)),
                nextStepYes: row.getCell(12).value ? parseInt(row.getCell(12).value.toString()) : undefined,
                nextStepNo: row.getCell(13).value ? parseInt(row.getCell(13).value.toString()) : undefined,
                keterangan: getCellValue(row.getCell(14)),
            });
        });

        if (langkahLangkah.length === 0) {
            return NextResponse.json({ error: 'Format file SOP tidak sesuai template atau data kosong.' }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            data: {
                langkahLangkah,
                lanes: detectedLanes // Send detected lanes back to frontend
            }
        });

    } catch (error: any) {
        console.error('Error parsing Excel:', error);
        return NextResponse.json({ error: 'Terjadi kesalahan saat membaca file Excel', details: error.message }, { status: 500 });
    }
}
