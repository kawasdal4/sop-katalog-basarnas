'==============================================================================
' MODULE: ExportToPDF_StaticRender
' Deskripsi: Ekspor Excel ke PDF dengan metode "Static Render"
'            Menjamin posisi shapes dan connectors tidak bergeser
'==============================================================================
' Cara Penggunaan:
' 1. Buka Excel file yang berisi SOP/Flowchart
' 2. Tekan Alt+F11 untuk membuka VBA Editor
' 3. Insert > Module
' 4. Copy paste seluruh kode ini
' 5. Jalankan macro "ExportAllSheetsToPDF_Static"
'==============================================================================

Option Explicit

' ============================================================================
' KONSTANTA
' ============================================================================
Private Const F4_WIDTH_CM As Double = 33      ' Lebar F4 Landscape (cm)
Private Const F4_HEIGHT_CM As Double = 21.5   ' Tinggi F4 Landscape (cm)
Private Const MARGIN_CM As Double = 1         ' Margin (cm)
Private Const PADDING_CM As Double = 0.5      ' Padding di sekitar konten (cm)
Private Const MAX_CONTENT_WIDTH_CM As Double = 31  ' Lebar maksimal konten (F4 - 2*margin)
Private Const DPI As Long = 300               ' DPI untuk export

' Points per cm
Private Const PTS_PER_CM As Double = 28.3464567

' ============================================================================
' MAIN ENTRY POINT
' ============================================================================
Public Sub ExportAllSheetsToPDF_Static()
    Dim ws As Worksheet
    Dim pdfPath As String
    Dim startTime As Double
    Dim sheetCount As Long
    
    startTime = Timer
    Application.ScreenUpdating = False
    Application.DisplayAlerts = False
    Application.EnableEvents = False
    
    On Error GoTo ErrorHandler
    
    ' Tentukan path output
    pdfPath = ThisWorkbook.Path & "\" & GetFileNameWithoutExtension(ThisWorkbook.Name) & "_F4_Static.pdf"
    
    ' Buat temporary workbook untuk hasil
    Dim tempWb As Workbook
    Set tempWb = Workbooks.Add
    
    ' Process setiap sheet
    sheetCount = 0
    For Each ws In ThisWorkbook.Worksheets
        If ws.Visible = xlSheetVisible And HasContent(ws) Then
            sheetCount = sheetCount + 1
            Debug.Print "Processing sheet: " & ws.Name
            
            ' Process sheet dan tambahkan ke temp workbook
            Call ProcessSheet_StaticRender(ws, tempWb)
        End If
    Next ws
    
    If sheetCount > 0 Then
        ' Hapus sheet default di temp workbook
        Application.DisplayAlerts = False
        Do While tempWb.Worksheets.Count > sheetCount
            tempWb.Worksheets(1).Delete
        Loop
        
        ' Export temp workbook ke PDF
        tempWb.ExportAsFixedFormat _
            Type:=xlTypePDF, _
            Filename:=pdfPath, _
            Quality:=xlQualityStandard, _
            IncludeDocProperties:=True, _
            IgnorePrintAreas:=False, _
            OpenAfterPublish:=True
        
        ' Tutup temp workbook tanpa save
        tempWb.Close SaveChanges:=False
        
        MsgBox "Export berhasil!" & vbCrLf & _
               "File: " & pdfPath & vbCrLf & _
               "Total sheet: " & sheetCount & vbCrLf & _
               "Waktu: " & Format(Timer - startTime, "0.00") & " detik", _
               vbInformation, "Export PDF Static Render"
    Else
        tempWb.Close SaveChanges:=False
        MsgBox "Tidak ada sheet dengan konten untuk diekspor.", vbExclamation
    End If
    
CleanUp:
    Application.ScreenUpdating = True
    Application.DisplayAlerts = True
    Application.EnableEvents = True
    Exit Sub
    
