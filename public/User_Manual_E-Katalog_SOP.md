---
title: "Buku Manual (User Manual) Sistem E-Katalog SOP"
author: "Tim Developer BASARNAS"
date: "2026"
---

<div style="text-align: center; margin: -50px -40px;">
  <!-- Gunakan gambar cover persis seperti lampiran -->
  <img src="https://pub-a6302a3a22854799b35a15cd40f9c728.r2.dev/cover.png" alt="Cover Buku Manual" style="width: 100%; height: auto; display: block;" />
</div>

<div style="page-break-after: always;"></div>

# KATA PENGANTAR

Puji syukur kami panjatkan ke hadirat Tuhan Yang Maha Esa atas terselesaikannya penyusunan **Buku Manual (User Manual) Web App E-Katalog SOP dan IK**. Buku saku ini disusun sebagai panduan komprehensif bagi seluruh pengguna dalam mengoperasikan aplikasi katalog Standar Operasional Prosedur (SOP) dan Instruksi Kerja (IK) di lingkungan Direktorat Kesiapsiagaan, Badan Nasional Pencarian dan Pertolongan (BASARNAS).

Kehadiran Web App E-Katalog SOP dan IK merupakan langkah strategis dalam mewujudkan transformasi digital guna meningkatkan efisiensi, akuntabilitas, serta aksesibilitas dokumen. Dengan sistem ini, pengelolaan SOP maupun IK mulai dari proses pengajuan, penyimpanan, hingga publikasi dapat dilakukan secara terpusat, cepat, dan aman.

Buku manual ini dirancang secara sistematis dengan bahasa yang lugas agar mudah dipahami oleh Pengguna Cerdas (User) maupun Administrator (Admin). Setiap tahapan proses dilengkapi dengan instruksi rinci serta contoh skenario penggunaan.

Kami menyadari bahwa sistem akan terus berkembang seiring dengan dinamika kebutuhan tata kelola organisasi. Oleh karena itu, kritik dan saran demi penyempurnaan aplikasi dan buku panduan ini sangat kami harapkan. Semoga buku manual ini dapat dimanfaatkan sebaik-baiknya oleh seluruh pihak yang berkepentingan.

<br/><br/>
Jakarta, 2026

<div style="page-break-after: always;"></div>

# DAFTAR ISI

