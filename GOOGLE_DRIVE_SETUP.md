# Panduan Setup Google Drive API

## Langkah 1: Buat Project di Google Cloud Console

1. Buka https://console.cloud.google.com
2. Klik "Select a project" → "New Project"
3. Nama project: "SOP Katalog Basarnas"
4. Klik "Create"

## Langkah 2: Aktifkan Google Drive API

1. Di sidebar, pilih "APIs & Services" → "Library"
2. Cari "Google Drive API"
3. Klik "Enable"

## Langkah 3: Konfigurasi OAuth Consent Screen

1. Di sidebar, pilih "APIs & Services" → "OAuth consent screen"
2. Pilih "External" → "Create"
3. Isi form:
   - App name: "SOP Katalog Basarnas"
   - User support email: email Anda
   - Developer contact: email Anda
4. Klik "Save and Continue"
5. Di Scopes, klik "Add or Remove Scopes"
6. Cari dan pilih: `https://www.googleapis.com/auth/drive`
7. Klik "Update" → "Save and Continue"
8. Tambahkan email Anda sebagai Test User
9. "Save and Continue" → "Back to Dashboard"

## Langkah 4: Buat OAuth 2.0 Credentials

1. Di sidebar, pilih "APIs & Services" → "Credentials"
2. Klik "Create Credentials" → "OAuth client ID"
3. Application type: "Web application"
4. Name: "SOP Katalog Client"
5. Authorized redirect URIs:
   - `https://developers.google.com/oauthplayground`
6. Klik "Create"
7. **Copy Client ID dan Client Secret**

## Langkah 5: Generate Refresh Token

1. Buka https://developers.google.com/oauthplayground
2. Klik icon Settings (gear) di kanan atas
3. Centang "Use your own OAuth credentials"
4. Masukkan Client ID dan Client Secret Anda
5. Close settings
6. Di "Input your own scopes", masukkan:
   `https://www.googleapis.com/auth/drive`
7. Klik "Authorize APIs"
8. Login dengan akun Google Anda
9. Klik "Allow" untuk memberikan izin
10. Di Step 2, klik "Exchange authorization code for tokens"
11. **Copy Refresh Token** (dimulai dengan `1//`)

## Langkah 6: Dapatkan Folder ID

1. Buka Google Drive
2. Buat folder untuk menyimpan file SOP (atau gunakan folder yang ada)
3. Buka folder tersebut
4. Copy Folder ID dari URL:
   `https://drive.google.com/drive/folders/[FOLDER_ID]`
   Contoh: `https://drive.google.com/drive/folders/1ABC123xyz`

## Langkah 7: Update file .env

Edit file `/home/z/my-project/.env`:

```env
DATABASE_URL=file:/home/z/my-project/db/custom.db

GOOGLE_CLIENT_ID=123456789012-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghij-abcdefghij
GOOGLE_REFRESH_TOKEN=1//0abcdefghijklmnopqrstuvwxyz
GOOGLE_DRIVE_FOLDER_ID=1ABC123xyz
GOOGLE_OWNER_EMAIL=namaanda@gmail.com
```

## Troubleshooting

### Error: invalid_client
- Pastikan Client ID dan Client Secret benar
- Pastikan OAuth consent screen sudah dikonfigurasi
- Pastikan redirect URI sudah ditambahkan

### Error: unauthorized_client
- Pastikan refresh token dibuat dengan credentials yang sama
- Generate refresh token baru

### Error: access_denied
- Pastikan scope `https://www.googleapis.com/auth/drive` sudah ditambahkan
- Pastikan email Anda ditambahkan sebagai Test User

## Restart Server

Setelah update .env, restart dev server agar perubahan dibaca.