ErrorHandler:
    MsgBox "Error: " & Err.Description & " (Line: " & Erl & ")", vbCritical, "Error"
    Resume CleanUp
End Sub

' ============================================================================
' PROCESS SHEET - STATIC RENDER METHOD
' ============================================================================
Private Sub ProcessSheet_StaticRender(sourceWs As Worksheet, tempWb As Workbook)
    Dim usedRange As Range
    Dim tempWs As Worksheet
    Dim chartObj As ChartObject
    Dim picObj As Shape
    Dim pngPath As String
    Dim groupShape As Shape
    
    ' ========================================
    ' TAHAP 1: GROUP SEMUA SHAPES (Anti-Shift)
    ' ========================================
    Debug.Print "  [1] Grouping shapes..."
    Set groupShape = GroupAllShapesAndConnectors(sourceWs)
    
    ' Set semua shape agar "Move and size with cells"
    Call SetShapesMoveWithCells(sourceWs)
    
    ' ========================================
    ' TAHAP 2: TENTUKAN USED RANGE + PADDING
    ' ========================================
    Debug.Print "  [2] Determining UsedRange with padding..."
    Set usedRange = GetUsedRangeWithPadding(sourceWs, PADDING_CM)
    
    If usedRange Is Nothing Then
        Debug.Print "  No content found, skipping..."
        Exit Sub
    End If
    
    ' ========================================
    ' TAHAP 3: HIGH-RESOLUTION CAPTURE
    ' ========================================
    Debug.Print "  [3] High-resolution capture (xlPrinter)..."
    
    ' Copy as Picture dengan kualitas PRINT (bukan screen)
    usedRange.CopyPicture Appearance:=xlPrinter, Format:=xlPicture
    
    ' Buat Chart Object untuk export PNG
    Set chartObj = sourceWs.ChartObjects.Add( _
        Left:=usedRange.Left, _
        Top:=usedRange.Top, _
        Width:=usedRange.Width, _
        Height:=usedRange.Height)
    
    ' Hapus border chart
    chartObj.Chart.ChartArea.Format.Line.Visible = msoFalse
    chartObj.Chart.ChartArea.Format.Fill.Visible = msoFalse
    
    ' Paste gambar ke chart
    chartObj.Chart.Paste
    
    ' Export chart ke PNG (high resolution)
    pngPath = Environ("TEMP") & "\excel_export_" & Format(Now, "yyyymmddhhmmss") & ".png"
    chartObj.Chart.Export Filename:=pngPath, FilterName:="PNG"
    
    ' Hapus chart object
    chartObj.Delete
    
    ' ========================================
    ' TAHAP 4: BUAT TEMP SHEET DENGAN F4 LAYOUT
    ' ========================================
    Debug.Print "  [4] Creating F4 Landscape layout..."
    
    Set tempWs = tempWb.Worksheets.Add(After:=tempWb.Worksheets(tempWb.Worksheets.Count))
    tempWs.Name = Left(sourceWs.Name, 20) & "_F4"
    
    ' Setup F4 Landscape page
    Call SetupF4Page_Static(tempWs)
    
    ' ========================================
    ' TAHAP 5: INSERT PNG DENGAN AUTO-SIZE
    ' ========================================
    Debug.Print "  [5] Inserting PNG with LockAspectRatio..."
    
    ' Insert PNG
    Set picObj = tempWs.Shapes.AddPicture( _
        Filename:=pngPath, _
        LinkToFile:=msoFalse, _
        SaveWithDocument:=msoTrue, _
        Left:=tempWs.PageSetup.LeftMargin, _
        Top:=tempWs.PageSetup.TopMargin, _
        Width:=-1, _
        Height:=-1)
    
    ' Lock aspect ratio
    picObj.LockAspectRatio = msoTrue
    
    ' Hitung ukuran maksimal yang diizinkan
    Dim maxWidthPts As Double
    maxWidthPts = MAX_CONTENT_WIDTH_CM * PTS_PER_CM
    
    ' Scale jika melebihi lebar maksimal
    If picObj.Width > maxWidthPts Then
        Dim scaleRatio As Double
        scaleRatio = maxWidthPts / picObj.Width
        picObj.ScaleWidth scaleRatio, msoTrue, msoScaleFromTopLeft
    End If
    
    ' Center gambar
    picObj.Left = (F4_WIDTH_CM * PTS_PER_CM - picObj.Width) / 2
    
    ' ========================================
    ' TAHAP 6: CLEANUP
    ' ========================================
    Debug.Print "  [6] Cleanup..."
    
    ' Hapus file PNG temporary
    On Error Resume Next
    Kill pngPath
    On Error GoTo 0
    
    ' Ungroup shapes di source (kembalikan seperti semula)
    If Not groupShape Is Nothing Then
        groupShape.Ungroup
    End If
    
    Debug.Print "  Done!"