- [KATA PENGANTAR](#kata-pengantar)
- [BAB I – PENDAHULUAN](#bab-i--pendahuluan)
- [BAB II – SPESIFIKASI SISTEM](#bab-ii--spesifikasi-sistem)
- [BAB III – AKSES DAN LOGIN](#bab-iii--akses-dan-login)
- [BAB IV – DASHBOARD](#bab-iv--dashboard)
- [BAB V – MANAJEMEN SOP](#bab-v--manajemen-sop)
- [BAB VI – PENGAJUAN SOP](#bab-vi--pengajuan-sop)
- [BAB VII – MANAJEMEN FILE](#bab-vii--manajemen-file)
- [BAB VIII – KEAMANAN SISTEM](#bab-viii--keamanan-sistem)
- [BAB IX – TROUBLESHOOTING](#bab-ix--troubleshooting)
- [BAB X – PENUTUP](#bab-x--penutup)

<div style="page-break-after: always;"></div>

# BAB I – PENDAHULUAN

## 1.1 Latar Belakang Sistem
Pengelolaan Standar Operasional Prosedur (SOP) dan Instruksi Kerja (IK) secara konvensional sering kali menghadapi kendala seperti tersebarnya dokumen di berbagai unit kerja, sulitnya melacak versi dokumen terbaru, serta panjangnya birokrasi dalam proses pengajuan. Untuk memecahkan kendala tersebut, dibangunlah platform **Web App E-Katalog SOP dan IK**. Aplikasi ini berbasis web modern (Next.js) dengan dukungan infrastruktur *cloud* sehingga dapat diakses secara real-time dan terintegrasi penuh khusus bagi Direktorat Kesiapsiagaan.

## 1.2 Tujuan Pembuatan Aplikasi
1. **Sentralisasi Data**: Menyediakan wadah penyimpanan terpusat terpadu bagi seluruh dokumen SOP dan Instruksi Kerja.
2. **Efisiensi Pengajuan**: Mempercepat proses pengajuan, persetujuan (approval), hingga publikasi SOP dan IK.
3. **Integritas Pengetahuan**: Memastikan setiap pegawai dapat merujuk pada dokumen prosedur versi terbaru yang sah dan *valid*.
4. **Keamanan Dokumen**: Menerapkan arsitektur pembatasan akses berdasarkan otorisasi peran (*role-based access*).

## 1.3 Ruang Lingkup Penggunaan
Sistem ini ditujukan untuk pengguna internal yang meliputi:
- **Pengguna Umum (Public User / Pegawai)**: Anggota instansi yang memerlukan referensi prosedur operasional untuk keperluan pelaksanaan tugas sehari-hari.
- **Admin Instansi**: Pegawai khusus (seperti tim Ortala/Biro Hukum) yang bertugas menyetujui draf SOP, serta mengelola arsip dan publikasi.
- **Developer / Super Admin**: Memonitor kinerja sistem, diagnosis *error*, dan *maintenance* jaringan.

## 1.4 Definisi Istilah Penting
- **SOP (Standar Operasional Prosedur)**: Dokumen petunjuk tertulis untuk memandu proses spesifik pada eselon manajerial.
- **IK (Instruksi Kerja)**: Petunjuk eksekusi rinci dan tata laksana spesifik di lapangan bagi tim Direktorat Kesiapsiagaan.
- **Role**: Hak tingkatan pengguna di dalam sistem (Admin, User, Developer).
- **Cloudflare R2**: Layanan *cloud storage* tempat file fisik dokumen (.pdf, .docx, excel) disimpan secara aman.
- **Supabase**: Layanan yang menangani autentikasi (*Login/Logout*) dan pangkalan data relasional secara canggih.

<div style="page-break-after: always;"></div>

# BAB II – SPESIFIKASI SISTEM

Penggunaan platform **Web App E-Katalog SOP dan IK** tidak membutuhkan instalasi *software* maupun instalasi manual yang rumit karena menggunakan basis Web API yang responsif.

## 2.1 Kebutuhan Perangkat Keras (Hardware)
Sistem dapat diakses menggunakan berbagai *device*, dengan spesifikasi standar minimum:
- **Processor**: Intel Core i3 / AMD Ryzen 3 (ekuivalen) atau lebih tinggi untuk desktop. Dapat dijalankan minimal dual-core untuk perangkat mobile.
- **RAM**: Minimum 2 GB (Rekomendasi 4 GB untuk kinerja penelusuran dokumen berukuran besar).
- **Layar**: Dapat mengakomodasi resolusi minimal 720p. Semakin lebar layar, *dashboard* akan menyesuaikan secara *responsive* dan dapat menampung lebih banyak kolom tabel arsip.

## 2.2 Kebutuhan Perangkat Lunak (Software)
Tidak diperlukan sistem operasi (*Operating System*) spesifik. Kompatibel secara optimal dengan lingkungan Windows, macOS, Linux, Android, maupun iOS, selama memiliki *web browser* fungsional.

## 2.3 Browser yang Direkomendasikan
Sistem telah diujikan secara ekstensif pada jajaran peramban modern berikut:
1. Google Chrome (Versi 90+)
2. Mozilla Firefox (Versi 88+)
3. Microsoft Edge Chromium
4. Apple Safari (Versi 14+)

*Catatan: Pastikan browser telah mengaktifkan dukungan untuk JavaScript dan Cookies agar sistem sesi otorisasi berfungsi.*

## 2.4 Kebutuhan Koneksi Internet
- Kecepatan minimum **2 Mbps** untuk proses browsing indeks SOP (katalog teks).
- Disarankan minimal kecepatan **10 Mbps** apabila akan mengunggah atau mengunduh dokumen dengan file *attachment* yang masif (lebih dari 20 MB).

<div style="page-break-after: always;"></div>

# BAB III – AKSES DAN LOGIN

Keamanan organisasi dilindungi melalui manajemen identitas dan hak akses secara ketat yang dikelola melalui integrasi Supabase Auth.

## 3.1 Cara Mengakses Aplikasi melalui Browser
1. Buka *web browser* pilihan Anda yang sudah terhubung ke jaringan internet.
2. Ketikkan URL aplikasi pada tautan yang diberikan secara resmi oleh badan TI organisasi (contoh: `https://e-katalog-sop.cloud/`).
3. Tekan tombol `Enter` pada keyboard Anda. Panel publik **Web App E-Katalog SOP dan IK** akan segera tampil.
   
   <div style="width: 100%; border: 1px dashed #ccc; padding: 10px; margin: 10px 0; background: #fafafa; color: #555; text-align: center;">
     [Gambar: Placeholder Screenshot Halaman Akses Publik]
   </div>

## 3.2 Proses Login
Untuk mengakses menu khusus operasional internal, pengguna diwajibkan melakukan *Login*.
1. Klik tombol **Login** pada sudut atas halaman web, atau masuk rute akses tertentu (contoh: mencoba klik menu *Dashboard* dari halaman luar).
2. Sistem akan mengarahkan menuju panel autentikasi terpusat.
3. Masukkan kombinasi otentikasi berupa **Alamat Email** dan **Password** terdaftar.
4. Klik tombol **Sign In**.
5. Jika data *valid*, sistem secara otomatis memverifikasi sesi (token JWT) dan menderek Anda ke halaman *Dashboard* utama sesuai dengan *Role*.

**Contoh Skenario:** Pegawai baru yang tidak berhasil masuk akan tertolak oleh pop-up berwarna merah "Email/Password tidak terotorisasi" apabila menekan tombol masuk menggunakan identitas salah.

## 3.3 Reset Password
Apabila pegawai lupa kata sandi (*password*):
1. Pada laman *Login*, temukan dan klik opsi tautan bertuliskan **Lupa Password?** (*Forgot Password*).
2. Masukkan alamat e-mail dinas pada kolom yang diinstruksikan.
3. Tekan **Kirim Tautan Pemulihan**.
4. Cek area *Inbox* atau *Spam* dalam klien Surel Anda. Sebuah email token resmi berisi tautan aman (yang kadaluwarsa sesudah 5 jam) akan tiba.
5. Klik tautan dalam email untuk segera dialihkan ke panel penggantian sandi baru.

## 3.4 Hak Akses Berdasarkan Role (Admin & User)
Sistem me-rotasi fungsionalitas berdasarkan tipe perizinan sesi:
- **Role ADMIN**: Terbuka akses mutlak untuk *Dashboard* statistik, memprakarsai SOP baru tanpa persetujuan, menu Verifikasi Persetujuan terhadap SOP publik, mengubah meta data tabel arsip, serta modifikasi *file storage*. Mengedit maupun menghapus (*Delete*) dokumen arsip masa lalu.
- **Role USER**: Dibatasi aksesnya sebatas dapat mengajukan draf SOP, mengunduh file, serta membaca daftar SOP, tanpa hak untuk melakukan modifikasi langsung sebelum disupervisi pihak Admin.

<div style="page-break-after: always;"></div>

# BAB IV – DASHBOARD

Pusat kendali (Command Center) aplikasi dirancang untuk menyajikan statistik instan seluruh aliran data *Web App E-Katalog SOP dan IK*.

## 4.1 Penjelasan Tampilan Dashboard
Ketika masuk, sistem memperlihatkan jajaran analitik yang tersusun atas komponen:
1. **Header Panel**: Area salam pengguna yang menyesuaikan dengan konteks login Anda berserta tanggal periode berjalan.
2. **Kartu Statistik Ringkas (Counter Cards)**: Menyajikan nilai *summary* total jumlah SOP dan IK terunggah, jumlah draft tertunda, serta total arsip dinamis pada penyimpanan. Efek animasi *responsive* diterapkan supaya metrik informatif.
3. **Analytics Chart (Diagram Bersusun)**: Diagram lingkaran (*pie chart*) untuk menunjukkan komposisi persentase jumlah kategori SOP dan juga diagram grafik fluktuasi riwayat unduhan bulanan dokumen.

   <div style="width: 100%; border: 1px dashed #ccc; padding: 10px; margin: 10px 0; background: #fafafa; color: #555; text-align: center;">
     [Gambar: Placeholder Screenshot Tampilan Dashboard dan Diagram]
   </div>

## 4.2 Fungsi Setiap Menu
Di sisi kiri layar (pada versi Desktop) terhampar **Side Navigation Bar** yang berisikan rute spesifik:
- **Katalog Draf**: Menampilkan grid / tabel khusus data *Standar Operasional Prosedur* dan *Instruksi Kerja* yang operasional siap pakai.
- **Verifikasi**: Panel khusus diakses *Admin* untuk mengeksekusi justifikasi SOP/IK yang mendaftar.
- **Arsip**: Tempat penyimpanan berkas SOP dan IK yang kedaluwarsa, tidak relevan (obsolete), atau digantikan varian versi baru.
- **Log Aktivitas**: Rangkuman transaksi *audit trail* mengenai perubahan apa, siapakah pelaku perubahannya, serta waktu detail (timestamp) berlangsung.

## 4.3 Navigasi Sistem
- **Hamburger Icon**: Pada tampilan perangkat bergerak (*handphone* / tablet), menu diringkas di balik *icon* tiga garis di sudut tajuk. 
- **Breadcrumb Navigation**: Pemandu jejak ada di ujung atas konten (mis. *Dashboard > Katalog SOP > Tambah Data*). Anda leluasa mengklik titik tersebut agar lebih cepat berlalu menuju direktori lapis awal.

<div style="page-break-after: always;"></div>

# BAB V – MANAJEMEN SOP

Penggelaran *Manajemen SOP dan IK* merupakan proses inti operasional administrasi, mencakup serangkaian langkah tambah, hapus, pembaharuan, sekaligus mengorganisir riwayat *file* rujukan.

## 5.1 Cara Menambahkan SOP Baru (Oleh Admin)
Pengurus diizinkan menerbitkan prosedur baru melalui pendaftaran langsung bernilai final:
1. Navigasi menuju halaman **Katalog SOP**, lantas klik tombol interaktif **(+ Tambah SOP Baru)** di segmen sudut atas daftar.
2. Muncul kotak isian (*Form Dialog*) atau panel *sliding window*. Masukkan rincian parameter terstruktur: 
   - Judul Dokumen (Penting)
   - Nomor Register Urusan (Jika ada)
   - Lingkup Penerapan (Biro/Wilayah/Bidang).
3. Unggah lampiran lampiran teknis (langkahnya dirincikan pada Subbab 5.2).
4. Klik tombol **Simpan**.

*Skenario Instan*: Apabila diunggah sebagai format 'Admin', posisi metadata dokumen secara serentak tercantum pada status Publikasi di hadapan User awam.

## 5.2 Cara Mengunggah File SOP
Sistem secara paralel mendaftarkan data terketik pada pangkalan data Supabase dan berkas aslinya pada R2 Cloud Storage.
1. Saat berada di *form* tambah/ubah SOP, gulir ke area unggahan.
2. Terdapat bidang bernama **Drop File Here** atau kotak bertuliskan **Klik Untuk Mengunggah**.
3. Pilih *file* (.pdf / .docx) dari peramban file internal PC/Laptop Anda (Max limit *size* bergantung konfigurasi infrastruktur, umumnya 10 MB - 50 MB).
4. Indikator kecepatan (*progress bar*) menunjukkan laju rambat injeksi *file*.
5. Tunggu hinggap muncul instruksi '*File Berhasil Teraplot*'. Tampilan logo tipe file otomatis menyesuaikan (cth: berlogo Acrobat PDF merah jika `.pdf`).

## 5.3 Cara Mengedit SOP
Bila di kemudian terjadi kekeliruan, dokumen tetap leluasa diedit:
1. Pilih baris SOP bersangkutan dari tabel dan temukan instrumen **Aksi (Pena/Pensil)**.
2. Saat Panel Form Terbuka, ganti substansi meta data, penamaan, atau ganti sepenuhnya berkas yang tidak valid menggunakan dokumen yang sudah direvisi.
3. Klik simpan kembali untuk mengubah rotasi arsip versi database agar sejajar dengan pembaharuan.

## 5.4 Cara Menghapus SOP
Menghindari perombakan serampangan, aplikasi meminta persetujuan sebelum eksekutor melakukan delegasi penghapusan final.
1. Berpindah ke tombol **Lainnya / Aksi / Tong Sampah** (Logo Tempat Sampah Merah) di tabel SOP.
2. *Dialog Konfirmasi* muncul (contoh: "Apakah Anda Yakin Akan Menghapus *Standar Tanggap Darurat Medis*?").
3. Tekan **Ya, Hapus**. (Dokumen tersebut akan berpindah dari panel halaman Katalog. Bergantung pengaturan, ia bergeser masuk 'Keranjang Sampah' Arsip atau musnah mutlak secara digital).

## 5.5 Proses Publikasi SOP
Apabila menggunakan fungsi penyimpanan sebagai 'Konsep/Draft', Pengurus yang bertugas menerbitkan kudu memasuki rute panel *Draft*. Hanya dengan melakukan pemencetan tombol penggerak **Toggle Publikasi**, maka SOP berstatus 'Disembunyikan' akan berganti predikatnya menjadi 'Publik'.
**Notifikasi Sistem**:
Aplikasi segera menyuguhkan pesan *Toaster* kecil bewarna menyejukkan bertuliskan "*Aksi Berhasil, SOP telah memancar ke Publik*". 

<div style="page-break-after: always;"></div>

# BAB VI – PENGAJUAN SOP

Agar organisasi menjaga kualitas pengarsipan terakreditasi, aplikasi menawarkan model '*Draft-to-Final*'. 

## 6.1 Cara Mengajukan SOP Baru (Dari sisi User)
1. Pegawai (User) melangkah lewat tombol pendaftaran *Tambah SOP*.
2. Membentuk rincian dokumen hingga meletakkan salinan pendukungnya. 
3. Saat disubmit, sistem menyita entitas dokumen pada tab terpisah bernama **Draft / Menunggu (Pending)**. Dokumen User **TIDAK AKAN** tampil di halaman layar Publik Katalog sebelum diijinkan Admin.

   <div style="width: 100%; border: 1px dashed #ccc; padding: 10px; margin: 10px 0; background: #fafafa; color: #555; text-align: center;">
     [Gambar: Placeholder Screenshot Status Pending dan Skenario Approve]
   </div>

## 6.2 Proses Persetujuan Oleh Admin
Setelah *Pegawai* bertugas menyerahkan Draft, Admin memperoleh notifikasi (atau masuk pada panel verifikasi).
1. Buka laman menu **Verifikasi SOP**.
2. Tersedia senarai form isian dokumen dengan status kuning (*Pending*).
3. Admin selaku Validator membaca / mengunduh naskah pratinjau.
4. Terdapat aksi dwifungsi: **Simbol Centang Hijau (Terima)** atau **Simbol Silang Merah (Tolak)**. Menekan fitur bersangkutan bakal mengakhiri putusan.

## 6.3 Status Pengajuan (Pending, Disetujui, Ditolak)
Sistem memiliki pengenalan lencana bewarna terstruktur bagi kelancaran transparansi penarikan informasi:
- **Pending (Menunggu Ulasan)**: Lingkaran atau teks kuning, bermakna Admin belum bertindak mengenai ajuan ini.
- **Disetujui (Approved)**: Naskah bertransformasi dari entitas draf menuju Daftar Master Katalog hijau. Rerata Pegawai sudah mampu melihat / membaca lampiran.
- **Ditolak (Rejected)**: Bila pengajuan dianulir (kurang layak atau rancu), draf SOP bergulir membawa tag merah. Admin disarankan melampirkan teks rasionalitas / catatan kaki agar sang pengusul memperbaiki sebelum menyertakan draft ulangan.

## 6.4 Notifikasi Email Otomatis
Pada serapan sistem terbaru, *engine* di integrasi dengan platform komando *mailing*. Semisal seorang Pengguna mengirim draft, pengurus di pos atas meraih kabar email peringatan. Tatkala diputuskan, Pemohon/User ditimpali email berisi kepastian lolos tidaknya warkat rancangan (*jika fitur ini tidak terdisable dan terkonfigurasi dengan SMTP/Resend / SendGrid organisasi*).

<div style="page-break-after: always;"></div>

# BAB VII – MANAJEMEN FILE

File terkompres dengan jaminan aksesibilitas super tangguh berkat arsitektur Cloudflare R2 - Object Storage berteknologi Canggih.

## 7.1 Proses Upload File ke Cloudflare R2
Setiap aksi pengunggahan dilakukan menggunakan integrasi API. Pengguna tidak perlu log-in pada platform terpisah.
Ketika panitia pengguna mengeksekusi '*Pilih Lampiran*' & klik submit, *payload* melaju merayapi rute `API endpoint` pada server Edge Vercel menuju terotorial *Bucket Storage R2*. File diproses dan segera memancarkan rekap *URL unik* seketika.

## 7.2 Proses Sinkronisasi File
Terdapat kejadian bilamana *database records* di Supabase belum menangkap berkas *binary image/document* R2 sebab sinyal jaringan terkikis, *Developer* dapat menyalakan panel Sinkronisasi Manual (*Sinc*) atau mengkomando fitur verifikasi dokumen sehingga *table* rekaman senantiasa selaras dengan file fisik *storage* tanpa kerancuan *Broken File Component*.

## 7.3 Pembaruan Dokumen
Memperbaharui *file* bersinonim dengan proses menumpuk, tetapi demi keapikan rekayasa arsip, R2 menghancurkan bekas fisik perolehan dokumen lalu segera mendistribusi replika hasil salinan perbaikan. Pastikan pengguna tak membiarkannya tumpah sia-sia tanpa menorehkan nomor seri pada kotak nama untuk menjaga runutan seri.

<div style="page-break-after: always;"></div>

# BAB VIII – KEAMANAN SISTEM

Proteksi menjadi pondasi dasar atas instansi pemerintah yang mengakar sekeras besi di dalam **Web App E-Katalog SOP dan IK**. Berikut lapisan proteksinya.

## 8.1 Sistem Autentikasi Supabase
Sistem mempercayakan sirkulasi autentikasi pada platform *Supabase* berstandar keamanan industri yang menolak manipulasi (pengguna tak berdaftar sama dengan akses tertolak). Basis data melindungi algoritma penyandian sandi (Salt & Hashes) lewat kerahasiaan canggih mutakhir, bukan sekedar merangkum string teks dasar.

## 8.2 Pembatasan Akses Berdasarkan Role
*Row Level Security* (RLS) diimplementasikan setara tingkat kebijakan korporat database.
- Seorang *User Cerdas Biasa* tidak dimungkinkan mengubah entitas atau menghapus berkas Master, bahkan menggunakan ekstensi *Postman* untuk memotong rute intervensi *backend* pun akan mendapatkan kode *401 Unauthorized*, terhalau oleh identitas peran sistem keamanan secara natural.

## 8.3 Backup Data
Infrastruktur basis relasional menyimpan poin retensi berkala guna restorasi seandainya ada insiden katastropi pangkalan data, mencegah kelumpuhan pengetahuan kolektif jangka panjang.
(Tim ahli teknologi senantiasa bisa menyelami opsi _Point In Recovery_ pada halaman pengelola *Supabase Studio*).

## 8.4 Keamanan Penyimpanan File
Dokumen prosedur berada di klaster yang mendayagunakan lapisan otorisasi ketat di mana *Object Retrieval* divalidasi kelewat kokoh. Membagikan tautan kasar tidak melepaskan kebebasan menembus arsip kecuali *client browser* yang mengakses dibekali status sah lewat sistem pertukaran token E-Katalog.

<div style="page-break-after: always;"></div>

# BAB IX – TROUBLESHOOTING

Berikut merupakan ensiklopedia kecil pemecahan keluhan tatkala menjumpai kondisi ganjil *(Error)* saat mengudara di sistem.

## 9.1 Gagal Login
* **Gejala**: Teks warna merah dengan notifikasi *"Kredensial Anda salah"*.
* **Solusi Pintasan**:
  1. Pastikan fitur penulisan huruf kapital (*Caps Lock*) di *keyboard* telah selaras, sistem menuntut sensitivitas rentetan karakter (*Case Sensitive*).
  2. Apabila Anda kelepasan ingatan pada sandi, jalankan seruan fitur 'Reset Sandi' alias **Lupa Password**.
  3. Konfirmasikan apakah administrator telah memberhentikan/menangguhkan akun dinas yang dituju.

## 9.2 File Tidak Bisa Diunggah
* **Gejala**: Proses *progress bar* tertahan di titik tengah dan terpental balik menunjukan rincian kesukaran pelampiran dokumen.
* **Solusi Pintasan**:
  1. Buktikan terlebih dulu kapabilitas limit ukuran dokumen Anda. Batas normal adalah di bawah ukuran masif yang diijinkan (contoh: 50MB).
  2. Evaluasi nama file - cobalah membuang teks unik aneh, angka serampangan, spasi berlebih, atau karakter spesial (seperti `>`, `<`, `:`) sebelum mengalokasikan dokumen.
  3. Periksa sambungan kuota jaringan. Coba muat ulang laman dan ulangi operasi perekatan fail.

## 9.3 Email Notifikasi Tidak Terkirim
* **Gejala**: Setelah menggunakan 'Reset Sandi' atau notifikasi pengajuan masuk, tidak mendapat balasan otomatis email di pos penerima.
* **Solusi Pintasan**:
  1. Buka kotak Folder *Spam* / *Junk*. Terkadang penjaring surel institusional menebas dan merantai alamat luar yang kurang terpercaya.
  2. Apabila Anda menyadari hal itu meluas *(terjadi masal ke seluruh pegawai)* silakan sampaikan keluhan jaringan kepada Tim Eksekutor Teknologi (*Developer*), barangkali terjadi masalah sirkuit penyerahan pos kehabisan saldo alokasi harian layanan *Mailing Service*.

## 9.4 Error Saat Membuka File (Corrupted/Blank)
* **Gejala**: Muncul laman bertuliskan kode kegagalan "404 Not Found" maupun indikasi dokumen kelabu pecah dan rusak sewaktu penanganan opsi unduh.
* **Solusi Pintasan**:
  1. *Master File* bisa diindikasi terhapus tanpa sinkronisasi rekaman di *Database*. Beri notis kapabilitas perombakan kepada pihak Admin Verifikator supaya mereka *Take Down/Hapus* SOP tersebut dari sistem katalog lantas memberhentikan ulang dengan meng-upload dokuman barunya.
  2. Fitur Diagnosa *Browser* bagi Developer amat dibutuhkan untuk melihat kendala transmisi berkas R2.

<div style="page-break-after: always;"></div>

# BAB X – PENUTUP

Dokumen standar prosedur dan instruksi kerja merupakan roda bergeraknya kejelasan administratif suatu instansi. Dihadirkan-Nya **Web App E-Katalog SOP dan IK** di ranah Direktorat Kesiapsiagaan, segenap langkah dalam pendokumentasian dapat dikonstruksi secorak lebih sistematis hingga memutus benang berliku dalam koordinasi birokrasi lintas unit kerja operasional di lapangan.

Tuntunan praktikal pada sekeping modul *Digital Booklet* User Manual ini disinyalir patut digemari dalam mendistribusi referensi terpercaya. Demikian pengenalan buku petunjuk pengoperasian. Sekiranya pegawai tetap dilanda seramutan komplikasi, jangan sangsikan kesigapan perpanjangan tangan tim Administrator Pusat (*Biro Ortala & Pusat Teknologi*) lewat surel korespondensi bantuan teknis sistem rujukan harian instansi. Teruslah berkarya menyelaraskan layanan efisien berbasis kecanggihan.

---
*(Akhir dari Dokumen Buku Manual Pengguna)*
