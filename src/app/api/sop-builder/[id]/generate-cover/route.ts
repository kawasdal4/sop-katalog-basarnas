import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateRole } from '@/lib/auth-utils'
import ExcelJS from 'exceljs'
import { uploadToR2 } from '@/lib/r2-storage'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import fs from 'fs/promises'
import path from 'path'

const TEMPLATE_PATH = path.join(process.cwd(), 'src', 'lib', 'templates', 'template-cover.xlsx')

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        console.log('--- START COVER GENERATION ---')
        const { authenticated } = await validateRole(['ADMIN', 'DEVELOPER', 'STAF'])
        if (!authenticated) {
            console.log('❌ Unauthorized access attempt')
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id: sopId } = await params
        console.log('🔍 SOP ID:', sopId)

        const sop = await db.sopPembuatan.findUnique({
            where: { id: sopId }
        })

        if (!sop) {
            console.log('❌ SOP not found')
            return NextResponse.json({ error: 'SOP tidak ditemukan' }, { status: 404 })
        }

        // 1. Load template from local file
        console.log('📂 Reading local template:', TEMPLATE_PATH)
        let buffer;
        try {
            buffer = await fs.readFile(TEMPLATE_PATH)
        } catch (fsErr: any) {
            console.error('❌ File Read Error:', fsErr)
            throw new Error(`Gagal membaca file template: ${fsErr.message}`)
        }

        // 2. Load into ExcelJS
        console.log('🔄 Loading workbook into ExcelJS...')
        const workbook = new ExcelJS.Workbook()
        try {
            await workbook.xlsx.load(buffer as any)
        } catch (excelErr: any) {
            console.error('❌ ExcelJS Load Error:', excelErr)
            throw new Error(`Gagal memuat template Excel: ${excelErr.message}`)
        }

        // Asumsi template ada di sheet pertama
        const worksheet = workbook.worksheets[0]
        if (!worksheet) {
            throw new Error('Worksheet tidak ditemukan di dalam template')
        }

        // Helper to format JSON strings or arrays as a safe list
        const formatDataField = (val: any) => {
            if (!val) return '-';
            try {
                const parsed = JSON.parse(val);
                if (Array.isArray(parsed)) {
                    return parsed.filter(Boolean).map((item, i) => `${i + 1}. ${item}`).join('\n');
                }
                return val;
            } catch (e) {
                return val;
            }
        }

        const safeFormatDate = (date: any, formatStr: string) => {
            if (!date) return '-';
            try {
                return format(new Date(date), formatStr, { locale: id });
            } catch (e) {
                console.error('❌ Date Format Error:', e);
                return '-';
            }
        }

        // --- HEADER SECTION (Right Table) ---
        // H2: Nomor SOP & Tahun
        const cellH2 = worksheet.getCell('H2')
        const tahunSop = sop.tanggalEfektif ? format(new Date(sop.tanggalEfektif), 'yyyy') : format(new Date(), 'yyyy')
        cellH2.value = `${sop.nomorSop || '...'} Tahun ${tahunSop}`

        // H3: Tanggal Pembuatan
        const cellH3 = worksheet.getCell('H3')
        cellH3.value = safeFormatDate(sop.createdAt, 'MMMM yyyy')

        // H4: Tanggal Revisi
        const cellH4 = worksheet.getCell('H4')
        cellH4.value = sop.revisi || '-'

        // H5: Tanggal Efektif
        const cellH5 = worksheet.getCell('H5')
        cellH5.value = safeFormatDate(sop.tanggalEfektif, 'MMMM yyyy')

        // I6: Disahkan Oleh (Jabatan)
        const cellI6 = worksheet.getCell('I6')
        cellI6.value = (sop.disahkanOleh || 'DIREKTUR KESIAPSIAGAAN').toUpperCase()

        // I8: Nama SOP
        const cellI8 = worksheet.getCell('I8')
        cellI8.value = (sop.judul || '-').toUpperCase()

        // --- CONTENT SECTION ---
        const fillRichText = (cellId: string, label: string, data: any) => {
            const cell = worksheet.getCell(cellId);
            const formattedData = formatDataField(data);
            cell.value = {
                richText: [
                    { font: { bold: true }, text: `${label.toUpperCase()} :\n` },
                    { text: formattedData }
                ]
            };
            cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
        }

        fillRichText('A10', 'DASAR HUKUM', sop.dasarHukum);
        fillRichText('H10', 'KUALIFIKASI PELAKSANA', sop.kualifikasiPelaksana);
        fillRichText('A19', 'KETERKAITAN', sop.keterkaitan);
        fillRichText('H19', 'PERALATAN / PERLENGKAPAN', sop.peralatanPerlengkapan);
        fillRichText('A27', 'PERINGATAN', sop.peringatan);
        fillRichText('H27', 'PENCATATAN DAN PENDAFTARAN', sop.pencatatanPendataan);

        // 4. Save to Buffer
        console.log('💾 Generating buffer...')

        // --- ADD OFFICIAL LOGO TO EXCEL ---
        try {
            const logoPath = path.join(process.cwd(), 'public', 'logo-basarnas-official.png');
            const logoBuffer = await fs.readFile(logoPath);
            const logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
            const logoId = workbook.addImage({
                base64: logoBase64,
                extension: 'png',
            });

            // Positioning for Logo Basarnas (Top Left area but centered in its space)
            // Range A1:G8 is usually where the logo belongs
            worksheet.addImage(logoId, {
                tl: { col: 1.5, row: 0.5 },
                ext: { width: 120, height: 120 },
                editAs: 'oneCell'
            });
            console.log('✅ Official Logo added to Excel');
        } catch (logoErr) {
            console.warn('⚠️ Gagal menambahkan logo ke Excel:', logoErr);
        }

        const finalBuffer = await workbook.xlsx.writeBuffer()
        const finalBufferNode = Buffer.from(finalBuffer)

        // 5. Upload to R2
        const sanitizeFileName = (name: string) => name.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim().slice(0, 50)
        const fileName = `cover-${sanitizeFileName(sop.judul)}-${sopId.slice(0, 6)}.xlsx`

        console.log(`📤 Uploading to R2: ${fileName}`)
        try {
            const r2Result = await uploadToR2(finalBufferNode, fileName, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', {
                folder: 'sop-builder-covers'
            })

            // 6. Update Database
            await db.sopPembuatan.update({
                where: { id: sopId },
                data: { generatedCoverPath: r2Result.key }
            })

            console.log('✅ Cover generation success!')
            return NextResponse.json({
                success: true,
                data: {
                    coverPath: r2Result.key
                }
            })
        } catch (r2Err: any) {
            console.error('❌ R2 Upload error:', r2Err)
            throw new Error(`Gagal mengupload cover ke cloud storage: ${r2Err.message}`)
        }

    } catch (error: any) {
        console.error('❌ FINAL Generate SOP Cover error:', error)
        // Return the detailed error message in the "error" field so it shows in the toast
        return NextResponse.json({
            error: error.message || 'Terjadi kesalahan sistem',
            details: error.stack
        }, { status: 500 })
    }
}
