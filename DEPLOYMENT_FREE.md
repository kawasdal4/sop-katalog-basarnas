# 🚀 Panduan Deploy GRATIS - Vercel + Supabase

## 💰 100% GRATIS!

| Service | Free Tier | Limits |
|---------|-----------|--------|
| **Vercel** | ✅ Hobby Plan | 100GB bandwidth/bulan |
| **Supabase** | ✅ Free Plan | 500MB database, 1GB storage |
| **Google Drive** | ✅ Sudah ada | 15GB |

**Total Biaya: $0/bulan** 🎉

---

## 📋 Prerequisites

1. **Akun GitHub** - Untuk push kode
2. **Akun Vercel** - https://vercel.com (login dengan GitHub)
3. **Akun Supabase** - https://supabase.com (login dengan GitHub)

---

## Step 1: Setup Supabase Database (GRATIS)

### 1.1 Buat Project Supabase
1. Buka https://supabase.com
2. Klik **"Start your project"**
3. Login dengan GitHub
4. Klik **"New Project"**
5. Isi:
   - **Name**: `sop-katalog-basarnas`
   - **Database Password**: (buat password kuat, simpan!)
   - **Region**: `Southeast Asia (Singapore)`
6. Klik **"Create new project"**
7. Tunggu ~2 menit sampai project ready

### 1.2 Dapatkan Connection String
1. Di dashboard Supabase, klik **Settings** (gear icon)
2. Klik **Database**
3. Scroll ke **Connection string** > **URI**
4. Copy connection string, format:
   ```
   postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
   ```
5. Simpan password yang Anda buat tadi!

### 1.3 Dapatkan Direct Connection (untuk migrations)
1. Masih di halaman yang sama
2. Cari **Connection string** > **JDBC**
3. Atau gunakan format:
   ```
   postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
   ```
   (Port **5432** untuk direct connection, **6543** untuk pooling)

---

## Step 2: Push ke GitHub

```bash
# Initialize git (jika belum)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - SOP Katalog BASARNAS"

# Add remote (ganti dengan repo Anda)
git remote add origin https://github.com/USERNAME/sop-katalog-basarnas.git

# Push
git push -u origin main
```

---

## Step 3: Deploy ke Vercel (GRATIS)

### 3.1 Import Project
1. Buka https://vercel.com
2. Login dengan GitHub
3. Klik **"Add New..."** > **"Project"**
4. Pilih repository `sop-katalog-basarnas`
5. Klik **"Import"**

### 3.2 Configure Environment Variables
Di halaman konfigurasi, tambahkan environment variables:

| Name | Value | Keterangan |
|------|-------|------------|
| `DATABASE_URL` | `postgresql://postgres...:6543/postgres` | Pooling connection |
| `DIRECT_DATABASE_URL` | `postgresql://postgres...:5432/postgres` | Direct connection |
| `GOOGLE_CLIENT_ID` | (dari .env) | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | (dari .env) | Google OAuth |
| `GOOGLE_REFRESH_TOKEN` | (dari .env) | Google OAuth |
| `GOOGLE_DRIVE_FOLDER_ID` | (dari .env) | Google Drive |
| `GOOGLE_OWNER_EMAIL` | (dari .env) | Google Drive |
| `NEXTAUTH_SECRET` | (generate baru) | Lihat cara di bawah |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` | URL Vercel |

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### 3.3 Deploy
1. Klik **"Deploy"**
2. Tunggu 2-3 menit
3. Selesai! 🎉

---

## Step 4: Run Database Migration

Setelah deploy pertama, jalankan migration:

### Option A: Via Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Link project
vercel link

# Pull env variables
vercel env pull .env.local

# Run migration
npx prisma migrate deploy
```

### Option B: Via Supabase SQL Editor
1. Buka Supabase Dashboard
2. Klik **SQL Editor**
3. Copy isi dari `prisma/migrations/*/migration.sql`
4. Paste dan jalankan

---

## Step 5: Update Google OAuth

1. Buka https://console.cloud.google.com
2. Pilih project OAuth Anda
3. Tambahkan authorized redirect URI:
   ```
   https://your-app.vercel.app/api/auth/callback/google
   ```

---

## 🔄 Update & Redeploy

Setiap kali Anda push ke GitHub, Vercel akan otomatis redeploy:

```bash
git add .
git commit -m "Update feature"
git push
```

---

## 📊 Monitoring (GRATIS)

### Vercel Dashboard
- Logs: https://vercel.com/dashboard > Project > Deployments
- Analytics: Built-in, gratis
- Speed Insights: Built-in, gratis

### Supabase Dashboard
- Database: https://supabase.com/dashboard
- Logs: Table Editor > Logs
- Storage: Storage menu

---

## 🛠️ Troubleshooting

### Error: Database connection failed
- Pastikan `DATABASE_URL` benar
- Cek password tidak ada karakter special yang perlu escape
- Pastikan IP Vercel tidak diblock (Supabase memperbolehkan semua IP secara default)

### Error: Prisma migration failed
- Gunakan `DIRECT_DATABASE_URL` (port 5432) untuk migration
- Jalankan via Vercel CLI lokal

### Error: Google OAuth failed
- Update redirect URI di Google Console
- Pastikan `NEXTAUTH_URL` sesuai dengan domain Vercel

---

## 📱 Custom Domain (GRATIS)

Vercel menyediakan custom domain gratis:

1. Vercel Dashboard > Project > Settings > Domains
2. Tambahkan domain: `sop.basarnas.go.id`
3. Update DNS records sesuai instruksi
4. SSL otomatis gratis!

---

## 🔐 Keamanan

1. **Jangan commit .env ke GitHub!**
2. Gunakan Vercel Environment Variables
3. Rotate secrets secara berkala
4. Aktifkan 2FA di semua akun

---

## 📞 Support

- Vercel Docs: https://vercel.com/docs
- Supabase Docs: https://supabase.com/docs
- Prisma Docs: https://prisma.io/docs

---

## ✅ Checklist

- [ ] Akun Supabase dibuat
- [ ] Database Supabase dibuat
- [ ] Connection string disalin
- [ ] Kode di-push ke GitHub
- [ ] Akun Vercel dibuat
- [ ] Project di-import ke Vercel
- [ ] Environment variables di-set
- [ ] Deploy berhasil
- [ ] Migration dijalankan
- [ ] Google OAuth di-update
- [ ] Aplikasi berjalan!