End Sub

' ============================================================================
' HELPER FUNCTIONS
' ============================================================================

' Group semua shapes dan connectors
Private Function GroupAllShapesAndConnectors(ws As Worksheet) As Shape
    Dim shp As Shape
    Dim shapesToGroup() As Shape
    Dim count As Long
    Dim i As Long
    Dim groupObj As Shape
    
    ' Count shapes yang belum di-group
    count = 0
    For Each shp In ws.Shapes
        If shp.Type <> msoGroup Then
            count = count + 1
        End If
    Next shp
    
    If count < 2 Then
        ' Tidak bisa group jika kurang dari 2 shapes
        Set GroupAllShapesAndConnectors = Nothing
        Exit Function
    End If
    
    ' Collect semua shapes
    ReDim shapesToGroup(1 To count)
    i = 1
    For Each shp In ws.Shapes
        If shp.Type <> msoGroup Then
            Set shapesToGroup(i) = shp
            i = i + 1
        End If
    Next shp
    
    ' Group
    Set groupObj = ws.Shapes.Range(shapesToGroup).Group
    
    Set GroupAllShapesAndConnectors = groupObj
End Function

' Set semua shape agar "Move and size with cells"
Private Sub SetShapesMoveWithCells(ws As Worksheet)
    Dim shp As Shape
    
    For Each shp In ws.Shapes
        ' Placement: xlMoveAndSize = 1, xlMove = 2, xlFreeFloating = 3
        shp.Placement = xlMoveAndSize
    Next shp
End Sub

' Tentukan UsedRange termasuk shapes dengan padding
Private Function GetUsedRangeWithPadding(ws As Worksheet, paddingCm As Double) As Range
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
    
    ' Cek cells dengan konten
    On Error Resume Next
    Set cell = ws.Cells.Find("*", SearchOrder:=xlByRows, SearchDirection:=xlPrevious)
    If Not cell Is Nothing Then
        maxRow = cell.Row
    End If
    Set cell = ws.Cells.Find("*", SearchOrder:=xlByColumns, SearchDirection:=xlPrevious)
    If Not cell Is Nothing Then
        maxCol = cell.Column
    End If
    
    ' Cek cells dari awal
    Set cell = ws.Cells.Find("*", SearchOrder:=xlByRows, SearchDirection:=xlNext)
    If Not cell Is Nothing Then
        minRow = cell.Row
    End If
    Set cell = ws.Cells.Find("*", SearchOrder:=xlByColumns, SearchDirection:=xlNext)
    If Not cell Is Nothing Then
        minCol = cell.Column
    End If
    On Error GoTo 0
    
    ' Expand berdasarkan shapes
    For Each shp In ws.Shapes
        If shp.TopLeftCell.Row < minRow Then minRow = shp.TopLeftCell.Row
        If shp.TopLeftCell.Column < minCol Then minCol = shp.TopLeftCell.Column
        If shp.BottomRightCell.Row > maxRow Then maxRow = shp.BottomRightCell.Row
        If shp.BottomRightCell.Column > maxCol Then maxCol = shp.BottomRightCell.Column
    Next shp
    
    ' Hitung padding dalam rows/cols (approximate)
    paddingRows = Application.WorksheetFunction.Max(1, Int(paddingCm * PTS_PER_CM / ws.StandardHeight))
    paddingCols = Application.WorksheetFunction.Max(1, Int(paddingCm * PTS_PER_CM / ws.StandardWidth))
    
    ' Apply padding
    minRow = Application.WorksheetFunction.Max(1, minRow - paddingRows)
    minCol = Application.WorksheetFunction.Max(1, minCol - paddingCols)
    maxRow = maxRow + paddingRows
    maxCol = maxCol + paddingCols
    
    ' Return range
    If maxRow >= minRow And maxCol >= minCol Then
        Set GetUsedRangeWithPadding = ws.Range(ws.Cells(minRow, minCol), ws.Cells(maxRow, maxCol))
    End If
