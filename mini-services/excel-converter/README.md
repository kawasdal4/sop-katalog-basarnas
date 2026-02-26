# Excel to PDF Converter Service

Microservice untuk mengkonversi file Excel ke PDF menggunakan Microsoft Graph API.

## Arsitektur

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Client    │───▶│   R2 (S3)   │───▶│  OneDrive   │───▶│    PDF      │
│  (Next.js)  │    │  Download   │    │   Upload    │    │   Export    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                                │
                                                                ▼
                                                         ┌─────────────┐
                                                         │   R2 (S3)   │
                                                         │   Upload    │
                                                         └─────────────┘
```

## Prasyarat

### 1. Microsoft Azure AD App Registration

1. Buka [Azure Portal](https://portal.azure.com/) > **Azure Active Directory** > **App registrations**
2. Klik **New registration**
3. Isi nama aplikasi, pilih **Accounts in this organizational directory only**
4. Setelah dibuat, catat:
   - **Application (client) ID** → `CLIENT_ID`
   - **Directory (tenant) ID** → `TENANT_ID`
5. Buka **Certificates & secrets** > **New client secret**
6. **PENTING:** Setelah membuat secret, salin **Value** (bukan Secret ID!)
   - **Value** → `CLIENT_SECRET`
   
   > ⚠️ **Peringatan:** Nilai secret hanya ditampilkan sekali! Pastikan Anda menyalin **Value**, bukan **Secret ID**.
   
   Format yang benar:
   - Secret ID: `fbe6771a-33e7-439d-9282-367f962ccd6f` (UUID format - **SALAH**)
   - Secret Value: `AbC123~XyZ.456-def_ghi789` (karakter acak - **BENAR**)

7. Buka **API permissions** > **Add a permission** > **Microsoft Graph**
8. Pilih **Application permissions**:
   - `Files.ReadWrite.All`
   - `Sites.ReadWrite.All`
9. Klik **Grant admin consent** untuk tenant Anda

### 2. Cloudflare R2

Pastikan R2 bucket sudah dikonfigurasi dengan:
- Access Key ID
- Secret Access Key
- Bucket name
- Endpoint URL

## Installation

```bash
cd mini-services/excel-converter
bun install
```

## Configuration

Buat file `.env`:

```env
# Microsoft Graph API
TENANT_ID=your-tenant-id
CLIENT_ID=your-client-id
CLIENT_SECRET=your-client-secret-value  # PENTING: Gunakan Value, bukan Secret ID!

# Cloudflare R2
R2_ACCESS_KEY=your-r2-access-key
R2_SECRET_KEY=your-r2-secret-key
R2_BUCKET=sop-katalog-basarnas
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com

# Service
PORT=3031
NODE_ENV=development
LOG_LEVEL=debug
```

## Running

### Development
```bash
bun run dev
```

### Production
```bash
bun run start
```

## API Endpoints

### Health Check
```
GET /health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "excel-converter",
  "version": "1.0.0",
  "graphApi": "connected"
}
```

### Convert Excel to PDF
```
POST /preview
Content-Type: application/json

{
  "fileKey": "path/to/file.xlsx",
  "force": false
}
```

Response:
```json
{
  "success": true,
  "conversionId": "uuid",
  "previewKey": "path/to/file-preview.pdf",
  "previewUrl": "https://presigned-url...",
  "cached": false,
  "duration": 5000
}
```

### Check Preview Status
```
GET /preview/status?fileKey=path/to/file.xlsx
```

### Delete Preview
```
DELETE /preview?fileKey=path/to/file.xlsx
```

## Page Setup yang Diterapkan

| Setting | Value | Deskripsi |
|---------|-------|-----------|
| Orientation | Landscape | A4 Landscape |
| PaperSize | A4 | Ukuran kertas A4 |
| FitToPagesWide | 1 | Semua kolom dalam 1 halaman |
| FitToPagesTall | 0 | Baris boleh lebih dari 1 halaman |
| Margins | 0.25 inch | Margin minimal |

## Flow Konversi

1. **Download** file Excel dari R2
2. **Upload** ke OneDrive folder `/temp-converter/{uuid}.xlsx`
3. **Set PageSetup** untuk setiap worksheet:
   - orientation = landscape
   - fitToPagesWide = 1
   - fitToPagesTall = 0
4. **Export** ke PDF menggunakan Graph API
5. **Upload** PDF ke R2
6. **Delete** file temporary di OneDrive
7. **Return** presigned URL untuk preview

## Error Handling

- Cleanup otomatis file temporary jika gagal di tengah proses
- Timeout 120 detik untuk Graph API
- Auto-retry jika token expired (401)
- Logging detail untuk debugging

## Integrasi dengan Next.js

```typescript
// Di Next.js API route atau component
const response = await fetch('/preview?XTransformPort=3031', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ fileKey: 'uploads/file.xlsx' })
});

const result = await response.json();
if (result.success) {
  window.open(result.previewUrl, '_blank');
}
```

## Troubleshooting

### Error: "Invalid client secret provided"

**Penyebab:** Anda menggunakan **Client Secret ID** bukan **Client Secret Value**

**Solusi:**
1. Buka Azure Portal > App registrations > aplikasi Anda
2. Buka Certificates & secrets
3. Buat client secret baru
4. Salin **Value** (bukan Secret ID)
5. Update `.env` dengan value yang benar

### Error: "Insufficient privileges"

**Penyebab:** API permissions belum di-grant

**Solusi:**
1. Buka Azure Portal > App registrations > API permissions
2. Pastikan permissions sudah ada: `Files.ReadWrite.All`, `Sites.ReadWrite.All`
3. Klik **Grant admin consent**

### Error: "Connection timeout"

**Penyebab:** Graph API lambat atau file terlalu besar

**Solusi:**
- File maksimal 10MB untuk simple upload
- Tingkatkan timeout: `CONVERSION_TIMEOUT_MS=180000`
