/**
 * PDF Footer Utility
 *
 * Adds dynamic footer to PDF files for print output.
 * Footer format (bottom right):
 * Line 1: Compiled by: E-Katalog SOP/IK | Printed by: {userName} | Upload by: {uploaderName} | {date} | Direktorat Kesiapsiagaan – BASARNAS
 * Line 2: Halaman X dari Y
 *
 * Generated server-side to avoid hydration errors.
 */

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

// Indonesian month names
const BULAN_INDONESIA = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

/**
 * Format date in Indonesian format with WIB timezone
 * Format: DD MMMM YYYY HH:mm WIB
 * Example: 28 Februari 2026 14:32 WIB
 */
function formatIndonesianDate(date: Date): string {
  // Convert to WIB (Asia/Jakarta, UTC+7)
  const wibOffset = 7 * 60 * 60 * 1000 // 7 hours in milliseconds
  const utc = date.getTime() + (date.getTimezoneOffset() * 60 * 1000)
  const wibDate = new Date(utc + wibOffset)

  const hari = wibDate.getDate().toString().padStart(2, '0')
  const namaBulan = BULAN_INDONESIA[wibDate.getMonth()]
  const tahun = wibDate.getFullYear()
  const jam = wibDate.getHours().toString().padStart(2, '0')
  const menit = wibDate.getMinutes().toString().padStart(2, '0')

  return `${hari} ${namaBulan} ${tahun} ${jam}:${menit} WIB`
}

/**
 * Build footer text line 1
 * Single line, no line breaks
 */
function buildFooterText(userName: string, uploaderName?: string): string {
  const currentDate = formatIndonesianDate(new Date())
  const uploaderText = uploaderName ? ` | Upload by: ${uploaderName}` : ''
  return `Compiled by: E-Katalog SOP/IK | Printed by: ${userName}${uploaderText} | ${currentDate} | Direktorat Kesiapsiagaan – BASARNAS`
}

/**
 * Build page number text
 * Format: Halaman X dari Y
 */
function buildPageNumberText(currentPage: number, totalPages: number): string {
  return `Halaman ${currentPage} dari ${totalPages}`
}

/**
 * Add footer to PDF on every page
 *
 * Specifications:
 * - Position: bottom right corner, 0.3cm from paper edge
 * - Font: Helvetica-Oblique 6px (italic, not bold) - 2 levels smaller
 * - Color: dark gray (#4D4D4D)
 * - Line 1: Footer info
 * - Line 2: Page number
 */
export async function addPdfFooter(
  pdfBuffer: Buffer | ArrayBuffer,
  userName: string,
  uploaderName?: string
): Promise<Uint8Array> {
  try {
    // Load the PDF document
    const pdfDoc = await PDFDocument.load(pdfBuffer)

    // Embed Helvetica-Oblique font (italic version of Helvetica)
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)

    // Build footer text
    const footerText = buildFooterText(userName, uploaderName)

    // Font settings - 2 levels smaller (from 8 to 6)
    const fontSize = 6
    // Dark gray color: #4D4D4D = rgb(77, 77, 77) = rgb(0.302, 0.302, 0.302)
    const textColor = rgb(0.302, 0.302, 0.302)

    // Get all pages
    const pages = pdfDoc.getPages()
    const totalPages = pages.length

    // Add footer to each page
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i]
      const { width, height } = page.getSize()

      // Page number text
      const pageNumberText = buildPageNumberText(i + 1, totalPages)

      // Calculate text widths for right alignment
      const footerTextWidth = font.widthOfTextAtSize(footerText, fontSize)
      const pageNumberTextWidth = font.widthOfTextAtSize(pageNumberText, fontSize)

      // Right margin - 0.3cm from paper edge (approximately 8.5 points)
      const rightMargin = 8.5

      // Position at bottom right
      const footerX = width - footerTextWidth - rightMargin
      const pageNumberX = width - pageNumberTextWidth - rightMargin

      // Line spacing
      const lineHeight = 9

      // Position at bottom (0.3cm = ~8.5 points from bottom edge for last line)
      const pageNumberY = 8.5
      const footerY = pageNumberY + lineHeight

      // Draw the footer text (Line 1)
      page.drawText(footerText, {
        x: footerX,
        y: footerY,
        size: fontSize,
        font,
        color: textColor,
      })

      // Draw the page number (Line 2)
      page.drawText(pageNumberText, {
        x: pageNumberX,
        y: pageNumberY,
        size: fontSize,
        font,
        color: textColor,
      })
    }

    // Save and return as Uint8Array
    const modifiedPdfBytes = await pdfDoc.save()

    console.log(`✅ [PDF-Footer] Added footer to ${pages.length} page(s) for user: ${userName}`)

    return modifiedPdfBytes

  } catch (error) {
    console.error('❌ [PDF-Footer] Error adding footer:', error)
    // Return original buffer if footer fails
    if (pdfBuffer instanceof ArrayBuffer) {
      return new Uint8Array(pdfBuffer)
    }
    return new Uint8Array(pdfBuffer)
  }
}

/**
 * Example output:
 *
 * Input:
 *   userName: "Ahmad Fauzi"
 *   uploaderName: "Budi Santoso"
 *   date: new Date('2026-02-28T07:32:00Z')
 *   totalPages: 3
 *   currentPage: 1
 *
 * Output footer (bottom right, 0.3cm from edge):
 *   Line 1: "Compiled by: E-Katalog SOP/IK | Printed by: Ahmad Fauzi | Upload by: Budi Santoso | 28 Februari 2026 14:32 WIB | Direktorat Kesiapsiagaan – BASARNAS"
 *   Line 2: "Halaman 1 dari 3"
 */
