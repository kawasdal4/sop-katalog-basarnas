import { NextResponse } from 'next/server'
import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'
import path from 'path'
import fs from 'fs'

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function GET() {
    let browser: any = null;
    try {
        const logoRelPath = 'public/logo-sar.png'
        const logoFullPath = path.join(process.cwd(), logoRelPath)
        let logoBase64 = ''

        if (fs.existsSync(logoFullPath)) {
            const logoBuffer = fs.readFileSync(logoFullPath)
            logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`
        }

        const today = new Date().toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        })

        const htmlContent = `
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Buku Panduan Penggunaan Aplikasi</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        
        body {
            font-family: 'Inter', sans-serif;
            margin: 0;
            padding: 0;
            color: #333;
            line-height: 1.6;
        }

        .page {
            width: 210mm;
            min-height: 297mm;
            padding: 20mm;
            margin: auto;
            background: white;
            box-sizing: border-box;
            position: relative;
            page-break-after: always;
        }

        /* Cover Page */
        .cover {
            text-align: center;
            display: flex;
            flex-direction: column;
            justify-content: center;
            height: 257mm;
            border: 5px solid #f97316;
            padding: 20px;
        }

        .cover-logo {
            width: 150px;
            margin: 0 auto 40px;
        }

        .cover-title {
            font-size: 32px;
            font-weight: 800;
            color: #1e3a5f;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 2px;
        }

        .cover-subtitle {
            font-size: 24px;
            font-weight: 600;
            color: #f97316;
            margin-bottom: 60px;
        }

        .cover-info {
            margin-top: auto;
            font-size: 14px;
            color: #666;
        }

        .cover-footer {
            margin-top: 40px;
            font-weight: 700;
            color: #1e3a5f;
        }

        /* Typography */
        h1 { color: #1e3a5f; border-bottom: 2px solid #f97316; padding-bottom: 10px; margin-top: 40px; }
        h2 { color: #f97316; margin-top: 30px; }
        h3 { color: #1e3a5f; margin-top: 20px; }
        
        p { text-align: justify; }

        .toc ul { list-style: none; padding: 0; }
        .toc li { margin-bottom: 10px; display: flex; justify-content: space-between; border-bottom: 1px dotted #ccc; }
        .toc li span:first-child { background: white; padding-right: 5px; position: relative; top: 5px; }
        .toc li span:last-child { background: white; padding-left: 5px; position: relative; top: 5px; }

        .step-list { margin-bottom: 20px; }
        .step-item { margin-bottom: 15px; display: flex; align-items: flex-start; }
        .step-number { 
            background: #f97316; 
            color: white; 
            width: 24px; 
            height: 24px; 
            border-radius: 50%; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            font-weight: bold; 
            font-size: 12px; 
            margin-right: 15px;
            flex-shrink: 0;
            margin-top: 2px;
        }

        .faq-item { margin-bottom: 20px; border-left: 4px solid #f97316; padding-left: 15px; }
        .faq-q { font-weight: 700; color: #1e3a5f; }
        .faq-a { color: #555; font-style: italic; }

        .footer-note {
            position: absolute;
            bottom: 20mm;
            left: 20mm;
            right: 20mm;
            text-align: center;
            font-size: 10px;
            color: #999;
            border-top: 1px solid #eee;
            padding-top: 10px;
        }

        .badge {
            display: inline-block;
            padding: 2px 8px;
            background: #f1f5f9;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            font-size: 12px;
            color: #475569;
        }

        @media print {
            .page { margin: 0; border: initial; width: initial; min-height: initial; box-shadow: initial; background: initial; page-break-after: always; }
        }
    </style>
</head>
<body>

    <!-- Cover Page -->
    <div class="page">
        <div class="cover">
            <img src="${logoBase64}" class="cover-logo" alt="Logo BASARNAS">
            <div class="cover-title">BUKU PANDUAN PENGGUNAAN</div>
            <div class="cover-title">SISTEM E-KATALOG SOP / IK</div>
            <div class="cover-subtitle">DIREKTORAT KESIAPSIAGAAN</div>
            
            <div class="cover-info">
                <p>Versi Sistem: 1.0.0</p>
                <p>Tanggal Pembuatan: ${today}</p>
                <p>Instansi: Badan Nasional Pencarian dan Pertolongan (BASARNAS)</p>
            </div>
            
            <div class="cover-footer">
                DIREKTORAT KESIAPSIAGAAN<br>
                BADAN NASIONAL PENCARIAN DAN PERTOLONGAN<br>
                2026
            </div>
        </div>
    </div>

    <!-- Table of Contents -->
    <div class="page">
        <h1>DAFTAR ISI</h1>
        <div class="toc">
            <ul>
                <li><span>KATA PENGANTAR</span> <span>ii</span></li>
                <li><span>BAB I – PENDAHULUAN</span> <span>1</span></li>
                <li><span>BAB II – GAMBARAN UMUM SISTEM</span> <span>3</span></li>
                <li><span>BAB III – PANDUAN PENGGUNAAN</span> <span>5</span></li>
                <li><span>BAB IV – PERTANYAAN (FAQ)</span> <span>12</span></li>
                <li><span>BAB V – PENUTUP</span> <span>14</span></li>
            </ul>
        </div>
        
        <h1 style="margin-top: 60px;">KATA PENGANTAR</h1>
        <p>
            Puji syukur kehadirat Tuhan Yang Maha Esa atas terselesaikannya pengembangan Sistem E-Katalog SOP dan IK untuk Direktorat Kesiapsiagaan BASARNAS. Sistem ini dirancang untuk memodernisasi tata kelola dokumen operasional dan instruksi kerja guna mendukung kesiapsiagaan pencarian dan pertolongan yang lebih efektif.
        </p>
        <p>
            Buku panduan ini disusun sebagai acuan teknis bagi seluruh pengguna dalam mengoperasikan fitur-fitur utama sistem. Diharapkan dengan adanya panduan ini, pemanfaatan sistem dapat dilakukan secara optimal dan seragam oleh seluruh personel terkait.
        </p>
        <p>
            Kami menyadari bahwa sistem ini masih memerlukan pengembangan berkelanjutan. Oleh karena itu, masukan dan saran dari para pengguna sangat kami harapkan untuk penyempurnaan di masa mendatang.
        </p>
        <div style="margin-top: 40px; text-align: right;">
            <p>Jakarta, ${today}</p>
            <p><strong>Tim Pengembangan Sistem</strong></p>
        </div>
        <div class="footer-note">Halaman ii | Buku Panduan E-Katalog BASARNAS</div>
    </div>

    <!-- Chapter I -->
    <div class="page">
        <h1>BAB I – PENDAHULUAN</h1>
        
        <h2>1.1 Latar Belakang</h2>
        <p>
            Dalam pelaksanaan tugas operasional BASARNAS, standarisasi melalui Standar Operasional Prosedur (SOP) dan Instruksi Kerja (IK) merupakan pilar utama keberhasilan misi. Seiring dengan transformasi digital, pengelolaan dokumen fisik mulai beralih ke platform digital guna memastikan dokumen selalu terbaru, mudah diakses, dan aman.
        </p>
        
        <h2>1.2 Tujuan Sistem</h2>
        <p>
            Sistem E-Katalog SOP / IK bertujuan untuk:
        </p>
        <ul>
            <li>Menyediakan pusat data tunggal (*Single Source of Truth*) untuk seluruh dokumen SOP dan IK.</li>
            <li>Memfasilitasi pencarian dokumen secara cepat dan akurat berdasarkan kategori, tahun, dan lingkup.</li>
            <li>Mendukung proses verifikasi dokumen publik secara transparan.</li>
            <li>Memastikan log aktivitas terdokumentasi untuk keperluan audit internal.</li>
        </ul>
        
        <h2>1.3 Ruang Lingkup</h2>
        <p>
            Sistem ini mencakup pengelolaan metadata dokumen, penyimpanan file cadangan (backup), fitur verifikasi kiriman publik, serta pemantauan statistik penggunaan dokumen dalam lingkup Direktorat Kesiapsiagaan BASARNAS.
        </p>
        <div class="footer-note">Halaman 1 | Buku Panduan E-Katalog BASARNAS</div>
    </div>

    <!-- Chapter II -->
    <div class="page">
        <h1>BAB II – GAMBARAN UMUM SISTEM</h1>
        
        <h2>2.1 Deskripsi Fitur Utama</h2>
        <p>
            E-Katalog BASARNAS dilengkapi dengan antarmuka *Command Center* yang futuristik dan responsif. Fitur utama meliputi:
        </p>
        <ul>
            <li><strong>Digital Dashboard</strong>: Visualisasi data distribusi dokumen melalui grafik interaktif.</li>
            <li><strong>Katalog Kolektif</strong>: Daftar seluruh SOP dan IK dengan fitur filter mendalam.</li>
            <li><strong>Sistem Edit Excel (Cloud Sync)</strong>: Fitur khusus untuk mengedit file Excel secara langsung tanpa perlu mengunduh.</li>
            <li><strong>Verifikasi Publik</strong>: Alur kerja untuk meninjau dokumen yang dikirimkan oleh pihak luar/publik.</li>
            <li><strong>Monitoring Logs</strong>: Pelacakan setiap aktivitas user (upload, edit, download) dalam sistem.</li>
        </ul>
        
        <h2>2.2 Struktur Menu</h2>
        <p>
            Navigasi sistem terbagi menjadi beberapa modul utama di bilah samping (*Sidebar*):
        </p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
            <tr style="background: #f8fafc;">
                <th style="border: 1px solid #e2e8f0; padding: 10px; text-align: left;">Menu</th>
                <th style="border: 1px solid #e2e8f0; padding: 10px; text-align: left;">Fungsi Utama</th>
            </tr>
            <tr>
                <td style="border: 1px solid #e2e8f0; padding: 10px;">📊 Dashboard</td>
                <td style="border: 1px solid #e2e8f0; padding: 10px;">Ringkasan statistik dan laporan analitik sistem.</td>
            </tr>
            <tr>
                <td style="border: 1px solid #e2e8f0; padding: 10px;">📂 Katalog SOP</td>
                <td style="border: 1px solid #e2e8f0; padding: 10px;">Manajemen utama file dokumen operasional.</td>
            </tr>
            <tr>
                <td style="border: 1px solid #e2e8f0; padding: 10px;">✅ Verifikasi</td>
                <td style="border: 1px solid #e2e8f0; padding: 10px;">Persetujuan dokumen yang diunggah pihak publik.</td>
            </tr>
            <tr>
                <td style="border: 1px solid #e2e8f0; padding: 10px;">📜 Audit Logs</td>
                <td style="border: 1px solid #e2e8f0; padding: 10px;">Catatan riwayat aktivitas seluruh pengguna.</td>
            </tr>
            <tr>
                <td style="border: 1px solid #e2e8f0; padding: 10px;">👥 User Management</td>
                <td style="border: 1px solid #e2e8f0; padding: 10px;">Pengaturan hak akses akun personel.</td>
            </tr>
        </table>
        <div class="footer-note">Halaman 4 | Buku Panduan E-Katalog BASARNAS</div>
    </div>

    <!-- Chapter III -->
    <div class="page">
        <h1>BAB III – PANDUAN PENGGUNAAN</h1>
        
        <h2>3.1 Prosedur Akses (Login)</h2>
        <div class="step-list">
            <div class="step-item">
                <div class="step-number">1</div>
                <div>Buka peramban (browser) dan akses alamat sistem.</div>
            </div>
            <div class="step-item">
                <div class="step-number">2</div>
                <div>Masukkan <strong>Email Resmi</strong> dan <strong>Password</strong> yang telah didaftarkan oleh Admin.</div>
            </div>
            <div class="step-item">
                <div class="step-number">3</div>
                <div>Klik tombol <span class="badge">Masuk</span>. Anda akan diarahkan ke Dashboard jika autentikasi berhasil.</div>
            </div>
        </div>

        <h2>3.2 Mengelola Katalog SOP</h2>
        <h3>A. Menambahkan Dokumen Baru</h3>
        <div class="step-list">
            <div class="step-item">
                <div class="step-number">1</div>
                <div>Klik menu <strong>Upload Dokumen</strong> (ikon awan).</div>
            </div>
            <div class="step-item">
                <div class="step-number">2</div>
                <div>Lengkapi formulir metadata: Judul, Tahun, Kategori (Siaga/Latihan), dan Lingkup Kerja.</div>
            </div>
            <div class="step-item">
                <div class="step-number">3</div>
                <div>Pilih file (PDF atau Excel) dan klik <strong>Simpan</strong>.</div>
            </div>
        </div>

        <h3>B. Pencarian dan Filter</h3>
        <p>
            Gunakan kotak pencarian di bagian atas tabel Katalog untuk mencari judul secara instan. Anda juga dapat memfilter berdasarkan <strong>Tag Lingkup</strong> (BCC, Dit. Siaga, Basarnas, dll) untuk penyaringan lebih spesifik.
        </p>
        
        <div class="footer-note">Halaman 6 | Buku Panduan E-Katalog BASARNAS</div>
    </div>

    <!-- Chapter IV & V -->
    <div class="page">
        <h1>BAB IV – FAQ (TANYA JAWAB)</h1>
        
        <div class="faq-item">
            <div class="faq-q">Bagaimana jika saya lupa kata sandi akun?</div>
            <div class="faq-a">Hubungi Administrator Sistem atau Developer melalui menu kontak untuk melakukan reset password secara manual.</div>
        </div>

        <div class="faq-item">
            <div class="faq-q">Apa perbedaan antara SOP dan IK dalam sistem?</div>
            <div class="faq-a">SOP (Standar Operasional Prosedur) mengatur alur kerja antar departemen, sedangkan IK (Instruksi Kerja) bersifat lebih teknis dan mendetail untuk tugas tertentu.</div>
        </div>

        <div class="faq-item">
            <div class="faq-q">Mengapa file saya tidak bisa diunggah?</div>
            <div class="faq-a">Pastikan ukuran file tidak melebihi 50 MB dan format file adalah .pdf, .xlsx, atau .docx.</div>
        </div>

        <h1 style="margin-top: 60px;">BAB V – PENUTUP</h1>
        <p>
            Keberhasilan implementasi E-Katalog SOP / IK BASARNAS sangat bergantung pada konsistensi seluruh pengguna dalam menjaga pembaruan data. Pastikan setiap dokumen yang sudah tidak relevan atau kadaluarsa segera diperbarui statusnya dalam sistem.
        </p>
        
        <h3>Kontak Dukungan Teknis</h3>
        <p>Jika menemui kendala teknis atau bug sistem, silakan hubungi:</p>
        <ul style="list-style: none; padding: 0;">
            <li>📧 Email Support: <strong>admin@sop.go.id</strong></li>
            <li>📱 WhatsApp: <strong>+62 812-xxxx-xxxx</strong> (Helpdesk IT)</li>
            <li>🏢 Lokasi: Kantor Pusat BASARNAS - Direktorat Kesiapsiagaan</li>
        </ul>
        
        <div class="footer-note">Halaman 14 | Buku Panduan E-Katalog BASARNAS</div>
    </div>

</body>
</html>
    `

        const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

        browser = await puppeteer.launch({
            args: isProd ? chromium.args : ['--no-sandbox', '--disable-setuid-sandbox'],
            defaultViewport: chromium.defaultViewport,
            executablePath: isProd ? await chromium.executablePath() : undefined,
            channel: isProd ? undefined : 'chrome',
            headless: (isProd ? chromium.headless : true) as any,
        });

        const page = await browser.newPage()
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' })

        const pdf = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '10mm',
                bottom: '10mm',
                left: '10mm',
                right: '10mm'
            }
        })

        await browser.close()

        return new NextResponse(Buffer.from(pdf), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'inline; filename="Panduan-E-Katalog-BASARNAS.pdf"'
            }
        })
    } catch (error: any) {
        console.error('PDF Generation Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    } finally {
        if (browser) {
            await browser.close().catch(() => { });
        }
    }
}
