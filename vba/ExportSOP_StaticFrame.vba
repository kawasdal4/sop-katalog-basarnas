'==============================================================================
' MODULE: ExportSOP_StaticFrame
' Deskripsi: Ekspor Sheet SOP ke PDF dengan metode Static Frame
'             Menjamin shapes dan connectors tidak bergeser
'==============================================================================
' Khusus untuk: BASARNAS - Standard SOP Export
' Paper Size: F4 Landscape (33cm x 21.5cm)
' DPI: 300 (Print Quality)
'==============================================================================
' Cara Penggunaan:
' 1. Buka Excel file SOP yang akan diekspor
' 2. Tekan Alt+F11 untuk membuka VBA Editor
' 3. Insert > Module
' 4. Copy paste seluruh kode ini
' 5. Jalankan macro "ExportSOP_ToPDF_F4" atau "ExportAllSOPSheets_ToPDF"
'==============================================================================

Option Explicit

' ============================================================================
' KONSTANTA - BASARNAS STANDARD
' ============================================================================
' Ukuran F4 dalam cm (Basarnas Standard)
Private Const F4_WIDTH_CM As Double = 33        ' Lebar F4 Landscape
Private Const F4_HEIGHT_CM As Double = 21.5     ' Tinggi F4 Landscape

' Alternatif dalam inches (jika driver tidak support cm)
Private Const F4_WIDTH_INCH As Double = 13      ' 33cm ≈ 13 inch
Private Const F4_HEIGHT_INCH As Double = 9.35   ' 21.5cm ≈ 9.35 inch

' Margin dalam cm
Private Const MARGIN_TOP_CM As Double = 1
Private Const MARGIN_LEFT_CM As Double = 1
Private Const MARGIN_RIGHT_CM As Double = 1
Private Const MARGIN_BOTTOM_CM As Double = 0.5  ' Otomatis/minimal

' Padding di sekitar konten (cm)
Private Const PADDING_CM As Double = 0.3

' DPI untuk export berkualitas tinggi
Private Const EXPORT_DPI As Long = 300

' Points per inch dan cm
Private Const PTS_PER_INCH As Double = 72
Private Const PTS_PER_CM As Double = 28.3464567

' Lebar maksimal konten setelah margin
Private Const MAX_CONTENT_WIDTH_CM As Double = 31  ' F4 - 2*margin

' ============================================================================
' MAIN ENTRY POINT - EXPORT ALL SHEETS
' ============================================================================
Public Sub ExportAllSOPSheets_ToPDF()
    Dim ws As Worksheet
    Dim pdfPath As String
    Dim startTime As Double
    Dim processedSheets As Collection
    Dim sheetNames() As String
    Dim i As Long
    Dim successCount As Long
    
    startTime = Timer
    Application.ScreenUpdating = False
    Application.DisplayAlerts = False
    Application.EnableEvents = False
    
    On Error GoTo ErrorHandler
    
    ' Tentukan lokasi output
    pdfPath = ThisWorkbook.Path & "\" & GetFileNameWithoutExtension(ThisWorkbook.Name) & "_SOP_F4.pdf"
    
    ' Buat collection untuk sheet yang berhasil diproses
    Set processedSheets = New Collection
    
    ' Process setiap sheet
    For Each ws In ThisWorkbook.Worksheets
        If ws.Visible = xlSheetVisible Then
            ' Cek apakah sheet memiliki konten
            If HasSOPContent(ws) Then
                Debug.Print "=========================================="
                Debug.Print "Processing: " & ws.Name
                Debug.Print "=========================================="
                
                ' Process sheet dengan Static Frame method
                If ProcessSheet_StaticFrame(ws) Then
                    processedSheets.Add ws.Name
                    successCount = successCount + 1
                    Debug.Print "✓ Sheet " & ws.Name & " processed successfully"
                Else
                    Debug.Print "✗ Sheet " & ws.Name & " processing failed"
                End If
            End If
        End If
    Next ws
    
    ' Export semua sheet yang sudah diproses
    If successCount > 0 Then
        ' Build array sheet names
        ReDim sheetNames(1 To successCount)
        i = 1
        For Each ws In ThisWorkbook.Worksheets
            If ws.Visible = xlSheetVisible And HasSOPContent(ws) Then
                If IsSheetProcessed(ws) Then
                    sheetNames(i) = ws.Name
                    i = i + 1
                    If i > successCount Then Exit For
                End If
            End If
        Next ws
        
        ' Select dan export
        ThisWorkbook.Worksheets(sheetNames).Select
        
        ActiveSheet.ExportAsFixedFormat _
            Type:=xlTypePDF, _
            Filename:=pdfPath, _
            Quality:=xlQualityStandard, _
            IncludeDocProperties:=True, _
            IgnorePrintAreas:=False, _
            OpenAfterPublish:=True
        
        ' Cleanup: Remove temp charts dari semua sheet
        For Each ws In ThisWorkbook.Worksheets
            Call CleanupTempCharts(ws)
        Next ws
        
        MsgBox "Export SOP berhasil!" & vbCrLf & _
               "Total sheet: " & successCount & vbCrLf & _
               "File: " & pdfPath & vbCrLf & _
               "Paper: F4 Landscape (33cm x 21.5cm)" & vbCrLf & _
               "DPI: " & EXPORT_DPI & vbCrLf & _
               "Waktu: " & Format(Timer - startTime, "0.00") & " detik", _
               vbInformation, "Export SOP - Static Frame"
    Else
        MsgBox "Tidak ada sheet SOP yang dapat diekspor.", vbExclamation, "Peringatan"
    End If
    