End Function

' Setup halaman F4 Landscape dengan setting untuk 1 halaman
Private Sub SetupF4Page_Static(ws As Worksheet)
    With ws.PageSetup
        ' Paper Size: Custom F4
        ' Note: Jika F4 tidak ada di driver printer, gunakan Custom Size
        .PaperSize = xlPaperUser
        .PageWidth = F4_WIDTH_CM * PTS_PER_CM   ' 33 cm
        .PageHeight = F4_HEIGHT_CM * PTS_PER_CM ' 21.5 cm
        
        ' Orientation: Landscape
        .Orientation = xlLandscape
        
        ' Margins: 1 cm semua sisi
        .LeftMargin = MARGIN_CM * PTS_PER_CM
        .RightMargin = MARGIN_CM * PTS_PER_CM
        .TopMargin = MARGIN_CM * PTS_PER_CM
        .BottomMargin = MARGIN_CM * PTS_PER_CM
        .HeaderMargin = 0
        .FooterMargin = 0
        
        ' Center on page
        .CenterHorizontally = True
        .CenterVertically = True
        
        ' FIT TO PAGE - 1 sheet = 1 halaman
        .FitToPagesWide = 1
        .FitToPagesTall = 1
        .Zoom = False
        
        ' Print area
        .PrintArea = ""
        .PrintTitleRows = ""
        .PrintTitleColumns = ""
        
        ' Print gridlines = False
        .PrintGridlines = False
        .PrintHeadings = False
    End With
End Sub

' Cek apakah sheet memiliki konten
Private Function HasContent(ws As Worksheet) As Boolean
    Dim cell As Range
    Dim shp As Shape
    
    HasContent = False
    
    ' Cek cells
    On Error Resume Next
    Set cell = ws.Cells.Find("*")
    If Not cell Is Nothing Then
        HasContent = True
        Exit Function
    End If
    
    ' Cek shapes
    If ws.Shapes.Count > 0 Then
        HasContent = True
        Exit Function
    End If
    
    On Error GoTo 0
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

