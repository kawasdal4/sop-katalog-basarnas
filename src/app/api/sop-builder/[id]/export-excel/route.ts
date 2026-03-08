import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ExcelJS from 'exceljs';
import { uploadToR2 } from '@/lib/r2-storage';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        // 1. Fetch SOP Data
        let sop;
        try {
            sop = await db.sopPembuatan.findUnique({
                where: { id },
                include: {
                    langkahLangkah: {
                        orderBy: { order: 'asc' }
                    }
                }
            });
        } catch (dbErr: any) {
            return NextResponse.json({ error: `DATABASE_ERROR: ${dbErr.message}` }, { status: 500 });
        }

        if (!sop) {
            return NextResponse.json({ error: 'SOP_NOT_FOUND' }, { status: 404 });
        }

        const lanes = sop.pelaksanaLanes ?
            (typeof sop.pelaksanaLanes === 'string' ? JSON.parse(sop.pelaksanaLanes) : sop.pelaksanaLanes)
            : ['Pelaksana'];

        // 2. Create Workbook
        let buffer;
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('SOP Template');

            // --- 3. CONFIGURE COLUMNS (Grid System) ---
            // Each lane will have 3 sub-columns (Padding, Shape, Padding)
            const columns: any[] = [
                { header: 'No', key: 'no', width: 6 },
                { header: 'Kegiatan', key: 'aktivitas', width: 45 },
            ];

            // Sub-columns for each Lane (Widened for better visibility)
            lanes.forEach((lane: string, i: number) => {
                columns.push({ header: '', key: `lane_${i}_p1`, width: 5 }); // Left Padding
                columns.push({ header: lane, key: `lane_${i}_shape`, width: 18 }); // The "Box" (Widened from 14 to 18)
                columns.push({ header: '', key: `lane_${i}_p2`, width: 10 }); // Right Padding (Widened from 4 to 10 for TIDAK labels)
            });

            columns.push(
                { header: 'Kelengkapan', key: 'mutu_kelengkapan', width: 25 },
                { header: 'Waktu', key: 'mutu_waktu', width: 15 },
                { header: 'Output', key: 'mutu_output', width: 25 },
                { header: 'Keterangan', key: 'keterangan', width: 25 }
            );

            worksheet.columns = columns;

            // --- 4. STYLE HEADERS ---
            // Group headers in Row 1, Sub-headers in Row 2

            // 1. Merge Title / Meta columns (A & B) vertically
            worksheet.mergeCells('A1:A2');
            worksheet.mergeCells('B1:B2');
            worksheet.getCell('A1').value = 'No';
            worksheet.getCell('B1').value = 'Kegiatan (Aktivitas)';

            const laneStartCol = 3;
            lanes.forEach((lane: string, i: number) => {
                const startIdx = laneStartCol + (i * 3);
                const endIdx = startIdx + 2;
                const startChar = worksheet.getColumn(startIdx).letter;
                const endChar = worksheet.getColumn(endIdx).letter;

                // Merge Row 1 & 2 for each Lane
                worksheet.mergeCells(`${startChar}1:${endChar}2`);
                const headerCell = worksheet.getCell(`${startChar}1`);
                headerCell.value = lane.toUpperCase();
                headerCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            });

            const mutuStartCol = laneStartCol + (lanes.length * 3);
            const mutuEndCol = mutuStartCol + 2;
            const mutuCharStart = worksheet.getColumn(mutuStartCol).letter;
            const mutuCharEnd = worksheet.getColumn(mutuEndCol).letter;

            // Mutu Baku Header (Merged across 3 sub-columns in Row 1)
            worksheet.mergeCells(`${mutuCharStart}1:${mutuCharEnd}1`);
            worksheet.getCell(`${mutuCharStart}1`).value = 'MUTU BAKU';

            // Mutu Baku Sub-Headers in Row 2
            worksheet.getRow(2).getCell(mutuStartCol).value = 'Kelengkapan';
            worksheet.getRow(2).getCell(mutuStartCol + 1).value = 'Waktu';
            worksheet.getRow(2).getCell(mutuStartCol + 2).value = 'Output';

            // Keterangan Header (Merged vertically)
            const ketCol = mutuEndCol + 1;
            const ketChar = worksheet.getColumn(ketCol).letter;
            worksheet.mergeCells(`${ketChar}1:${ketChar}2`);
            worksheet.getCell(`${ketChar}1`).value = 'Keterangan';

            // Global Header Styling
            [1, 2].forEach(rowNum => {
                const row = worksheet.getRow(rowNum);
                row.height = 40;
                row.eachCell((cell) => {
                    cell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } }; // Slate-700
                    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FF94A3B8' } },
                        left: { style: 'thin', color: { argb: 'FF94A3B8' } },
                        bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
                        right: { style: 'thin', color: { argb: 'FF94A3B8' } },
                    };
                });
            });

            // --- 5. DATA ROWS (Editable Shapes) ---
            sop.langkahLangkah.forEach((step, index) => {
                const rowData: any = {
                    no: step.order || index + 1,
                    aktivitas: step.aktivitas,
                    mutu_kelengkapan: step.mutuBakuKelengkapan || '-',
                    mutu_waktu: step.mutuBakuWaktu || '-',
                    mutu_output: step.mutuBakuOutput || '-',
                    keterangan: step.keterangan || '-',
                };

                const row = worksheet.addRow(rowData);
                row.height = 110;

                // Center vertical line (Connector) for all lanes except the active one
                lanes.forEach((_, i: number) => {
                    const centerCol = laneStartCol + (i * 3) + 1;
                    const cell = row.getCell(centerCol);
                    // Draw a faint vertical line in the background to separate lanes clearly
                    cell.border = {
                        left: { style: 'hair', color: { argb: 'FFE2E8F0' } },
                        right: { style: 'hair', color: { argb: 'FFE2E8F0' } }
                    };
                });

                // Style the active lane (The Shape)
                const laneIndex = lanes.indexOf(step.pelaksana);
                if (laneIndex !== -1) {
                    const baseIdx = laneStartCol + (laneIndex * 3);
                    const shapeCell = row.getCell(baseIdx + 1);
                    const pRightCell = row.getCell(baseIdx + 2); // Right padding column

                    let content = step.aktivitas;
                    let bgColor = 'FFE0F2FE'; // Blue-100 (Process)
                    let borderStyle: any = 'medium';

                    if (step.stepType === 'start' || step.stepType === 'end') {
                        bgColor = 'FFF1F5F9'; // Slate-100
                        borderStyle = 'thick';
                        content = (step.stepType === 'start' ? 'START' : 'END') + '\n' + content;
                    } else if (step.stepType === 'decision') {
                        bgColor = 'FFFEF3C7'; // Amber-100
                        borderStyle = 'medium';

                        // Explicit Labels using sub-grid
                        if (step.nextStepYes) {
                            shapeCell.value = {
                                richText: [
                                    { text: step.aktivitas + '\n', font: { bold: true, size: 12 } },
                                    { text: ' (YA) ', font: { bold: true, size: 11, color: { argb: 'FF10B981' } } },
                                    { text: '⬇', font: { bold: true, size: 14, color: { argb: 'FF10B981' } } }
                                ]
                            };
                        }

                        if (step.nextStepNo) {
                            const target = sop.langkahLangkah.find(s => s.order === step.nextStepNo);
                            pRightCell.value = {
                                richText: [
                                    { text: ' (TIDAK) ➡\n', font: { bold: true, size: 11, color: { argb: 'FFF43F5E' } } },
                                    { text: `Ke #${step.nextStepNo}`, font: { size: 10, italic: true, color: { argb: 'FFF43F5E' } } }
                                ]
                            };
                            pRightCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
                        }
                    } else {
                        // Regular Process
                        if (index < sop.langkahLangkah.length - 1) {
                            content += '\n\n⬇';
                        }
                        shapeCell.value = content;
                    }

                    if (step.stepType !== 'decision') {
                        shapeCell.value = content;
                    }

                    shapeCell.font = { bold: true, size: 12 };
                    shapeCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                    shapeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
                    shapeCell.border = {
                        top: { style: borderStyle, color: { argb: 'FF334155' } },
                        left: { style: borderStyle, color: { argb: 'FF334155' } },
                        bottom: { style: borderStyle, color: { argb: 'FF334155' } },
                        right: { style: borderStyle, color: { argb: 'FF334155' } },
                    };
                }

                // Global Column Styling
                row.eachCell((cell, colNumber) => {
                    const isShapeRegion = colNumber >= laneStartCol && colNumber < mutuStartCol;
                    if (!isShapeRegion) {
                        cell.alignment = { vertical: 'middle', horizontal: colNumber === 2 ? 'left' : 'center', wrapText: true };
                        cell.font = { size: 12 };
                        cell.border = {
                            top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                            left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                            bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                            right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                        };
                    }
                });
            });

            buffer = await workbook.xlsx.writeBuffer();
        } catch (excelErr: any) {
            return NextResponse.json({ error: `EXCEL_GENERATION_ERROR: ${excelErr.message}` }, { status: 500 });
        }

        // 6. Upload to R2
        try {
            const filename = `SOP_${sop.id}_${Date.now()}.xlsx`;
            const r2Result = await uploadToR2(
                Buffer.from(buffer),
                filename,
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                { folder: 'exports/excel' }
            );

            return NextResponse.json({
                success: true,
                data: {
                    excelUrl: r2Result.url,
                    excelPath: r2Result.key
                }
            });
        } catch (r2Err: any) {
            return NextResponse.json({ error: `R2_UPLOAD_ERROR: ${r2Err.message}` }, { status: 500 });
        }

    } catch (error: any) {
        return NextResponse.json({
            error: 'GLOBAL_EXPORT_ERROR',
            details: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