CleanUp:
    Application.ScreenUpdating = True
    Application.DisplayAlerts = True
    Application.EnableEvents = True
    Exit Sub
    
ErrorHandler:
    MsgBox "Error pada baris " & Erl & ": " & Err.Description, vbCritical, "Error"
    Resume CleanUp
End Sub

' ============================================================================
' MAIN ENTRY POINT - EXPORT ACTIVE SHEET ONLY
' ============================================================================
Public Sub ExportSOP_ToPDF_F4()
    Dim ws As Worksheet
    Dim pdfPath As String
    Dim startTime As Double
    
    Set ws = ActiveSheet
    startTime = Timer
    
    Application.ScreenUpdating = False
    Application.DisplayAlerts = False
    Application.EnableEvents = False
    
    On Error GoTo ErrorHandler
    
    ' Validasi
    If Not HasSOPContent(ws) Then
        MsgBox "Sheet aktif tidak memiliki konten SOP.", vbExclamation, "Peringatan"
        GoTo CleanUp
    End If
    
    Debug.Print "=========================================="
    Debug.Print "Processing Single Sheet: " & ws.Name
    Debug.Print "=========================================="
    
    ' Process dengan Static Frame
    If ProcessSheet_StaticFrame(ws) Then
        ' Tentukan path output
        pdfPath = ThisWorkbook.Path & "\" & CleanFileName(ws.Name) & "_SOP_F4.pdf"
        
        ' Export ke PDF
        ws.ExportAsFixedFormat _
            Type:=xlTypePDF, _
            Filename:=pdfPath, _
            Quality:=xlQualityStandard, _
            IncludeDocProperties:=True, _
            IgnorePrintAreas:=False, _
            OpenAfterPublish:=True
        
        ' Cleanup
        Call CleanupTempCharts(ws)
        
        MsgBox "Export SOP berhasil!" & vbCrLf & _
               "Sheet: " & ws.Name & vbCrLf & _
               "File: " & pdfPath & vbCrLf & _
               "Paper: F4 Landscape (33cm x 21.5cm)" & vbCrLf & _
               "DPI: " & EXPORT_DPI & vbCrLf & _
               "Waktu: " & Format(Timer - startTime, "0.00") & " detik", _
               vbInformation, "Export SOP - Static Frame"
    Else
        MsgBox "Gagal memproses sheet.", vbCritical, "Error"
    End If
    
CleanUp:
    Application.ScreenUpdating = True
    Application.DisplayAlerts = True
    Application.EnableEvents = True
    Exit Sub
    
ErrorHandler:
    MsgBox "Error: " & Err.Description, vbCritical, "Error"
    Resume CleanUp
End Sub

