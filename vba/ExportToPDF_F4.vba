'==============================================================================
' MODULE: ExportToPDF_F4
' Deskripsi: Ekspor setiap sheet Excel ke PDF dengan ukuran F4 Landscape
'            dengan menjaga posisi shapes dan connectors tetap utuh
'==============================================================================
' Cara Penggunaan:
' 1. Buka Excel file yang berisi SOP/Flowchart
' 2. Tekan Alt+F11 untuk membuka VBA Editor
' 3. Insert > Module
' 4. Copy paste seluruh kode ini
' 5. Jalankan macro "ExportAllSheetsToPDF_F4"
'==============================================================================

Option Explicit

' Konstanta ukuran F4 dalam cm
Private Const F4_WIDTH_CM As Double = 33       ' Lebar F4 Landscape
Private Const F4_HEIGHT_CM As Double = 21.5    ' Tinggi F4 Landscape
Private Const MARGIN_CM As Double = 1          ' Margin (cm)
Private Const DPI As Long = 300                ' DPI untuk kualitas tinggi

' Entry Point Utama - Export semua sheet ke satu PDF
Public Sub ExportAllSheetsToPDF_F4()
    Dim ws As Worksheet
    Dim tempSheets As Collection
    Dim pdfPath As String
    Dim startTime As Double
    Dim i As Long
    
    startTime = Timer
    Application.ScreenUpdating = False
    Application.DisplayAlerts = False
    Application.EnableEvents = False
    
    On Error GoTo ErrorHandler
    
    ' Tentukan lokasi output
    pdfPath = ThisWorkbook.Path & "\" & GetFileNameWithoutExtension(ThisWorkbook.Name) & "_F4_Landscape.pdf"
    
    ' Buat collection untuk temporary sheets
    Set tempSheets = New Collection
    
    ' Proses setiap sheet
    For Each ws In ThisWorkbook.Worksheets
        If ws.Visible = xlSheetVisible And HasContent(ws) Then
            Debug.Print "Processing: " & ws.Name
            Call ProcessSheetToTemp(ws, tempSheets)
        End If
    Next ws
    
    ' Select semua temp sheets dan export
    If tempSheets.Count > 0 Then
        Dim sheetNames() As String
        ReDim sheetNames(1 To tempSheets.Count)
        
        For i = 1 To tempSheets.Count
            sheetNames(i) = tempSheets(i).Name
        Next i
        
        ' Export semua temp sheets
        ThisWorkbook.Worksheets(sheetNames).Select
        ActiveSheet.ExportAsFixedFormat _
            Type:=xlTypePDF, _
            Filename:=pdfPath, _
            Quality:=xlQualityStandard, _
            IncludeDocProperties:=True, _
            IgnorePrintAreas:=False, _
            OpenAfterPublish:=True
        
        ' Hapus temp sheets
        Application.DisplayAlerts = False
        For i = tempSheets.Count To 1 Step -1
            tempSheets(i).Delete
        Next i
        
        MsgBox "Export berhasil!" & vbCrLf & _
               "File: " & pdfPath & vbCrLf & _
               "Waktu: " & Format(Timer - startTime, "0.00") & " detik", _
               vbInformation, "Export PDF F4 Landscape"
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

' Proses single sheet ke temporary sheet
Private Sub ProcessSheetToTemp(ws As Worksheet, tempSheets As Collection)
    Dim usedRange As Range
    Dim tempWs As Worksheet
    Dim picObj As Shape
    
    ' Identifikasi UsedRange (termasuk shapes)
    Set usedRange = GetActualUsedRange(ws)
    If usedRange Is Nothing Then Exit Sub
    
    ' Capture sebagai Picture (Print Quality - kunci utama!)
    usedRange.CopyPicture Appearance:=xlPrinter, Format:=xlPicture
    
    ' Buat temporary worksheet
    Set tempWs = ThisWorkbook.Worksheets.Add(After:=ThisWorkbook.Worksheets(ThisWorkbook.Worksheets.Count))
    tempWs.Name = "_TempF4_" & Format(Now, "hhmmss") & "_" & ws.Name
    tempSheets.Add tempWs
    
    ' Setup F4 Landscape page
    Call SetupF4Page(tempWs)
    
    ' Paste picture
    tempWs.Paste
    Set picObj = tempWs.Shapes(tempWs.Shapes.Count)
    
    ' Scale agar fit ke halaman
    Call ScaleImageToFitPage(picObj, tempWs)
    
    ' Posisikan di margin kiri-atas
    picObj.Left = tempWs.PageSetup.LeftMargin
    picObj.Top = tempWs.PageSetup.TopMargin
