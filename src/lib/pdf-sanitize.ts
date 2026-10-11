/**
 * Helper to sanitize PDF metadata title and remove any stray Chinese text like "附件:" 
 * (which Microsoft Word automatically sets as the document title in certain environments/locales).
 */

function encodeUtf16BE(str: string): Buffer {
    const buf = Buffer.from(str, 'utf16le')
    buf.swap16()
    return buf
}

export function sanitizePdfMetadata(buffer: Buffer, title: string = 'Dokumen Legalisasi'): Buffer {
    if (!buffer || buffer.length === 0) return buffer

    try {
        let str = buffer.toString('binary')

        const cleanTitle = (title || 'Dokumen Legalisasi').replace(/[()]/g, ' ').trim()

        // 1. Replace UTF-16BE /Title(...)
        // 0x9644 is '附', 0x4ef6 is '件', 0x003a is ':'
        const utf16beFujian = Buffer.from([0xfe, 0xff, 0x96, 0x44, 0x4e, 0xf6, 0x00, 0x3a]).toString('binary')
        const utf16beFujianNoColon = Buffer.from([0xfe, 0xff, 0x96, 0x44, 0x4e, 0xf6]).toString('binary')

        const newUtf16be = Buffer.concat([Buffer.from([0xfe, 0xff]), encodeUtf16BE(cleanTitle)]).toString('binary')

        if (str.includes(utf16beFujian)) {
            str = str.split(utf16beFujian).join(newUtf16be)
        }
        if (str.includes(utf16beFujianNoColon)) {
            str = str.split(utf16beFujianNoColon).join(newUtf16be)
        }

        // 2. Replace UTF-8 XML metadata <dc:title>
        str = str.replace(
            /<dc:title><rdf:Alt><rdf:li xml:lang="x-default">.*?<\/rdf:li><\/rdf:Alt><\/dc:title>/g,
            `<dc:title><rdf:Alt><rdf:li xml:lang="x-default">${cleanTitle}</rdf:li></rdf:Alt></dc:title>`
        )

        // 3. Replace any raw UTF-8 "附件:" or "附件" in metadata streams
        const utf8FujianColon = Buffer.from('附件:', 'utf8').toString('binary')
        const utf8Fujian = Buffer.from('附件', 'utf8').toString('binary')
        const utf8Title = Buffer.from(cleanTitle, 'utf8').toString('binary')

        if (str.includes(utf8FujianColon)) {
            str = str.split(utf8FujianColon).join(utf8Title)
        }
        if (str.includes(utf8Fujian)) {
            str = str.split(utf8Fujian).join(utf8Title)
        }

        return Buffer.from(str, 'binary')
    } catch (err) {
        console.warn('[PDF Sanitize] Failed to sanitize PDF metadata:', err)
        return buffer
    }
}
