import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

export async function GET(req: NextRequest) {
    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Template Import SOP');

        // --- 1. CONFIGURE COLUMNS ---
        // Standar 6 Pelaksana Basarnas:
        // 1. Pelapor
        // 2. Petugas Komunikasi
        // 3. Asisten Kagahar
        // 4. Kagahar
        // 5. Pengawas Siaga
        // 6. Kantor SAR
        worksheet.columns = [
            { header: 'No', key: 'no', width: 5 },
            { header: 'Aktivitas', key: 'aktivitas', width: 50 },
            { header: 'Pelapor', key: 'lane0', width: 15 },
            { header: 'Petugas Komunikasi', key: 'lane1', width: 18 },
            { header: 'Asisten Kagahar', key: 'lane2', width: 18 },
            { header: 'Kagahar', key: 'lane3', width: 12 },
            { header: 'Pengawas Siaga', key: 'lane4', width: 15 },
            { header: 'Kantor SAR', key: 'lane5', width: 15 },
            { header: 'Kelengkapan', key: 'mutu0', width: 25 },
            { header: 'Waktu', key: 'mutu1', width: 15 },
            { header: 'Output', key: 'mutu2', width: 25 },
            { header: 'Lanjut ke No. (YA)', key: 'nextYes', width: 18 },
            { header: 'Lanjut ke No. (TIDAK)', key: 'nextNo', width: 20 },
            { header: 'Keterangan', key: 'keterangan', width: 25 },
        ];

        // --- 2. STYLE HEADERS ---
        const headerRow = worksheet.getRow(1);
        headerRow.height = 40;
        headerRow.eachCell((cell, colNumber) => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Arial' };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }; // Dark Slate
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'medium' },
                right: { style: 'thin' },
            };

            // Add Notes to Decision Routing Columns
            if (colNumber === 12) { // nextYes
                cell.note = {
                    texts: [
                        { font: { bold: true }, text: 'Jalur YA (Opsional):\n' },
                        { text: 'Isi dengan Nomor Langkah tujuan jika kondisi terpenuhi.\nJika kosong, akan lanjut ke langkah berikutnya (n+1).' }
                    ]
                };
            }
            if (colNumber === 13) { // nextNo
                cell.note = {
                    texts: [
                        { font: { bold: true }, text: 'Jalur TIDAK (Wajib Decision):\n' },
                        { text: 'Isi dengan Nomor Langkah tujuan jika kondisi TIDAK terpenuhi.\nHanya berlaku untuk langkah DECISION.' }
                    ]
                };
            }
        });

        // --- 3. ADD 10 STEPS EXAMPLE DATA ---
        const exampleData = [
            // LANGKAH 1: START
            {
                no: 1,
                aktivitas: 'Mulai',
                lane0: 'START', // Pelapor
                mutu0: '-',
                mutu1: '-',
                mutu2: '-',
                keterangan: 'Simbol START (Awal)'
            },
            // LANGKAH 2: PROSES
            {
                no: 2,
                aktivitas: 'Menerima laporan awal kejadian kecelakaan kapal',
                lane1: '✔', // Petugas Komunikasi
                mutu0: 'Telepon / Radio',
                mutu1: '5 Menit',
                mutu2: 'Informasi Awal',
                keterangan: 'Simbol PROSES'
            },
            // LANGKAH 3: INPUT/OUTPUT (IO)
            {
                no: 3,
                aktivitas: 'Mencatat data laporan ke dalam Log Harian Operasi',
                lane1: 'IO', // Petugas Komunikasi
                mutu0: 'Buku Log / Komputer',
                mutu1: '10 Menit',
                mutu2: 'Data Log Tersimpan',
                keterangan: 'Simbol INPUT/OUTPUT (Jajar Genjang)'
            },
            // LANGKAH 4: PROSES
            {
                no: 4,
                aktivitas: 'Melaporkan informasi kejadian kepada Asisten Kagahar',
                lane2: '✔', // Asisten Kagahar
                mutu0: 'Laporan Lisan',
                mutu1: '5 Menit',
                mutu2: 'Arahan Awal',
                keterangan: 'Simbol PROSES'
            },
            // LANGKAH 5: DECISION (KEPUTUSAN)
            {
                no: 5,
                aktivitas: 'Analisis: Apakah informasi valid dan membutuhkan Operasi SAR?',
                lane3: 'DECISION', // Kagahar
                mutu0: 'Data Pendukung',
                mutu1: '15 Menit',
                mutu2: 'Keputusan',
                nextYes: 6,
                nextNo: 10,
                keterangan: 'Cabang Logika'
            },
            // LANGKAH 6: PROSES (YES PATH)
            {
                no: 6,
                aktivitas: 'Menetapkan Status Keadaan Darurat (SMC) & Rencana Operasi',
                lane3: '✔', // Kagahar
                mutu0: 'Dokumen Renops',
                mutu1: '30 Menit',
                mutu2: 'SMC Ditunjuk',
                keterangan: 'Jalur YA (Valid)'
            },
            // LANGKAH 7: INPUT/OUTPUT
            {
                no: 7,
                aktivitas: 'Mengirimkan Berita SAR (SITREP) Awal',
                lane4: 'IO', // Pengawas Siaga
                mutu0: 'Email / Fax',
                mutu1: '10 Menit',
                mutu2: 'SITREP Terkirim',
                keterangan: 'Simbol INPUT/OUTPUT'
            },
            // LANGKAH 8: PROSES
            {
                no: 8,
                aktivitas: 'Pengerahan Tim Rescue dan Alut ke Lokasi',
                lane5: '✔', // Kantor SAR
                mutu0: 'Tim Rescue & Alut',
                mutu1: '60 Menit',
                mutu2: 'Tim Berangkat',
                keterangan: 'Simbol PROSES'
            },
            // LANGKAH 9: CONNECTOR (PINDAH HALAMAN)
            {
                no: 9,
                aktivitas: 'Melanjutkan ke Prosedur Pelaksanaan Operasi (Halaman 2)',
                lane5: 'CONNECTOR', // Kantor SAR
                mutu0: '-',
                mutu1: '-',
                mutu2: '-',
                keterangan: 'Simbol CONNECTOR (Bulat)'
            },
            // LANGKAH 10: END (SELESAI / NO PATH)
            {
                no: 10,
                aktivitas: 'Selesai / Laporan Tidak Valid (Arsipkan)',
                lane3: 'END', // Kagahar
                mutu0: 'Arsip Laporan',
                mutu1: '-',
                mutu2: 'Proses Berakhir',
                keterangan: 'Simbol END (Akhir)'
            }
        ];

        exampleData.forEach(data => worksheet.addRow(data));

        // --- 4. STYLE THE DATA ROWS ---
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) {
                row.height = 30; 
                row.eachCell((cell, colNumber) => {
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFCBD5E1' } }, 
                        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                        right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                    };
                    
                    // Font style
                    cell.font = { name: 'Arial', size: 10 };

                    // Center align checkmarks and short text
                    if (colNumber === 1 || (colNumber >= 3 && colNumber <= 8) || colNumber >= 10) {
                        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                    } else {
                        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
                    }

                    // Highlight Special Keywords
                    const val = cell.value?.toString().toUpperCase();
                    if (['START', 'END'].includes(val || '')) {
                        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } }; // Red-600
                    } else if (val === 'DECISION') {
                        cell.font = { bold: true, color: { argb: 'FF000000' } };
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCD34D' } }; // Amber-300
                    } else if (val === 'IO') {
                        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } }; // Blue-600
                    } else if (val === 'CONNECTOR') {
                        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9333EA' } }; // Purple-600
                    } else if (val === '✔') {
                         cell.font = { bold: true, color: { argb: 'FF16A34A' }, size: 12 }; // Green Check
                    }

                    // Background color for Decision Routing Columns
                    if (colNumber === 12) { // nextYes
                         cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } }; // Light Green
                    } else if (colNumber === 13) { // nextNo
                         cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }; // Light Red
                    }
                });
            }
        });

        // --- 5. GENERATE BUFFER & RESPOND ---
        const buffer = await workbook.xlsx.writeBuffer();

        return new NextResponse(new Uint8Array(buffer), {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': 'attachment; filename=Template_SOP_Basarnas_Lengkap.xlsx',
            },
        });

    } catch (error: any) {
        console.error('Error generating template:', error);
        return NextResponse.json({ error: 'Gagal membuat template' }, { status: 500 });
    }
}