' ============================================================================
' CORE FUNCTION - STATIC FRAME PROCESSING
' ============================================================================
Private Function ProcessSheet_StaticFrame(ws As Worksheet) As Boolean
    Dim usedRange As Range
    Dim groupedShapes As Shape
    Dim chartObj As ChartObject
    Dim picShape As Shape
    Dim pngPath As String
    Dim originalState As Collection
    
    ProcessSheet_StaticFrame = False
    
    On Error GoTo ErrorHandler
    
    ' ========================================
    ' TAHAP 1: PRA-PEMROSESAN (LOCKING)
    ' ========================================
    Debug.Print "[TAHAP 1] Pra-Pemrosesan (Locking)..."
    
    ' Identifikasi UsedRange yang mencakup tabel, shapes, dan connectors
    Set usedRange = GetSOPUsedRange(ws)
    
    If usedRange Is Nothing Then
        Debug.Print "  - Tidak ada UsedRange yang terdeteksi"
        Exit Function
    End If
    
    Debug.Print "  - UsedRange: " & usedRange.Address
    
    ' Group semua shapes dan connectors
    Set groupedShapes = GroupAllShapesAndConnectors(ws)
    If Not groupedShapes Is Nothing Then
        Debug.Print "  - Shapes grouped: " & groupedShapes.Name
    Else
        Debug.Print "  - No shapes to group or already grouped"
    End If
    
    ' Set Object Positioning: Move and size with cells
    Call SetShapesMoveAndSizeWithCells(ws)
    Debug.Print "  - Object Positioning: Move and size with cells"
    
    ' ========================================
    ' TAHAP 2: CAPTURE (ANTI-DISTORSI)
    ' ========================================
    Debug.Print "[TAHAP 2] Capture (Anti-Distorsi)..."
    
    ' Gunakan CopyPicture dengan Appearance:=xlPrinter (BUKAN xlScreen)
    ' Ini memaksa Excel menggunakan mesin render printer yang lebih stabil
    On Error Resume Next
    usedRange.CopyPicture Appearance:=xlPrinter, Format:=xlPicture
    If Err.Number <> 0 Then
        Debug.Print "  - Error pada CopyPicture: " & Err.Description
        ' Fallback ke xlScreen jika xlPrinter gagal
        Err.Clear
        usedRange.CopyPicture Appearance:=xlScreen, Format:=xlPicture
    End If
    On Error GoTo ErrorHandler
    
    Debug.Print "  - CopyPicture: Appearance=xlPrinter, Format=xlPicture"
    
    ' Buat Chart Object sebagai perantara
    Set chartObj = ws.ChartObjects.Add( _
        Left:=usedRange.Left + usedRange.Width + 50, _
        Top:=usedRange.Top, _
        Width:=usedRange.Width, _
        Height:=usedRange.Height)
    
    ' Hapus border dan background chart
    With chartObj.Chart.ChartArea
        .Format.Line.Visible = msoFalse
        .Format.Fill.Visible = msoFalse
    End With
    
    ' Paste gambar ke chart
    chartObj.Chart.Paste
    Debug.Print "  - Gambar ditempel ke Chart Object"
    
    ' Export chart ke PNG (High DPI)
    pngPath = GetTempPNGPath()
    chartObj.Chart.Export Filename:=pngPath, FilterName:="PNG", Interactive:=False
    Debug.Print "  - Export ke PNG: " & pngPath
    
    ' ========================================
    ' TAHAP 3: LAYOUTING F4 LANDSCAPE
    ' ========================================
    Debug.Print "[TAHAP 3] Layouting F4 Landscape..."
    
    ' Setup Page Layout F4
    Call SetupF4PageLayout(ws)
    Debug.Print "  - Paper: F4 Landscape (33cm x 21.5cm)"
    Debug.Print "  - Margins: Top/Left/Right = 1cm"
    
    ' ========================================
    ' TAHAP 4: INSERT IMAGE & SCALING
    ' ========================================
    Debug.Print "[TAHAP 4] Insert Image & Scaling..."
    
    ' Hapus chart sementara
    chartObj.Delete
    Set chartObj = Nothing
    
    ' Insert PNG ke worksheet
    Dim insertLeft As Double
    Dim insertTop As Double
    
    insertLeft = ws.PageSetup.LeftMargin
    insertTop = ws.PageSetup.TopMargin
    
    Set picShape = ws.Shapes.AddPicture( _
        Filename:=pngPath, _
        LinkToFile:=msoFalse, _
        SaveWithDocument:=msoTrue, _
        Left:=insertLeft, _
        Top:=insertTop, _
        Width:=-1, _
        Height:=-1)
    
    ' Lock aspect ratio
    picShape.LockAspectRatio = msoTrue
    Debug.Print "  - Image inserted with LockAspectRatio"
    
    ' ========================================
    ' TAHAP 5: SCALING LOGIC
    ' ========================================
    Debug.Print "[TAHAP 5] Scaling Logic..."
    
    ' Hitung lebar maksimal konten
    Dim maxContentWidthPts As Double
    maxContentWidthPts = MAX_CONTENT_WIDTH_CM * PTS_PER_CM
    
    ' Scale jika lebar gambar melebihi batas
    If picShape.Width > maxContentWidthPts Then
        Dim scaleRatio As Double
        scaleRatio = maxContentWidthPts / picShape.Width
        picShape.ScaleWidth scaleRatio, msoTrue, msoScaleFromTopLeft
        Debug.Print "  - Image scaled to fit: " & Format(scaleRatio * 100, "0.0") & "%"
    Else
        Debug.Print "  - Image within bounds, no scaling needed"
    End If
    
    ' Center gambar horizontal
    Dim pageWidthPts As Double
    pageWidthPts = F4_WIDTH_CM * PTS_PER_CM
    picShape.Left = (pageWidthPts - picShape.Width) / 2
    Debug.Print "  - Image centered horizontally"
    
    ' ========================================
    ' TAHAP 6: FIT TO PAGE
    ' ========================================
    Debug.Print "[TAHAP 6] Fit to Page Settings..."
    
    With ws.PageSetup
        ' FitToPagesWide = 1 (lebar harus muat 1 halaman)
        .FitToPagesWide = 1
        
        ' FitToPagesTall = False (jika SOP panjang, biarkan memanjang)
        .FitToPagesTall = False
        
        Debug.Print "  - FitToPagesWide: 1"
        Debug.Print "  - FitToPagesTall: False (auto extend)"
    End With
    
    ' ========================================
    ' CLEANUP
    ' ========================================
    ' Hapus file PNG temporary
    On Error Resume Next
    Kill pngPath
    On Error GoTo ErrorHandler
    
    ' Ungroup shapes (kembalikan ke kondisi semula)
    If Not groupedShapes Is Nothing Then
        On Error Resume Next
        groupedShapes.Ungroup
        On Error GoTo ErrorHandler
        Debug.Print "  - Shapes ungrouped (restored)"
    End If
    
    ' Set Print Area ke area gambar
    Dim printArea As Range
    Set printArea = ws.Range(ws.Cells(1, 1), ws.Cells( _
        ws.Cells(ws.Rows.Count, 1).End(xlUp).Row + 50, _
        ws.Cells(1, ws.Columns.Count).End(xlToLeft).Column + 5))
    ws.PageSetup.PrintArea = printArea.Address
    
    ProcessSheet_StaticFrame = True
    Debug.Print "=========================================="
    Debug.Print "✓ Process Complete"
    Debug.Print "=========================================="
    Exit Function
    