End Sub

' Identifikasi UsedRange yang sebenarnya (termasuk shapes)
Private Function GetActualUsedRange(ws As Worksheet) As Range
    Dim lastRow As Long, lastCol As Long
    Dim shp As Shape
    Dim cellRange As Range, shapeRange As Range
    Dim maxRow As Long, maxCol As Long
    Dim minRow As Long, minCol As Long
    
    ' Initialize
    minRow = 1000000
    minCol = 1000000
    maxRow = 1
    maxCol = 1
    
    ' Get range dari cells
    On Error Resume Next
    lastRow = ws.Cells.Find("*", SearchOrder:=xlByRows, SearchDirection:=xlPrevious).Row
    lastCol = ws.Cells.Find("*", SearchOrder:=xlByColumns, SearchDirection:=xlPrevious).Column
    On Error GoTo 0
    
    If lastRow > 0 And lastCol > 0 Then
        minRow = 1
        minCol = 1
        maxRow = lastRow
        maxCol = lastCol
    End If
    
    ' Expand range berdasarkan shapes
    For Each shp In ws.Shapes
        If shp.TopLeftCell.Row < minRow Then minRow = shp.TopLeftCell.Row
        If shp.TopLeftCell.Column < minCol Then minCol = shp.TopLeftCell.Column
        If shp.BottomRightCell.Row > maxRow Then maxRow = shp.BottomRightCell.Row
        If shp.BottomRightCell.Column > maxCol Then maxCol = shp.BottomRightCell.Column
    Next shp
    
    ' Return range
    If maxRow >= minRow And maxCol >= minCol Then
        Set GetActualUsedRange = ws.Range(ws.Cells(minRow, minCol), ws.Cells(maxRow, maxCol))
    End If
End Function

' Setup halaman F4 Landscape
Private Sub SetupF4Page(ws As Worksheet)
    Dim ptsPerCm As Double
    ptsPerCm = 28.3464567  ' 1 cm dalam points
    
    With ws.PageSetup
        ' Orientation: Landscape
        .Orientation = xlLandscape
        
        ' Custom Paper Size (F4: 33cm x 21.5cm)
        .PaperSize = xlPaperUser
        .PageWidth = F4_WIDTH_CM * ptsPerCm   ' 935.53 points
        .PageHeight = F4_HEIGHT_CM * ptsPerCm ' 609.45 points
        
        ' Margins: 1 cm semua sisi
        .LeftMargin = MARGIN_CM * ptsPerCm
        .RightMargin = MARGIN_CM * ptsPerCm
        .TopMargin = MARGIN_CM * ptsPerCm
        .BottomMargin = MARGIN_CM * ptsPerCm
        .HeaderMargin = 0
        .FooterMargin = 0
        
        ' Center on page
        .CenterHorizontally = True
        .CenterVertically = True
        
        ' Fit to 1 page wide, height auto
        .FitToPagesWide = 1
        .FitToPagesTall = False
        
        ' No zoom
        .Zoom = False
    End With
    
    ' Set column width agar cukup untuk gambar
    ws.Columns.ColumnWidth = 100
End Sub

' Scale gambar agar fit ke halaman F4
Private Sub ScaleImageToFitPage(picObj As Shape, ws As Worksheet)
    Dim ptsPerCm As Double
    Dim maxWidth As Double, maxHeight As Double
    Dim scaleRatio As Double
    
    ptsPerCm = 28.3464567
    
    ' Area yang tersedia (page - margins)
    maxWidth = (F4_WIDTH_CM - 2 * MARGIN_CM) * ptsPerCm
    maxHeight = (F4_HEIGHT_CM - 2 * MARGIN_CM) * ptsPerCm
    
    ' Hitung scale ratio
    Dim widthRatio As Double, heightRatio As Double
    widthRatio = maxWidth / picObj.Width
    heightRatio = maxHeight / picObj.Height
    
    ' Gunakan ratio terkecil
    scaleRatio = Application.WorksheetFunction.Min(widthRatio, heightRatio)
    
    ' Jangan perbesar jika sudah muat
    If scaleRatio > 1 Then scaleRatio = 1
    
    ' Apply scale
    picObj.ScaleWidth scaleRatio, msoTrue
    picObj.ScaleHeight scaleRatio, msoTrue
