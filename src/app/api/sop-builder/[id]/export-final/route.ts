import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { uploadToR2 } from '@/lib/r2-storage'
import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'
import path from 'path'
import os from 'os'
import fs from 'fs'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import sharp from 'sharp'
import { getStepSnapshot, mergeStepsWithSnapshot } from '@/lib/sop-flowchart-snapshot'
import { headers } from 'next/headers'

export const maxDuration = 300;
export const dynamic = 'force-dynamic';
const OFFICIAL_LOGO_URL = 'https://pub-a6302a3a22854799b35a15cd40f9c728.r2.dev/Logo_Basarnas.png'

// Helper for job tracking in DB
async function setJobStatus(sopId: string, status: string, data: any = {}) {
    const { result, error } = data;
    await (db as any).exportJob.upsert({
        where: { sopId },
        update: {
            status,
            result: result ? JSON.stringify(result) : undefined,
            error: error || null,
            updatedAt: new Date()
        },
        create: {
            sopId,
            status,
            result: result ? JSON.stringify(result) : undefined,
            error: error || null
        }
    });
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: sopId } = await params
    const body = await request.json().catch(() => ({}));
    const { flowchartImage, breakpoints } = body;

    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const baseUrl = `${protocol}://${host}`

    console.log(`[EXPORT-POST] Request for SOP: ${sopId} (Hybrid: ${!!flowchartImage})`);

    // Check for existing job
    const existingJob: any = await (db as any).exportJob.findUnique({
        where: { sopId }
    });

    if (existingJob && existingJob.status === 'processing') {
        const lastUpdate = new Date(existingJob.updatedAt).getTime();
        const now = Date.now();
        const diffMinutes = (now - lastUpdate) / (1000 * 60);

        if (diffMinutes < 5) {
            console.log(`[EXPORT-POST] Job already processing (${Math.round(diffMinutes)}m ago), returning statusUrl.`);
            return NextResponse.json({
                success: true,
                message: 'Export is already processing',
                statusUrl: `/api/sop-builder/${sopId}/export-status`
            });
        }
    }

    // Mark as processing immediately
    await setJobStatus(sopId, 'processing')

    // Await the export process. With maxDuration=300 on Vercel, this is now safe
    // and prevents the function from terminating before background tasks finish.
    await processExport(sopId, baseUrl, flowchartImage, breakpoints).catch(async err => {
        console.error('❌ Export Error:', err)
        await setJobStatus(sopId, 'failed', {
            error: err instanceof Error ? err.message : 'Unknown error'
        });
    });

    return NextResponse.json({
        success: true,
        message: 'Export completed',
        statusUrl: `/api/sop-builder/${sopId}/export-status`
    })
}