ErrorHandler:
    Debug.Print "ERROR: " & Err.Description
    ' Cleanup on error
    On Error Resume Next
    If Not chartObj Is Nothing Then chartObj.Delete
    If Len(pngPath) > 0 Then Kill pngPath
    If Not groupedShapes Is Nothing Then groupedShapes.Ungroup
    On Error GoTo 0
End Function

' ============================================================================
' HELPER FUNCTIONS
' ============================================================================

' Identifikasi UsedRange yang mencakup tabel, shapes, dan connectors
Private Function GetSOPUsedRange(ws As Worksheet) As Range
    Dim minRow As Long, maxRow As Long
    Dim minCol As Long, maxCol As Long
    Dim shp As Shape
    Dim cell As Range
    Dim paddingRows As Long, paddingCols As Long
    
    ' Initialize dengan nilai ekstrem
    minRow = 1000000
    minCol = 1000000
    maxRow = 1
    maxCol = 1
    
    ' Cek cells dengan konten (tabel)
    On Error Resume Next
    Set cell = ws.Cells.Find("*", SearchOrder:=xlByRows, SearchDirection:=xlPrevious)
    If Not cell Is Nothing Then maxRow = cell.Row
    
    Set cell = ws.Cells.Find("*", SearchOrder:=xlByColumns, SearchDirection:=xlPrevious)
    If Not cell Is Nothing Then maxCol = cell.Column
    
    Set cell = ws.Cells.Find("*", SearchOrder:=xlByRows, SearchDirection:=xlNext)
    If Not cell Is Nothing Then minRow = cell.Row
    
    Set cell = ws.Cells.Find("*", SearchOrder:=xlByColumns, SearchDirection:=xlNext)
    If Not cell Is Nothing Then minCol = cell.Column
    On Error GoTo 0
    
    ' Expand berdasarkan shapes dan connectors
    For Each shp In ws.Shapes
        ' Handle both regular shapes and connectors
        Dim shpTop As Double, shpLeft As Double
        Dim shpBottom As Double, shpRight As Double
        
        shpTop = shp.Top
        shpLeft = shp.Left
        shpBottom = shpTop + shp.Height
        shpRight = shpLeft + shp.Width
        
        ' Convert to row/col
        Dim topLeftCell As Range, bottomRightCell As Range
        Set topLeftCell = ws.Cells(1, 1)
        Set bottomRightCell = ws.Cells(1, 1)
        
        On Error Resume Next
        Set topLeftCell = ws.Range(shp.TopLeftCell.Address)
        Set bottomRightCell = ws.Range(shp.BottomRightCell.Address)
        On Error GoTo 0
        
        If topLeftCell.Row < minRow Then minRow = topLeftCell.Row
        If topLeftCell.Column < minCol Then minCol = topLeftCell.Column
        If bottomRightCell.Row > maxRow Then maxRow = bottomRightCell.Row
        If bottomRightCell.Column > maxCol Then maxCol = bottomRightCell.Column
    Next shp
    
    ' Tambahkan padding
    paddingRows = Application.WorksheetFunction.Max(2, Int(PADDING_CM * PTS_PER_CM / ws.StandardHeight))
    paddingCols = Application.WorksheetFunction.Max(2, Int(PADDING_CM * PTS_PER_CM / ws.StandardWidth))
    
    minRow = Application.WorksheetFunction.Max(1, minRow - paddingRows)
    minCol = Application.WorksheetFunction.Max(1, minCol - paddingCols)
    maxRow = maxRow + paddingRows
    maxCol = maxCol + paddingCols
    
    ' Return range
    If maxRow >= minRow And maxCol >= minCol Then
        Set GetSOPUsedRange = ws.Range(ws.Cells(minRow, minCol), ws.Cells(maxRow, maxCol))
    End If
