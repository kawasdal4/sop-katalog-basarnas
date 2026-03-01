'use client'

export default function PanduanPage() {
    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          font-family: 'Inter', sans-serif;
          background: #f8fafc;
          color: #1e293b;
          line-height: 1.7;
        }

        .header {
          background: linear-gradient(135deg, #1e3a5f 0%, #f97316 100%);
          color: white;
          padding: 32px 40px;
          display: flex;
          align-items: center;
          gap: 20px;
          position: sticky;
          top: 0;
          z-index: 100;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }

        .header-logo {
          width: 52px;
          height: 52px;
          background: rgba(255,255,255,0.15);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          flex-shrink: 0;
        }

        .header-title { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
        .header-sub { font-size: 13px; opacity: 0.8; margin-top: 2px; }

        .print-btn {
          margin-left: auto;
          background: rgba(255,255,255,0.2);
          border: 1px solid rgba(255,255,255,0.4);
          color: white;
          padding: 8px 20px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
          font-family: inherit;
        }
        .print-btn:hover { background: rgba(255,255,255,0.3); }

        .container {
          max-width: 860px;
          margin: 0 auto;
          padding: 40px 20px 80px;
        }

        /* Cover */
        .cover {
          background: white;
          border-radius: 16px;
          padding: 60px 40px;
          text-align: center;
          border: 3px solid #f97316;
          margin-bottom: 40px;
          box-shadow: 0 4px 24px rgba(249,115,22,0.15);
        }
        .cover img { width: 120px; margin-bottom: 32px; }
        .cover-title {
          font-size: 28px;
          font-weight: 800;
          color: #1e3a5f;
          text-transform: uppercase;
          letter-spacing: 2px;
          line-height: 1.3;
        }
        .cover-subtitle {
          font-size: 18px;
          font-weight: 600;
          color: #f97316;
          margin: 12px 0 32px;
        }
        .cover-meta {
          font-size: 13px;
          color: #64748b;
          border-top: 1px solid #e2e8f0;
          padding-top: 24px;
          margin-top: 32px;
        }
        .cover-meta p { margin: 4px 0; }

        /* ToC */
        .toc {
          background: white;
          border-radius: 16px;
          padding: 32px 40px;
          margin-bottom: 32px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
        }
        .toc-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px dotted #e2e8f0;
          font-size: 14px;
        }
        .toc-item:last-child { border-bottom: none; }
        .toc-item a { color: #1e3a5f; text-decoration: none; font-weight: 500; }
        .toc-item a:hover { color: #f97316; }
        .toc-page { color: #94a3b8; font-size: 13px; }

        /* Sections */
        .section {
          background: white;
          border-radius: 16px;
          padding: 40px;
          margin-bottom: 24px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
        }

        h1 {
          font-size: 20px;
          font-weight: 800;
          color: #1e3a5f;
          border-bottom: 3px solid #f97316;
          padding-bottom: 12px;
          margin-bottom: 24px;
          margin-top: 0;
          scroll-margin-top: 100px;
        }
        h2 {
          font-size: 16px;
          font-weight: 700;
          color: #f97316;
          margin: 24px 0 12px;
        }
        h3 {
          font-size: 14px;
          font-weight: 700;
          color: #1e3a5f;
          margin: 16px 0 8px;
        }

        p { font-size: 14px; color: #334155; margin-bottom: 12px; text-align: justify; }
        ul, ol { font-size: 14px; color: #334155; padding-left: 20px; margin-bottom: 12px; }
        li { margin-bottom: 6px; }

        /* Steps */
        .step-list { margin: 12px 0; }
        .step-item {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          margin-bottom: 12px;
        }
        .step-num {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: #f97316;
          color: white;
          font-size: 12px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 1px;
        }
        .step-text { font-size: 14px; color: #334155; padding-top: 4px; }

        /* FAQ */
        .faq-item {
          border-left: 4px solid #f97316;
          padding: 12px 16px;
          margin-bottom: 16px;
          background: #fff7ed;
          border-radius: 0 8px 8px 0;
        }
        .faq-q { font-weight: 700; color: #1e3a5f; font-size: 14px; margin-bottom: 6px; }
        .faq-a { color: #475569; font-size: 13px; font-style: italic; }

        /* Table */
        table { width: 100%; border-collapse: collapse; font-size: 13px; margin: 12px 0; }
        th { background: #f1f5f9; padding: 10px 12px; text-align: left; border: 1px solid #e2e8f0; font-weight: 600; color: #1e3a5f; }
        td { padding: 10px 12px; border: 1px solid #e2e8f0; color: #334155; }
        tr:nth-child(even) td { background: #f8fafc; }

        /* Badge */
        .badge {
          display: inline-block;
          padding: 2px 8px;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          font-size: 12px;
          color: #475569;
          font-weight: 500;
        }

        /* Contact */
        .contact-list { list-style: none; padding: 0; }
        .contact-list li {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          background: #f8fafc;
          border-radius: 8px;
          margin-bottom: 8px;
          font-size: 14px;
        }

        @media print {
          .header { position: relative; }
          .print-btn { display: none; }
          .section { box-shadow: none; page-break-inside: avoid; }
        }

        @media (max-width: 600px) {
          .header { padding: 20px; }
          .container { padding: 20px 12px 60px; }
          .section { padding: 24px 20px; }
          .cover { padding: 40px 24px; }
        }
      `}</style>

            <div className="header">
                <div className="header-logo">🛡️</div>
                <div>
                    <div className="header-title">Buku Panduan E-Katalog BASARNAS</div>
                    <div className="header-sub">Direktorat Kesiapsiagaan — Sistem SOP / IK</div>
                </div>
                <button className="print-btn" onClick={() => window.print()}>🖨️ Cetak / Simpan PDF</button>
            </div>

            <div className="container">

                {/* Cover */}
                <div className="cover">
                    <img src="/logo-sar.png" alt="Logo BASARNAS" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                    <div className="cover-title">
                        BUKU PANDUAN PENGGUNAAN<br />SISTEM E-KATALOG SOP / IK
                    </div>
                    <div className="cover-subtitle">DIREKTORAT KESIAPSIAGAAN</div>
                    <div className="cover-meta">
                        <p>Versi Sistem: 1.0.0</p>
                        <p>Instansi: Badan Nasional Pencarian dan Pertolongan (BASARNAS)</p>
                        <p style={{ marginTop: '12px', fontWeight: 700, color: '#1e3a5f' }}>
                            DIREKTORAT KESIAPSIAGAAN — BASARNAS — 2026
                        </p>
                    </div>
                </div>

                {/* ToC */}
                <div className="toc">
                    <h1 style={{ marginBottom: '16px' }}>Daftar Isi</h1>
                    {[
                        { label: 'Kata Pengantar', page: 'ii', href: '#pengantar' },
                        { label: 'BAB I – Pendahuluan', page: '1', href: '#bab1' },
                        { label: 'BAB II – Gambaran Umum Sistem', page: '3', href: '#bab2' },
                        { label: 'BAB III – Panduan Penggunaan', page: '5', href: '#bab3' },
                        { label: 'BAB IV – FAQ (Tanya Jawab)', page: '12', href: '#bab4' },
                        { label: 'BAB V – Penutup', page: '14', href: '#bab5' },
                    ].map((item) => (
                        <div key={item.href} className="toc-item">
                            <a href={item.href}>{item.label}</a>
                            <span className="toc-page">{item.page}</span>
                        </div>
                    ))}
                </div>

                {/* Kata Pengantar */}
                <div className="section" id="pengantar">
                    <h1>Kata Pengantar</h1>
                    <p>
                        Puji syukur kehadirat Tuhan Yang Maha Esa atas terselesaikannya pengembangan Sistem E-Katalog SOP dan IK
                        untuk Direktorat Kesiapsiagaan BASARNAS. Sistem ini dirancang untuk memodernisasi tata kelola dokumen
                        operasional dan instruksi kerja guna mendukung kesiapsiagaan pencarian dan pertolongan yang lebih efektif.
                    </p>
                    <p>
                        Buku panduan ini disusun sebagai acuan teknis bagi seluruh pengguna dalam mengoperasikan fitur-fitur
                        utama sistem. Diharapkan dengan adanya panduan ini, pemanfaatan sistem dapat dilakukan secara optimal
                        dan seragam oleh seluruh personel terkait.
                    </p>
                    <p>
                        Kami menyadari bahwa sistem ini masih memerlukan pengembangan berkelanjutan. Oleh karena itu, masukan
                        dan saran dari para pengguna sangat kami harapkan untuk penyempurnaan di masa mendatang.
                    </p>
                    <p style={{ textAlign: 'right', marginTop: '24px' }}>
                        Jakarta, 2026<br />
                        <strong>Tim Pengembangan Sistem</strong>
                    </p>
                </div>

                {/* BAB I */}
                <div className="section" id="bab1">
                    <h1>BAB I – Pendahuluan</h1>

                    <h2>1.1 Latar Belakang</h2>
                    <p>
                        Dalam pelaksanaan tugas operasional BASARNAS, standarisasi melalui Standar Operasional Prosedur (SOP)
                        dan Instruksi Kerja (IK) merupakan pilar utama keberhasilan misi. Seiring dengan transformasi digital,
                        pengelolaan dokumen fisik mulai beralih ke platform digital guna memastikan dokumen selalu terbaru,
                        mudah diakses, dan aman.
                    </p>

                    <h2>1.2 Tujuan Sistem</h2>
                    <p>Sistem E-Katalog SOP / IK bertujuan untuk:</p>
                    <ul>
                        <li>Menyediakan pusat data tunggal (<em>Single Source of Truth</em>) untuk seluruh dokumen SOP dan IK.</li>
                        <li>Memfasilitasi pencarian dokumen secara cepat dan akurat berdasarkan kategori, tahun, dan lingkup.</li>
                        <li>Mendukung proses verifikasi dokumen publik secara transparan.</li>
                        <li>Memastikan log aktivitas terdokumentasi untuk keperluan audit internal.</li>
                    </ul>

                    <h2>1.3 Ruang Lingkup</h2>
                    <p>
                        Sistem ini mencakup pengelolaan metadata dokumen, penyimpanan file cadangan (backup), fitur verifikasi
                        kiriman publik, serta pemantauan statistik penggunaan dokumen dalam lingkup Direktorat Kesiapsiagaan BASARNAS.
                    </p>
                </div>

                {/* BAB II */}
                <div className="section" id="bab2">
                    <h1>BAB II – Gambaran Umum Sistem</h1>

                    <h2>2.1 Deskripsi Fitur Utama</h2>
                    <p>E-Katalog BASARNAS dilengkapi dengan antarmuka <em>Command Center</em> yang futuristik dan responsif. Fitur utama meliputi:</p>
                    <ul>
                        <li><strong>Digital Dashboard</strong>: Visualisasi data distribusi dokumen melalui grafik interaktif.</li>
                        <li><strong>Katalog Kolektif</strong>: Daftar seluruh SOP dan IK dengan fitur filter mendalam.</li>
                        <li><strong>Sistem Edit Excel (Cloud Sync)</strong>: Fitur khusus untuk mengedit file Excel secara langsung tanpa perlu mengunduh.</li>
                        <li><strong>Verifikasi Publik</strong>: Alur kerja untuk meninjau dokumen yang dikirimkan oleh pihak luar/publik.</li>
                        <li><strong>Monitoring Logs</strong>: Pelacakan setiap aktivitas user (upload, edit, download) dalam sistem.</li>
                    </ul>

                    <h2>2.2 Struktur Menu</h2>
                    <table>
                        <thead>
                            <tr><th>Menu</th><th>Fungsi Utama</th></tr>
                        </thead>
                        <tbody>
                            <tr><td>📊 Dashboard</td><td>Ringkasan statistik dan laporan analitik sistem.</td></tr>
                            <tr><td>📂 Katalog SOP</td><td>Manajemen utama file dokumen operasional.</td></tr>
                            <tr><td>✅ Verifikasi</td><td>Persetujuan dokumen yang diunggah pihak publik.</td></tr>
                            <tr><td>📜 Audit Logs</td><td>Catatan riwayat aktivitas seluruh pengguna.</td></tr>
                            <tr><td>👥 User Management</td><td>Pengaturan hak akses akun personel.</td></tr>
                        </tbody>
                    </table>
                </div>

                {/* BAB III */}
                <div className="section" id="bab3">
                    <h1>BAB III – Panduan Penggunaan</h1>

                    <h2>3.1 Prosedur Akses (Login)</h2>
                    <div className="step-list">
                        <div className="step-item">
                            <div className="step-num">1</div>
                            <div className="step-text">Buka peramban (browser) dan akses alamat sistem.</div>
                        </div>
                        <div className="step-item">
                            <div className="step-num">2</div>
                            <div className="step-text">Masukkan <strong>Email Resmi</strong> dan <strong>Password</strong> yang telah didaftarkan oleh Admin.</div>
                        </div>
                        <div className="step-item">
                            <div className="step-num">3</div>
                            <div className="step-text">Klik tombol <span className="badge">Masuk</span>. Anda akan diarahkan ke Dashboard jika autentikasi berhasil.</div>
                        </div>
                    </div>

                    <h2>3.2 Mengelola Katalog SOP</h2>
                    <h3>A. Menambahkan Dokumen Baru</h3>
                    <div className="step-list">
                        <div className="step-item">
                            <div className="step-num">1</div>
                            <div className="step-text">Klik menu <strong>Upload Dokumen</strong> (ikon awan).</div>
                        </div>
                        <div className="step-item">
                            <div className="step-num">2</div>
                            <div className="step-text">Lengkapi formulir metadata: Judul, Tahun, Kategori (Siaga/Latihan), dan Lingkup Kerja.</div>
                        </div>
                        <div className="step-item">
                            <div className="step-num">3</div>
                            <div className="step-text">Pilih file (PDF atau Excel) dan klik <strong>Simpan</strong>.</div>
                        </div>
                    </div>

                    <h3>B. Pencarian dan Filter</h3>
                    <p>
                        Gunakan kotak pencarian di bagian atas tabel Katalog untuk mencari judul secara instan.
                        Anda juga dapat memfilter berdasarkan <strong>Tag Lingkup</strong> (BCC, Dit. Siaga, Basarnas, dll)
                        untuk penyaringan lebih spesifik.
                    </p>

                    <h2>3.3 Mengajukan Dokumen (Publik)</h2>
                    <div className="step-list">
                        <div className="step-item">
                            <div className="step-num">1</div>
                            <div className="step-text">Akses halaman utama sistem tanpa perlu login.</div>
                        </div>
                        <div className="step-item">
                            <div className="step-num">2</div>
                            <div className="step-text">Isi <strong>Nama Lengkap</strong>, <strong>Email</strong>, dan data dokumen pada formulir pengajuan.</div>
                        </div>
                        <div className="step-item">
                            <div className="step-num">3</div>
                            <div className="step-text">Unggah file dokumen dan klik <span className="badge">Kirim Pengajuan</span>.</div>
                        </div>
                        <div className="step-item">
                            <div className="step-num">4</div>
                            <div className="step-text">Dokumen akan masuk ke antrian verifikasi Admin.</div>
                        </div>
                    </div>
                </div>

                {/* BAB IV */}
                <div className="section" id="bab4">
                    <h1>BAB IV – FAQ (Tanya Jawab)</h1>

                    <div className="faq-item">
                        <div className="faq-q">Bagaimana jika saya lupa kata sandi akun?</div>
                        <div className="faq-a">Hubungi Administrator Sistem atau Developer melalui menu kontak untuk melakukan reset password secara manual.</div>
                    </div>

                    <div className="faq-item">
                        <div className="faq-q">Apa perbedaan antara SOP dan IK dalam sistem?</div>
                        <div className="faq-a">SOP (Standar Operasional Prosedur) mengatur alur kerja antar departemen, sedangkan IK (Instruksi Kerja) bersifat lebih teknis dan mendetail untuk tugas tertentu.</div>
                    </div>

                    <div className="faq-item">
                        <div className="faq-q">Mengapa file saya tidak bisa diunggah?</div>
                        <div className="faq-a">Pastikan ukuran file tidak melebihi 50 MB dan format file adalah .pdf, .xlsx, atau .docx.</div>
                    </div>

                    <div className="faq-item">
                        <div className="faq-q">Siapa yang bisa mengakses fitur verifikasi?</div>
                        <div className="faq-a">Hanya pengguna dengan peran ADMIN atau DEVELOPER yang dapat mengakses halaman Verifikasi dan Arsip.</div>
                    </div>

                    <div className="faq-item">
                        <div className="faq-q">Bagaimana cara mencetak atau menyimpan panduan ini?</div>
                        <div className="faq-a">Klik tombol "🖨️ Cetak / Simpan PDF" di bagian atas halaman, lalu pilih "Save as PDF" pada dialog print browser Anda.</div>
                    </div>
                </div>

                {/* BAB V */}
                <div className="section" id="bab5">
                    <h1>BAB V – Penutup</h1>
                    <p>
                        Keberhasilan implementasi E-Katalog SOP / IK BASARNAS sangat bergantung pada konsistensi seluruh
                        pengguna dalam menjaga pembaruan data. Pastikan setiap dokumen yang sudah tidak relevan atau
                        kadaluarsa segera diperbarui statusnya dalam sistem.
                    </p>

                    <h2>Kontak Dukungan Teknis</h2>
                    <p>Jika menemui kendala teknis atau bug sistem, silakan hubungi:</p>
                    <ul className="contact-list">
                        <li>📧 <strong>Email Support:</strong> admin@sop.go.id</li>
                        <li>📱 <strong>WhatsApp:</strong> +62 812-xxxx-xxxx (Helpdesk IT)</li>
                        <li>🏢 <strong>Lokasi:</strong> Kantor Pusat BASARNAS — Direktorat Kesiapsiagaan</li>
                    </ul>
                </div>

            </div>
        </>
    )
}