async function processExport(sopId: string, baseUrl: string, clientImage?: string, clientBreakpoints?: any) {
    let browser: any = null;

    try {
        console.log(`🚀 [Background] Starting Export Final SOP ID: ${sopId} (Hybrid: ${!!clientImage})`)

        // 1. DATA FETCH
        const [sop, logoBase64, htmlSource, snapshot] = await Promise.all([
            db.sopPembuatan.findUnique({
                where: { id: sopId },
                include: {
                    langkahLangkah: { orderBy: { order: 'asc' } },
                    sopFlowchart: true
                }
            }),
            Promise.resolve(OFFICIAL_LOGO_URL),
            fs.promises.readFile(path.join(process.cwd(), 'src/lib/pdf-template.html'), 'utf8'),
            getStepSnapshot(sopId)
        ]);

        if (!sop) {
            await setJobStatus(sopId, 'failed', { error: 'SOP tidak ditemukan' })
            return
        }

        // --- SNAPSHOT MERGE ---
        if (Array.isArray(snapshot) && snapshot.length > 0) {
            sop.langkahLangkah = mergeStepsWithSnapshot(sop.langkahLangkah || [], snapshot);
        }

        // 2. Format Data & Steps
        const printDate = format(new Date(), 'dd MMMM yyyy', { locale: localeId })
        const effectiveDate = sop.tanggalEfektif ? format(new Date(sop.tanggalEfektif), 'dd MMMM yyyy', { locale: localeId }) : '-'

        let stepsHtml = ''
        sop.langkahLangkah.forEach((step: any, idx: number) => {
            let pelaksanaText = '-';
            try {
                const pel = typeof step.pelaksana === 'string' && step.pelaksana.startsWith('[')
                    ? JSON.parse(step.pelaksana)
                    : step.pelaksana;
                pelaksanaText = Array.isArray(pel) ? pel.join(', ') : (pel || '-');
            } catch (e) {
                pelaksanaText = step.pelaksana || '-';
            }

            stepsHtml += `
                <tr>
                    <td class="col-no">${step.order || idx + 1}</td>
                    <td class="col-aktivitas">${step.aktivitas}</td>
                    <td class="col-pelaksana">${pelaksanaText}</td>
                    <td class="col-mutu">${step.mutuBakuKelengkapan || '-'}</td>
                    <td class="col-output">${step.mutuBakuOutput || '-'}</td>
                </tr>
            `
        })

        const formatAsList = (val: string | null) => {
            if (!val) return '-';
            try {
                const parsed = JSON.parse(val);
                if (Array.isArray(parsed)) {
                    const filtered = parsed.filter(p => p.trim() !== '');
                    if (filtered.length === 0) return '-';
                    return `<div class="list-container">${filtered.map((item, i) => `
                        <div class="list-item">
                            <div class="list-num">${i + 1}.</div>
                            <div class="list-text">${item}</div>
                        </div>`).join('')}</div>`;
                }
            } catch (e) { }
            return val;
        }

        // 3. Prepare Final HTML Content
        let finalHtml = htmlSource
            .replace('{{LOGO_BASE64}}', logoBase64)
            .replace('{{UNIT_KERJA}}', (sop.unitKerja || 'DIREKTORAT KESIAPSIAGAAN').toUpperCase())
            .replace('{{JUDUL_SOP}}', (sop.judul || 'DRAFT SOP').toUpperCase())
            .replace('{{NOMOR_SOP}}', sop.nomorSop || '-')
            .replace('{{TANGGAL_BUAT}}', printDate)
            .replace('{{TANGGAL_EFEKTIF}}', effectiveDate)
            .replace('{{REVISI}}', sop.revisi || '00')
            .replace('{{TOTAL_HALAMAN}}', '3')
            .replace('{{DISAHKAN_JABATAN}}', (sop.disahkanOleh || 'DIREKTUR KESIAPSIAGAAN').toUpperCase())
            .replace('{{DISAHKAN_NAMA}}', 'Noer Isrodin Muchlisin, S.Pd, M.M.')
            .replace('{{DISAHKAN_NIP}}', '197212241998031002')
            .replace('{{DASAR_HUKUM}}', formatAsList(sop.dasarHukum))
            .replace('{{KUALIFIKASI}}', formatAsList(sop.kualifikasiPelaksana))
            .replace('{{KETERKAITAN}}', formatAsList(sop.keterkaitan))
            .replace('{{PERALATAN}}', formatAsList(sop.peralatanPerlengkapan))
            .replace('{{PERINGATAN}}', formatAsList(sop.peringatan))
            .replace('{{PENCATATAN}}', formatAsList(sop.pencatatanPendataan))
            .replace('{{STEPS_HTML}}', stepsHtml)

        // 4. GET FLOWCHART IMAGE & BREAKPOINTS
        let imgBuffer: Buffer;
        let allBreakpoints: any;

        const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

        if (clientImage && clientBreakpoints) {
            console.log('🖼️ [Hybrid] Using client-provided flowchart image and breakpoints');
            imgBuffer = Buffer.from(clientImage.split(',')[1], 'base64');
            allBreakpoints = clientBreakpoints;
        } else {
            console.log('🚀 [Legacy] Launching Puppeteer for flowchart capture...');
            browser = await puppeteer.launch({
                args: isProd ? chromium.args : ['--no-sandbox', '--disable-setuid-sandbox'],
                defaultViewport: isProd ? chromium.defaultViewport : { width: 1600, height: 1200 },
                executablePath: isProd ? await chromium.executablePath() : undefined,
                channel: isProd ? undefined : 'chrome',
                headless: (isProd ? chromium.headless : true) as any,
            });

            const page = await browser.newPage();
            await page.setViewport({ width: 1600, height: 1200, deviceScaleFactor: 2 });
            await page.evaluateOnNewDocument((data: any) => { (window as any).PRELOADED_SOP_DATA = data; }, JSON.parse(JSON.stringify(sop)));

            const printUrl = `${baseUrl}/print-flowchart/${sopId}?export=1&t=${Date.now()}`;
            await page.goto(printUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
            try {
                await page.waitForFunction('window.flowchartReady === true', { timeout: 15000, polling: 200 });
            } catch { console.warn('⚠️ flowchartReady timeout'); }

            const flowchartEl = await page.$('#flowchart-container');
            if (!flowchartEl) throw new Error('Flowchart container not found');

            const boundingBox = await flowchartEl.boundingBox();
            let scaleFactor = 2;
            if (boundingBox) {
                if (boundingBox.height > 8000) scaleFactor = 1.5;
                await page.setViewport({ width: 1600, height: Math.ceil(boundingBox.height) + 100, deviceScaleFactor: scaleFactor });
            }

            imgBuffer = await flowchartEl.screenshot({ type: 'jpeg', quality: 85 }) as Buffer;

            allBreakpoints = await page.evaluate((scale) => {
                const nodes = (window as any).__FLOWCHART_NODES__ || [];
                return {
                    bottoms: nodes.filter((n: any) => n.data?.connectorType === 'page-break-bottom').map((n: any) => ((n.position.y + (n.measured?.height || 60)) + 60) * scale).sort((a: any, b: any) => a - b),
                    tops: nodes.filter((n: any) => n.data?.connectorType === 'page-break-top').map((n: any) => (n.position.y - 80) * scale).sort((a: any, b: any) => a - b)
                };
            }, scaleFactor);

            await page.close();
        }

        // --- STEP B: SLICE IMAGE ---
        await setJobStatus(sopId, 'slicing')
        console.log('✂️ [Step B] Slicing images efficiently...');

        const sharpInstance = sharp(imgBuffer).flatten({ background: '#ffffff' });
        const metadata = await sharpInstance.metadata();
        const fullWidth = metadata.width || 1200;
        const fullHeight = metadata.height || 1000;

        const { bottoms, tops } = allBreakpoints;
        const segments: { top: number, bottom: number }[] = [];
        const firstBottom = (bottoms && bottoms.length > 0) ? bottoms[0] : fullHeight;
        segments.push({ top: 0, bottom: firstBottom });

        if (tops && bottoms) {
            for (let i = 0; i < tops.length; i++) {
                segments.push({ top: Math.max(0, tops[i]), bottom: bottoms[i + 1] || fullHeight });
            }
        }

        const slicePromises = segments.map(async (seg, i) => {
            const extractHeight = Math.min(seg.bottom - seg.top, fullHeight - seg.top);
            if (extractHeight <= 0) return null;
            const slicePath = path.join(os.tmpdir(), `sop-${sopId}-slice-${i}.jpg`);

            // USE CLONE TO AVOID RE-DECODING THE FULL BUFFER
            await sharpInstance.clone()
                .extract({
                    left: 0,
                    top: Math.floor(seg.top),
                    width: Math.floor(fullWidth),
                    height: Math.floor(extractHeight)
                })
                .toFormat('jpeg', { quality: 75, force: true })
                .toFile(slicePath);
            return { index: i, path: slicePath };
        });

        const slicedResults = (await Promise.all(slicePromises)).filter(Boolean) as { index: number, path: string }[];
        slicedResults.sort((a, b) => a.index - b.index);

        const flowchartPagesHtml = slicedResults.map((item, idx) => `
            <div class="page" id="page-flowchart-${idx + 1}" style="padding: 5mm; display: flex; flex-direction: column; height: 100%;">
                <div class="header-simple">
                    <img src="${logoBase64}" alt="Logo" class="logo-small">
                    <div class="title-small">FLOWCHART SOP: ${(sop.judul || 'BASARNAS').toUpperCase()} (Hal. ${idx + 1})</div>
                </div>
                <div class="flow-container-smart" style="flex: 1; display: flex; align-items: flex-start; justify-content: center; border: none; overflow: hidden; padding-top: 10px;">
                    <img src="file://${item.path}" style="width: 100%; height: auto; object-fit: contain; object-position: top center;" alt="Flowchart Page ${idx + 1}">
                </div>
                <div class="footer-simple" style="margin-top: auto;">BADAN NASIONAL PENCARIAN DAN PERTOLONGAN</div>
            </div>
        `).join('');

        finalHtml = finalHtml.replace('{{FLOWCHART_PAGES_HTML}}', flowchartPagesHtml)

        // --- STEP C: GENERATE PDF ---
        await setJobStatus(sopId, 'generating_pdf')
        console.log('📄 [Step C] Generating PDF...');

        // LAZY INIT BROWSER if not already launched (Hybrid Mode fix)
        if (!browser) {
            console.log('🚀 [Step C] Launching browser for PDF generation...');
            browser = await puppeteer.launch({
                args: isProd ? chromium.args : ['--no-sandbox', '--disable-setuid-sandbox'],
                defaultViewport: isProd ? chromium.defaultViewport : { width: 1600, height: 1200 },
                executablePath: isProd ? await chromium.executablePath() : undefined,
                channel: isProd ? undefined : 'chrome',
                headless: (isProd ? chromium.headless : true) as any,
            });
        }

        const pdfPage = await browser.newPage();

        // OPTIMIZATION: Use temp file instead of setContent (much faster for large HTML)
        const tempFilePath = path.join(os.tmpdir(), `sop-export-${sopId}.html`);
        await fs.promises.writeFile(tempFilePath, finalHtml, 'utf8');
        console.log(`📝 [Step C] HTML written to ${tempFilePath}`);

        await pdfPage.goto(`file://${tempFilePath}`, { waitUntil: 'load', timeout: 60000 });

        await pdfPage.addStyleTag({
            content: `@page { size: Legal landscape; margin: 0; } body { margin: 0; padding: 0; }`
        });

        const pdfBuffer = await pdfPage.pdf({
            format: 'Legal',
            landscape: true,
            printBackground: true,
            displayHeaderFooter: false,
            margin: { top: 0, right: 0, bottom: 0, left: 0 }
        });

        // Cleanup temp files
        fs.promises.unlink(tempFilePath).catch(() => { });
        if (slicedResults && slicedResults.length > 0) {
            slicedResults.forEach(item => {
                if (item.path) fs.promises.unlink(item.path).catch(() => { });
            });
        }

        // Upload
        const sanitizeFileName = (name: string) => name.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim().slice(0, 50)
        const finalFileName = `sop-${sanitizeFileName(sop.judul)}-final-${sopId.slice(0, 6)}.pdf`

        await setJobStatus(sopId, 'uploading')
        console.log('☁️ [Step D] Uploading to R2...');
        const r2Result = await uploadToR2(Buffer.from(pdfBuffer), finalFileName, 'application/pdf', {
            folder: 'sop-builder-finals'
        });

        await db.sopPembuatan.update({
            where: { id: sopId },
            data: { combinedPdfPath: r2Result.key, status: 'FINAL' }
        });

        await setJobStatus(sopId, 'completed', { result: { finalPdfPath: r2Result.key } });

        console.log('✅ Export Completed Successfully');

        // Backup Drive (Optional/Background)
        import('@/lib/google-drive').then(async (gd) => {
            if (gd.isGoogleDriveConfigured()) {
                const driveResult = await gd.uploadFileToDriveFolder(
                    Buffer.from(pdfBuffer),
                    finalFileName,
                    'application/pdf'
                )
                await db.fileSync.create({
                    data: {
                        filename: finalFileName,
                        mimeType: 'application/pdf',
                        fileSize: pdfBuffer.length,
                        r2Key: r2Result.key,
                        driveFileId: driveResult.id,
                        source: 'both',
                        syncStatus: 'synced',
                        lastSyncedAt: new Date(),
                    }
                }).catch(() => { })
            }
        }).catch(() => { })

    } catch (error) {
        console.error('❌ CRITICAL: Background Export Error:', error)
        await setJobStatus(sopId, 'failed', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    } finally {
        if (browser) {
            await browser.close().catch(() => { });
        }
    }
}