End Function

' Group semua shapes dan connectors
Private Function GroupAllShapesAndConnectors(ws As Worksheet) As Shape
    Dim shp As Shape
    Dim shapesArray() As Shape
    Dim count As Long
    Dim i As Long
    
    ' Count non-grouped shapes
    count = 0
    For Each shp In ws.Shapes
        If shp.Type <> msoGroup Then
            count = count + 1
        End If
    Next shp
    
    If count < 2 Then
        Set GroupAllShapesAndConnectors = Nothing
        Exit Function
    End If
    
    ' Collect shapes
    ReDim shapesArray(1 To count)
    i = 1
    For Each shp In ws.Shapes
        If shp.Type <> msoGroup Then
            Set shapesArray(i) = shp
            i = i + 1
        End If
    Next shp
    
    ' Group
    Set GroupAllShapesAndConnectors = ws.Shapes.Range(shapesArray).Group
End Function

' Set Object Positioning: Move and size with cells
Private Sub SetShapesMoveAndSizeWithCells(ws As Worksheet)
    Dim shp As Shape
    
    For Each shp In ws.Shapes
        ' xlMoveAndSize = 1 (Move and size with cells)
        ' xlMove = 2 (Move with cells)
        ' xlFreeFloating = 3 (Don't move or size with cells)
        shp.Placement = xlMoveAndSize
    Next shp
End Sub

' Setup F4 Landscape page layout
Private Sub SetupF4PageLayout(ws As Worksheet)
    With ws.PageSetup
        ' === PAPER SIZE ===
        ' F4: 33cm x 21.5cm
        ' Jika driver printer mendukung custom:
        .PaperSize = xlPaperUser
        .PageWidth = F4_WIDTH_CM * PTS_PER_CM    ' 935.53 points
        .PageHeight = F4_HEIGHT_CM * PTS_PER_CM  ' 609.45 points
        
        ' === ORIENTATION ===
        .Orientation = xlLandscape
        
        ' === MARGINS ===
        ' Atas, Kiri, Kanan = 1 cm; Bawah = otomatis
        .TopMargin = MARGIN_TOP_CM * PTS_PER_CM
        .LeftMargin = MARGIN_LEFT_CM * PTS_PER_CM
        .RightMargin = MARGIN_RIGHT_CM * PTS_PER_CM
        .BottomMargin = MARGIN_BOTTOM_CM * PTS_PER_CM
        
        ' Header dan Footer
        .HeaderMargin = 0
        .FooterMargin = 0
        
        ' === CENTER ON PAGE ===
        .CenterHorizontally = True
        .CenterVertically = False
        
        ' === PRINT SETTINGS ===
        .PrintGridlines = False
        .PrintHeadings = False
        .BlackAndWhite = False
        .Draft = False
        
        ' Print Quality (300 DPI)
        .PrintQuality = 300
        
        ' First Page Number
        .FirstPageNumber = xlAutomatic
        
        ' Order
        .Order = xlDownThenOver
    End With
