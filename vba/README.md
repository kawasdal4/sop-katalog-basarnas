# 📋 Panduan Export Excel ke PDF - Shapes Terjaga

## ⚠️ Masalah yang Ditemukan

LibreOffice (dan tools Linux lainnya) **tidak dapat merender shapes/connectors Excel dengan benar** karena:

1. **twoCellAnchor** - Shapes diikat ke posisi cell, tapi saat rendering, posisi bergeser
2. **Fit-to-page** - Scaling tidak diaplikasikan konsisten ke shapes
3. **Connector links** - Panah/garis penghubung tidak mengikuti shapes

---

## ✅ Solusi: VBA Script untuk Excel Desktop

### Lokasi File VBA
```
/home/z/my-project/vba/ExportSOP_StaticFrame.vba
```

### Cara Penggunaan

1. **Buka file Excel** yang berisi SOP/Flowchart

2. **Tekan Alt + F11** (buka VBA Editor)

3. **Insert > Module** (di menu)

4. **Copy paste** seluruh isi file `ExportSOP_StaticFrame.vba`

5. **Tekan F5** atau **Run > Run Sub/UserForm**

6. **Pilih macro** yang ingin dijalankan:
   - `ExportAllSOPSheets_ToPDF` - Export semua sheet
   - `ExportSOP_ToPDF_F4` - Export sheet aktif saja

### Output
- **Paper**: F4 Landscape (33cm x 21.5cm)
- **DPI**: 300 (Print Quality)
- **Shapes**: Posisi terjaga ✅
- **Connectors**: Terhubung dengan benar ✅

---

## 📌 Pipeline VBA (Static Frame Method)

```
┌─────────────────────────────────────────────────────────────────┐
│ TAHAP 1: PRA-PEMROSESAN (LOCKING)                              │
├─────────────────────────────────────────────────────────────────┤
│ • Identifikasi UsedRange (tabel + shapes + connectors)         │
│ • Group semua Shapes dan Connectors                            │
│ • Set Object Positioning = "Move and size with cells"          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ TAHAP 2: CAPTURE (ANTI-DISTORSI)                               │
├─────────────────────────────────────────────────────────────────┤
│ • Range.CopyPicture Appearance:=xlPrinter (Print Quality)      │
│ • Chart Object sebagai perantara                               │
│ • Export ke PNG (300 DPI)                                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ TAHAP 3: LAYOUTING F4 LANDSCAPE                                │
├─────────────────────────────────────────────────────────────────┤
│ • Paper: F4 (33cm x 21.5cm)                                    │
│ • Margins: Atas/Kiri/Kanan = 1cm                               │
│ • Orientation: Landscape                                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ TAHAP 4: SCALING & EXPORT                                      │
├─────────────────────────────────────────────────────────────────┤
│ • LockAspectRatio = True                                        │
│ • Auto-scale jika lebar > 31cm                                 │
│ • FitToPagesWide = 1, FitToPagesTall = False                   │
│ • ExportAsFixedFormat xlTypePDF                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 File yang Tersedia

| File | Deskripsi |
|------|-----------|
| `ExportSOP_StaticFrame.vba` | **TERBAIK** - Static Frame dengan anti-distorsi |
| `ExportToPDF_StaticRender.vba` | Static Render dengan Chart Object |
| `ExportToPDF_F4.vba` | Basic F4 export |

---

## 🔧 Konstanta BASARNAS Standard

```vba
F4_WIDTH_CM = 33        ' Lebar F4 Landscape
F4_HEIGHT_CM = 21.5     ' Tinggi F4 Landscape
MARGIN_TOP = 1 cm
MARGIN_LEFT = 1 cm
MARGIN_RIGHT = 1 cm
DPI = 300
```

---

## ⚡ Tips Tambahan

1. **Group shapes** sebelum export agar posisi terkunci
2. **Set Placement = xlMoveAndSize** agar shapes mengikuti cell
3. **Gunakan Print Quality** (xlPrinter) bukan Screen Quality (xlScreen)
4. **Preview di Print Preview** sebelum export untuk verifikasi

---

## 🖥️ Untuk Server Linux

Karena limitasi LibreOffice, disarankan:
1. **Download file Excel** dari aplikasi
2. **Buka di Excel Desktop** (Windows/Mac)
3. **Jalankan VBA script** untuk hasil terbaik

---

## 📞 Bantuan

Jika ada pertanyaan atau masalah, hubungi tim developer.
