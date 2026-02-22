# Excel Screen Render Preview Engine

## Overview

This engine captures the Excel worksheet layout **exactly as displayed on screen**, preserving all shapes, connectors, flowcharts, and object alignment.

### Key Difference from Print Engine

| Aspect | Print Engine | Screen Render |
|--------|-------------|---------------|
| Method | ExportAsFixedFormat | CopyPicture / Direct render |
| Scaling | Page setup scaling | None (100% zoom) |
| Shapes | May shift positions | Stay in place |
| Printer | Required | Not needed |
| Layout | Reformatted | Preserved |

## Files

```
screen-render-preview/
├── excel_screen_render.py      # Windows COM version (CopyPicture)
├── excel_screen_render_linux.py # Linux version (LibreOffice)
└── README.md
```

## Windows COM Version

### Requirements
- Windows Server with Microsoft Excel
- Python 3.x
- pywin32: `pip install pywin32`
- Pillow: `pip install Pillow`
- ReportLab: `pip install reportlab`

### Usage
```powershell
python excel_screen_render.py input.xlsx output.pdf [dpi]
```

### Process Flow
1. Open Excel via COM Automation
2. Set Zoom = 100%
3. For each worksheet:
   - Activate worksheet
   - Get UsedRange
   - CopyPicture (xlScreen, xlBitmap)
   - Save as PNG
4. Create Landscape PDF from images
5. Flexible height (auto-expand)

### Key Code
```python
# Capture screen-rendered image
used_range.CopyPicture(Appearance=xlScreen, Format=xlBitmap)

# Paste to chart and export
chart.Paste()
chart.Export(image_path, FilterName="PNG")
```

## Linux Version

### Requirements
- LibreOffice
- Python 3.x
- pdf2image (optional): `pip install pdf2image`

### Usage
```bash
python excel_screen_render_linux.py input.xlsx output.pdf
```

### Process Flow
1. Convert Excel to PDF with default settings
2. No page setup modifications
3. Preserves original layout

## Output Characteristics

| Property | Value |
|----------|-------|
| Orientation | Landscape |
| Width | Fixed (A4/F4 landscape) |
| Height | Flexible (auto-expand) |
| Horizontal fit | All columns visible |
| Vertical | Scrolling allowed |

## Expected Results

✅ Flowcharts remain intact
✅ Connectors stay attached
✅ No object displacement
✅ No portrait fallback
✅ Horizontal layout complete
✅ Preview like long scroll canvas

## Integration with PDF Converter Service

The PDF converter service (port 3004) uses the screen render approach:

```bash
curl -X POST http://localhost:3004/convert \
  -H "Content-Type: application/json" \
  -d '{"fileBase64": "...", "fileName": "document.xlsx"}'
```

Response:
```json
{
  "success": true,
  "pdfBase64": "...",
  "method": "SCREEN RENDER PREVIEW"
}
```

## Troubleshooting

### Windows: CopyPicture fails
- Ensure Excel is visible: `excel.Visible = True`
- Wait for screen refresh: `time.sleep(0.5)`
- Try alternative: window capture with PIL ImageGrab

### Linux: PDF layout differs
- Check LibreOffice version
- Try opening in Excel to compare
- Verify original file layout

### Shapes still displaced
- Verify Zoom = 100%
- Check if shapes are anchored to cells
- Use Windows COM version for best fidelity