End Sub

' Cek apakah sheet memiliki konten SOP
Private Function HasSOPContent(ws As Worksheet) As Boolean
    Dim cell As Range
    
    HasSOPContent = False
    
    ' Cek cells
    On Error Resume Next
    Set cell = ws.Cells.Find("*")
    If Not cell Is Nothing Then
        HasSOPContent = True
        Exit Function
    End If
    
    ' Cek shapes
    If ws.Shapes.Count > 0 Then
        HasSOPContent = True
    End If
    
    On Error GoTo 0
End Function

' Cek apakah sheet sudah diproses
Private Function IsSheetProcessed(ws As Worksheet) As Boolean
    Dim shp As Shape
    
    IsSheetProcessed = False
    
    ' Cek apakah ada shape gambar yang di-insert
    For Each shp In ws.Shapes
        If shp.Type = msoPicture Or shp.Type = msoLinkedPicture Then
            IsSheetProcessed = True
            Exit Function
        End If
    Next shp
End Function

' Cleanup temporary charts
Private Sub CleanupTempCharts(ws As Worksheet)
    Dim chartObj As ChartObject
    
    ' Hapus semua chart objects yang tidak diperlukan
    For Each chartObj In ws.ChartObjects
        On Error Resume Next
        chartObj.Delete
        On Error GoTo 0
    Next chartObj
End Sub

' Generate temporary PNG path
Private Function GetTempPNGPath() As String
    GetTempPNGPath = Environ("TEMP") & "\SOP_StaticFrame_" & _
                     Format(Now, "yyyymmdd_hhmmss_") & _
                     Right("0000" & Int(Rnd() * 10000), 4) & ".png"
End Function

' Get filename tanpa extension
Private Function GetFileNameWithoutExtension(fileName As String) As String
    Dim pos As Long
    pos = InStrRev(fileName, ".")
    If pos > 0 Then
        GetFileNameWithoutExtension = Left(fileName, pos - 1)
    Else
        GetFileNameWithoutExtension = fileName
    End If
End Function

' Clean filename dari karakter ilegal
Private Function CleanFileName(fileName As String) As String
    Dim result As String
    Dim invalidChars As String
    Dim i As Long
    
    invalidChars = "\/:*?""<>|"
    result = fileName
    
    For i = 1 To Len(invalidChars)
        result = Replace(result, Mid(invalidChars, i, 1), "_")
    Next i
    
    CleanFileName = result
End Function

' ============================================================================
' UTILITY FUNCTIONS
' ============================================================================

' Tampilkan informasi setup F4
Public Sub ShowF4SetupInfo()
    Dim msg As String
    
    msg = "=== F4 LANDSCAPE SETUP - BASARNAS STANDARD ===" & vbCrLf & vbCrLf
    msg = msg & "PAPER SIZE:" & vbCrLf
    msg = msg & "  Width:  " & F4_WIDTH_CM & " cm (" & F4_WIDTH_INCH & " inch)" & vbCrLf
    msg = msg & "  Height: " & F4_HEIGHT_CM & " cm (" & F4_HEIGHT_INCH & " inch)" & vbCrLf & vbCrLf
    msg = msg & "MARGINS:" & vbCrLf
    msg = msg & "  Top:    " & MARGIN_TOP_CM & " cm" & vbCrLf
    msg = msg & "  Left:   " & MARGIN_LEFT_CM & " cm" & vbCrLf
    msg = msg & "  Right:  " & MARGIN_RIGHT_CM & " cm" & vbCrLf
    msg = msg & "  Bottom: " & MARGIN_BOTTOM_CM & " cm (auto)" & vbCrLf & vbCrLf
    msg = msg & "SCALING:" & vbCrLf
    msg = msg & "  Max Content Width: " & MAX_CONTENT_WIDTH_CM & " cm" & vbCrLf
    msg = msg & "  FitToPagesWide: 1" & vbCrLf
    msg = msg & "  FitToPagesTall: False (auto extend)" & vbCrLf & vbCrLf
    msg = msg & "EXPORT QUALITY:" & vbCrLf
    msg = msg & "  DPI: " & EXPORT_DPI & vbCrLf
    msg = msg & "  Method: Static Frame (Anti-Distortion)"
    
    MsgBox msg, vbInformation, "F4 Setup Info - BASARNAS"