End Sub

' Cek apakah sheet punya konten
Private Function HasContent(ws As Worksheet) As Boolean
    On Error Resume Next
    HasContent = False
    
    ' Cek cells
    If Not ws.Cells.Find("*") Is Nothing Then
        HasContent = True
        Exit Function
    End If
    
    ' Cek shapes
    If ws.Shapes.Count > 0 Then
        HasContent = True
    End If
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

'==============================================================================
' ALTERNATIF: Export Active Sheet Only
'==============================================================================
Public Sub ExportActiveSheetToPDF_F4()
    Dim ws As Worksheet
    Dim tempWs As Worksheet
    Dim usedRange As Range
    Dim picObj As Shape
    Dim pdfPath As String
    
    Set ws = ActiveSheet
    
    If Not HasContent(ws) Then
        MsgBox "Sheet tidak memiliki konten.", vbExclamation
        Exit Sub
    End If
    
    Application.ScreenUpdating = False
    Application.DisplayAlerts = False
    
    ' Get used range
    Set usedRange = GetActualUsedRange(ws)
    
    ' Capture as picture (PRINT QUALITY)
    usedRange.CopyPicture Appearance:=xlPrinter, Format:=xlPicture
    
    ' Create temp sheet
    Set tempWs = ThisWorkbook.Worksheets.Add
    tempWs.Name = "_TempF4_" & Format(Now, "hhmmss")
    
    ' Setup F4 page
    Call SetupF4Page(tempWs)
    
    ' Paste
    tempWs.Paste
    Set picObj = tempWs.Shapes(tempWs.Shapes.Count)
    
    ' Scale to fit
    Call ScaleImageToFitPage(picObj, tempWs)
    picObj.Left = tempWs.PageSetup.LeftMargin
    picObj.Top = tempWs.PageSetup.TopMargin
    
    ' Export
    pdfPath = ThisWorkbook.Path & "\" & ws.Name & "_F4_Landscape.pdf"
    tempWs.ExportAsFixedFormat _
        Type:=xlTypePDF, _
        Filename:=pdfPath, _
        Quality:=xlQualityStandard, _
        OpenAfterPublish:=True
    
    ' Cleanup
    tempWs.Delete
    
    Application.ScreenUpdating = True
    Application.DisplayAlerts = True
    
    MsgBox "Export berhasil: " & pdfPath, vbInformation
End Sub

'==============================================================================
' BONUS: Group semua shapes sebelum export (untuk presisi)
'==============================================================================
Public Sub GroupAllShapes()
    Dim ws As Worksheet
    Dim shp As Shape
    Dim shapesToGroup() As Shape
    Dim count As Long, i As Long
    
    Set ws = ActiveSheet
    
    If ws.Shapes.Count < 2 Then
        MsgBox "Tidak cukup shapes untuk di-group.", vbExclamation
        Exit Sub
    End If
    
    ' Count non-grouped shapes
    count = 0
    For Each shp In ws.Shapes
        If shp.Type <> msoGroup Then count = count + 1
    Next
    
    If count < 2 Then
        MsgBox "Shapes sudah dalam grup.", vbInformation
        Exit Sub
    End If
    
    ' Collect shapes
    ReDim shapesToGroup(1 To count)
    i = 1
    For Each shp In ws.Shapes
        If shp.Type <> msoGroup Then
            Set shapesToGroup(i) = shp
            i = i + 1
        End If
    Next
    
    ' Group
    ws.Shapes.Range(shapesToGroup).Group
    
    MsgBox count & " shapes berhasil di-group.", vbInformation
End Sub

'==============================================================================
' UTILITY: Ungroup semua shapes
'==============================================================================
Public Sub UngroupAllShapes()
    Dim ws As Worksheet
    Dim shp As Shape
    Dim count As Long
    
    Set ws = ActiveSheet
    
    count = 0
    For Each shp In ws.Shapes
        If shp.Type = msoGroup Then
            shp.Ungroup
            count = count + 1
        End If
    Next
    
    MsgBox count & " grup berhasil di-ungroup.", vbInformation
End Sub
