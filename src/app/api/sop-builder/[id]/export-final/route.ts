import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { uploadToR2 } from '@/lib/r2-storage'
import puppeteer from 'puppeteer'
import path from 'path'
import fs from 'fs'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import sharp from 'sharp'
import { createJob, updateJob } from '../export-status/route'
import { getStepSnapshot, mergeStepsWithSnapshot } from '@/lib/sop-flowchart-snapshot'

export const maxDuration = 300; // 5 minutes max duration for Server Actions/API Routes in Next.js
export const dynamic = 'force-dynamic';
const OFFICIAL_LOGO_URL = 'https://pub-a6302a3a22854799b35a15cd40f9c728.r2.dev/Logo_Basarnas.png'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: sopId } = await params

    // Start async process
    createJob(sopId)

    // Run in background without awaiting
    processExport(sopId).catch(err => {
        console.error('❌ Background Export Error:', err)
        updateJob(sopId, {
            status: 'failed',
            error: err instanceof Error ? err.message : 'Unknown error'
        })
    })

    return NextResponse.json({
        success: true,
        message: 'Export started',
        statusUrl: `/api/sop-builder/${sopId}/export-status`
    }, { status: 202 })
}

async function processExport(sopId: string) {
    let browser: any = null;

    try {
        console.log('🚀 [Background] Starting Export Final SOP ID:', sopId)

        // 1. PARALLEL FETCH: DB, Logo, Template, Snapshot
        const [sop, logoBase64, htmlSource, snapshot] = await Promise.all([
            // DB Fetch
            (db as any).sopPembuatan.findUnique({
                where: { id: sopId },
                include: {
                    langkahLangkah: { orderBy: { order: 'asc' } },
                    sopFlowchart: true
                }
            }),
            // Logo Fetch
            Promise.resolve(OFFICIAL_LOGO_URL),
            // Template Fetch
            fs.promises.readFile(path.join(process.cwd(), 'src/lib/pdf-template.html'), 'utf8'),
            // Snapshot Fetch
            getStepSnapshot(sopId)
        ]);

        if (!sop) {
            updateJob(sopId, { status: 'failed', error: 'SOP tidak ditemukan' })
            return
        }

        // --- SNAPSHOT MERGE ---
        if (snapshot.length > 0) {
            sop.langkahLangkah = mergeStepsWithSnapshot(sop.langkahLangkah, snapshot);
        }

        // --- CONNECTOR PATHS ---
        if (typeof sop.connectorPaths === 'undefined' || sop.connectorPaths === null) {
            try {
                const isSqlite = (process.env.DATABASE_URL || '').startsWith('file:')
                const query = isSqlite
                    ? `SELECT "connectorPaths" FROM "SopPembuatan" WHERE "id" = ? LIMIT 1`
                    : `SELECT "connectorPaths" FROM "SopPembuatan" WHERE "id" = $1 LIMIT 1`;

                const raw = await (db as any).$queryRawUnsafe(query, sopId) as Array<{ connectorPaths?: string | null }>;
                sop.connectorPaths = raw?.[0]?.connectorPaths || null;
            } catch { }
        }

        // 2. Format Data & Steps (Synchronous)
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

        // 4. LAUNCH BROWSER ONCE
        console.log('🚀 Launching Puppeteer...');
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process',
                '--font-render-hinting=none',
                '--disable-dev-shm-usage'
            ],
            protocolTimeout: 60000,
            timeout: 60000
        });

        // --- STEP A: CAPTURE FLOWCHART ---
        const page = await browser.newPage();
        await page.setViewport({ width: 1600, height: 1200, deviceScaleFactor: 2 });
        // Make sure it's completely JSON serializable for the CDP bridge (Dates, undefined -> removed)
        const serializableSop = JSON.parse(JSON.stringify(sop));
        await page.evaluateOnNewDocument((data: any) => {
            (window as any).PRELOADED_SOP_DATA = data;
        }, serializableSop);

        const printUrl = `http://localhost:3000/print-flowchart/${sopId}?export=1&t=${Date.now()}`;
        console.log(`🔗 Navigating to: ${printUrl}`);

        await page.goto(printUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Optimized Wait
        try {
            await page.waitForFunction('window.flowchartReady === true', { timeout: 15000, polling: 200 });
        } catch {
            console.warn('⚠️ flowchartReady signal timeout, proceeding...');
        }

        // Small stabilization buffer
        await new Promise(r => setTimeout(r, 200));

        const flowchartEl = await page.$('#flowchart-container');
        if (!flowchartEl) throw new Error('Flowchart container not found');

        // Force white bg
        await page.evaluate(() => {
            document.body.style.backgroundColor = 'white';
            const el = document.getElementById('flowchart-container');
            if (el) el.style.backgroundColor = 'white';
        });

        // Smart Scaling
        const boundingBox = await flowchartEl.boundingBox();
        let scaleFactor = 2;
        if (boundingBox && boundingBox.height > 8000) {
            console.warn('⚠️ Flowchart very tall, reducing scale to 1.5x');
            scaleFactor = 1.5;
            await page.setViewport({ width: 1600, height: Math.ceil(boundingBox.height) + 100, deviceScaleFactor: scaleFactor });
        } else if (boundingBox) {
            await page.setViewport({ width: 1600, height: Math.ceil(boundingBox.height) + 100, deviceScaleFactor: 2 });
        }

        // Capture Screenshot
        console.log('📸 Taking screenshot...');
        const imgBuffer = await flowchartEl.screenshot({ type: 'jpeg', quality: 85, omitBackground: false });

        // Get Breakpoints
        const allBreakpoints = await page.evaluate((scale) => {
            const nodes = (window as any).__FLOWCHART_NODES__ || [];
            const SAFE_MARGIN_BOTTOM = 60;
            const SAFE_MARGIN_TOP = 80;

            const bottoms = nodes
                .filter((n: any) => n.type === 'offPageConnector' && n.data?.connectorType === 'page-break-bottom')
                .map((n: any) => ((n.position.y + (n.measured?.height || 60)) + SAFE_MARGIN_BOTTOM) * scale)
                .sort((a: number, b: number) => a - b);

            const tops = nodes
                .filter((n: any) => n.type === 'offPageConnector' && n.data?.connectorType === 'page-break-top')
                .map((n: any) => (n.position.y - SAFE_MARGIN_TOP) * scale)
                .sort((a: number, b: number) => a - b);

            return { bottoms, tops };
        }, scaleFactor);

        // Close capture page to free memory
        await page.close();

        // --- STEP B: SLICE IMAGE ---
        console.log('✂️ Slicing images...');
        const metadata = await sharp(imgBuffer).metadata();
        const fullWidth = metadata.width || 1600;
        const fullHeight = metadata.height || 1000;

        const screenshots: string[] = [];
        const { bottoms, tops } = allBreakpoints;
        const segments: { top: number, bottom: number }[] = [];

        const firstBottom = (bottoms && bottoms.length > 0) ? bottoms[0] : fullHeight;
        segments.push({ top: 0, bottom: firstBottom });

        if (tops && bottoms) {
            for (let i = 0; i < tops.length; i++) {
                const top = Math.max(0, tops[i]);
                const bottom = bottoms[i + 1] || fullHeight;
                segments.push({ top, bottom });
            }
        }

        // Parallel Slicing
        const slicePromises = segments.map(async (seg, i) => {
            const extractHeight = Math.min(seg.bottom - seg.top, fullHeight - seg.top);
            if (extractHeight <= 0) return null;

            const buffer = await sharp(imgBuffer)
                .extract({
                    left: 0,
                    top: Math.floor(seg.top),
                    width: Math.floor(fullWidth),
                    height: Math.floor(extractHeight)
                })
                .toFormat('jpeg', { quality: 90, force: true })
                .toBuffer();

            return { index: i, base64: buffer.toString('base64') };
        });

        const slicedResults = (await Promise.all(slicePromises)).filter(Boolean) as { index: number, base64: string }[];
        slicedResults.sort((a, b) => a.index - b.index); // Ensure order

        // Generate Flowchart HTML
        const flowchartPagesHtml = slicedResults.map((item, idx) => `
            <div class="page" id="page-flowchart-${idx + 1}" style="padding: 5mm;">
                <div class="header-simple">
                    <img src="${logoBase64}" alt="Logo" class="logo-small">
                    <div class="title-small">FLOWCHART SOP: ${(sop.judul || 'BASARNAS').toUpperCase()} (Hal. ${idx + 1})</div>
                </div>
                <div class="flow-container-smart" style="flex: 1; display: flex; align-items: flex-start; justify-content: center; border: none; overflow: visible;">
                    <img src="data:image/jpeg;base64,${item.base64}" style="width: 100%; height: auto; max-height: 100%; object-fit: contain;" alt="Flowchart Page ${idx + 1}">
                </div>
                <div class="footer-simple">BADAN NASIONAL PENCARIAN DAN PERTOLONGAN</div>
            </div>
        `).join('');

        finalHtml = finalHtml.replace('{{FLOWCHART_PAGES_HTML}}', flowchartPagesHtml)

        // --- STEP C: GENERATE PDF ---
        console.log('📄 Generating PDF...');
        const pdfPage = await browser.newPage();
        await pdfPage.setContent(finalHtml, { waitUntil: 'load', timeout: 60000 });

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

        // Upload
        const sanitizeFileName = (name: string) => name.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim().slice(0, 50)
        const finalFileName = `sop-${sanitizeFileName(sop.judul)}-final-${sopId.slice(0, 6)}.pdf`

        console.log('☁️ Uploading to R2...');
        const r2Result = await uploadToR2(Buffer.from(pdfBuffer), finalFileName, 'application/pdf', {
            folder: 'sop-builder-finals'
        });

        await (db as any).sopPembuatan.update({
            where: { id: sopId },
            data: { combinedPdfPath: r2Result.key, status: 'FINAL' }
        });

        updateJob(sopId, {
            status: 'completed',
            result: { finalPdfPath: r2Result.key }
        });

        console.log('✅ Export Completed Successfully');

        // ============================================
        // STEP D: BACKGROUND Backup to Google Drive
        // (Async, no await - runs AFTER R2 success)
        // ============================================
        import('@/lib/google-drive').then(async (gd) => {
            if (gd.isGoogleDriveConfigured()) {
                try {
                    console.log(`📤 [Background] Starting backup to Google Drive: ${finalFileName}`)

                    const driveResult = await gd.uploadFileToDriveFolder(
                        Buffer.from(pdfBuffer),
                        finalFileName,
                        'application/pdf'
                    )

                    // Update SOP record with driveFileId (if applicable field exists for generated pdf)
                    // Note: combinedPdfDriveId might not exist in schema, but we can log it or use fileSync

                    // Create FileSync record to track this backup
                    const { db } = await import('@/lib/db')
                    await db.fileSync.create({
                        data: {
                            filename: finalFileName,
                            mimeType: 'application/pdf',
                            fileSize: pdfBuffer.length,
                            r2Key: r2Result.key,
                            driveFileId: driveResult.id,
                            source: 'both',
                            syncStatus: 'synced',
                            r2ModifiedAt: new Date(),
                            driveModifiedAt: new Date(),
                            lastSyncedAt: new Date(),
                        }
                    }).catch(e => console.warn('⚠️ FileSync create failed:', e))

                    console.log(`✅ [Background] Backup to Google Drive completed: ${driveResult.id}`)
                } catch (backupError) {
                    console.warn('⚠️ [Background] Backup to Google Drive failed:', backupError)
                }
            }
        }).catch(err => {
            console.warn('⚠️ [Background] Failed to start backup:', err)
        })

    } catch (error) {
        console.error('❌ CRITICAL: Background Export Error:', error)
        updateJob(sopId, {
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error'
        })
    } finally {
        if (browser) {
            await browser.close().catch(() => { });
        }
    }
}