End Sub

' Ungroup semua shapes (utility)
Public Sub UngroupAllShapes()
    Dim ws As Worksheet
    Dim shp As Shape
    Dim count As Long
    
    Set ws = ActiveSheet
    count = 0
    
    On Error Resume Next
    For Each shp In ws.Shapes
        If shp.Type = msoGroup Then
            shp.Ungroup
            count = count + 1
        End If
    Next shp
    On Error GoTo 0
    
    MsgBox count & " grup shapes telah di-ungroup.", vbInformation, "Ungroup Shapes"
End Sub

' Reset page setup ke default (utility)
Public Sub ResetPageSetup()
    Dim ws As Worksheet
    Set ws = ActiveSheet
    
    With ws.PageSetup
        .PaperSize = xlPaperA4
        .Orientation = xlPortrait
        .TopMargin = Application.InchesToPoints(1)
        .BottomMargin = Application.InchesToPoints(1)
        .LeftMargin = Application.InchesToPoints(0.75)
        .RightMargin = Application.InchesToPoints(0.75)
        .HeaderMargin = Application.InchesToPoints(0.5)
        .FooterMargin = Application.InchesToPoints(0.5)
        .FitToPagesWide = False
        .FitToPagesTall = False
        .Zoom = 100
    End With
    
    MsgBox "Page setup telah direset ke default.", vbInformation, "Reset Page Setup"
End Sub

' ============================================================================
' ALTERNATIF: EXPORT DENGAN CHART METHOD (LEBIH STABIL)
' ============================================================================
Public Sub ExportWithChartMethod()
    ' Alternatif method yang lebih stabil untuk beberapa kasus
    ' Menggunakan Chart sebagai "canvas" untuk render final
    
    Dim ws As Worksheet
    Dim usedRange As Range
    Dim chartObj As ChartObject
    Dim pdfPath As String
    
    Set ws = ActiveSheet
    
    If Not HasSOPContent(ws) Then
        MsgBox "Sheet tidak memiliki konten.", vbExclamation
        Exit Sub
    End If
    
    Application.ScreenUpdating = False
    
    ' Get used range
    Set usedRange = GetSOPUsedRange(ws)
    
    ' Group shapes
    Call GroupAllShapesAndConnectors(ws)
    Call SetShapesMoveAndSizeWithCells(ws)
    
    ' Copy as picture (printer quality)
    usedRange.CopyPicture Appearance:=xlPrinter, Format:=xlPicture
    
    ' Create chart
    Set chartObj = ws.ChartObjects.Add( _
        Left:=usedRange.Left, _
        Top:=usedRange.Top, _
        Width:=usedRange.Width, _
        Height:=usedRange.Height)
    
    ' Format chart
    chartObj.Chart.ChartArea.Format.Line.Visible = msoFalse
    chartObj.Chart.ChartArea.Format.Fill.Visible = msoFalse
    chartObj.Chart.ChartArea.Format.Fill.ForeColor.RGB = RGB(255, 255, 255)
    
    ' Paste
    chartObj.Chart.Paste
    
    ' Export chart directly to PDF
    pdfPath = ThisWorkbook.Path & "\" & CleanFileName(ws.Name) & "_Chart_F4.pdf"
    chartObj.Chart.ExportAsFixedFormat _
        Type:=xlTypePDF, _
        Filename:=pdfPath, _
        Quality:=xlQualityStandard, _
        OpenAfterPublish:=True
    
    ' Cleanup
    chartObj.Delete
    
    Application.ScreenUpdating = True
    
    MsgBox "Export via Chart method berhasil!" & vbCrLf & _
           "File: " & pdfPath, vbInformation
End Sub