' ============================================================================
' ALTERNATIF: EXPORT ACTIVE SHEET ONLY
' ============================================================================
Public Sub ExportActiveSheetToPDF_Static()
    Dim ws As Worksheet
    Dim tempWb As Workbook
    Dim tempWs As Worksheet
    Dim usedRange As Range
    Dim chartObj As ChartObject
    Dim picObj As Shape
    Dim pngPath As String
    Dim pdfPath As String
    Dim groupShape As Shape
    
    Set ws = ActiveSheet
    
    If Not HasContent(ws) Then
        MsgBox "Sheet tidak memiliki konten.", vbExclamation
        Exit Sub
    End If
    
    Application.ScreenUpdating = False
    Application.DisplayAlerts = False
    
    ' Group shapes
    Set groupShape = GroupAllShapesAndConnectors(ws)
    Call SetShapesMoveWithCells(ws)
    
    ' Get used range
    Set usedRange = GetUsedRangeWithPadding(ws, PADDING_CM)
    
    ' Capture as picture (PRINT QUALITY)
    usedRange.CopyPicture Appearance:=xlPrinter, Format:=xlPicture
    
    ' Create chart for export
    Set chartObj = ws.ChartObjects.Add( _
        Left:=usedRange.Left, Top:=usedRange.Top, _
        Width:=usedRange.Width, Height:=usedRange.Height)
    chartObj.Chart.ChartArea.Format.Line.Visible = msoFalse
    chartObj.Chart.ChartArea.Format.Fill.Visible = msoFalse
    chartObj.Chart.Paste
    
    ' Export to PNG
    pngPath = Environ("TEMP") & "\excel_export_single_" & Format(Now, "yyyymmddhhmmss") & ".png"
    chartObj.Chart.Export Filename:=pngPath, FilterName:="PNG"
    chartObj.Delete
    
    ' Create temp workbook
    Set tempWb = Workbooks.Add
    Set tempWs = tempWb.Worksheets(1)
    tempWs.Name = Left(ws.Name, 20) & "_F4"
    
    ' Setup F4 page
    Call SetupF4Page_Static(tempWs)
    
    ' Insert PNG
    Set picObj = tempWs.Shapes.AddPicture( _
        Filename:=pngPath, LinkToFile:=msoFalse, SaveWithDocument:=msoTrue, _
        Left:=tempWs.PageSetup.LeftMargin, Top:=tempWs.PageSetup.TopMargin, _
        Width:=-1, Height:=-1)
    
    picObj.LockAspectRatio = msoTrue
    
    ' Scale if needed
    Dim maxWidthPts As Double
    maxWidthPts = MAX_CONTENT_WIDTH_CM * PTS_PER_CM
    If picObj.Width > maxWidthPts Then
        picObj.ScaleWidth maxWidthPts / picObj.Width, msoTrue, msoScaleFromTopLeft
    End If
    
    ' Center
    picObj.Left = (F4_WIDTH_CM * PTS_PER_CM - picObj.Width) / 2
    
    ' Export
    pdfPath = ThisWorkbook.Path & "\" & ws.Name & "_F4_Static.pdf"
    tempWs.ExportAsFixedFormat _
        Type:=xlTypePDF, Filename:=pdfPath, _
        Quality:=xlQualityStandard, OpenAfterPublish:=True
    
    ' Cleanup
    tempWb.Close SaveChanges:=False
    Kill pngPath
    
    If Not groupShape Is Nothing Then groupShape.Ungroup
    
    Application.ScreenUpdating = True
    Application.DisplayAlerts = True
    
    MsgBox "Export berhasil: " & pdfPath, vbInformation
End Sub

' ============================================================================
' UTILITY: SHOW PAGE SETUP INFO
' ============================================================================
Public Sub ShowF4PageSetupInfo()
    Dim msg As String
    msg = "F4 Landscape Page Setup:" & vbCrLf & vbCrLf
    msg = msg & "Paper Size: " & F4_WIDTH_CM & "cm x " & F4_HEIGHT_CM & "cm" & vbCrLf
    msg = msg & "Page Width: " & F4_WIDTH_CM * PTS_PER_CM & " pts" & vbCrLf
    msg = msg & "Page Height: " & F4_HEIGHT_CM * PTS_PER_CM & " pts" & vbCrLf
    msg = msg & "Margins: " & MARGIN_CM & "cm (all sides)" & vbCrLf
    msg = msg & "Max Content Width: " & MAX_CONTENT_WIDTH_CM & "cm" & vbCrLf
    msg = msg & "Fit to Pages: 1x1" & vbCrLf
    msg = msg & "DPI: " & DPI
    MsgBox msg, vbInformation, "F4 Page Setup Info"
End Sub
