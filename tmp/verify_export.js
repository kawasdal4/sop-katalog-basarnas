const fs = require('fs');
const path = require('path');

async function verify() {
    const userId = 'cmm6j0whq0000eykwowzn63u7'; // Correct ADMIN ID from DB
    const url = 'http://localhost:3000/api/export?format=xlsx';

    console.log(`Fetching from ${url}...`);

    try {
        const res = await fetch(url, {
            headers: {
                'Cookie': `userId=${userId}`
            }
        });

        if (!res.ok) {
            console.error('Response not OK:', res.status, await res.text());
            return;
        }

        const contentType = res.headers.get('content-type');
        const contentLength = res.headers.get('content-length');
        console.log('Content-Type:', contentType);
        console.log('Content-Length (header):', contentLength);

        const buffer = await res.arrayBuffer();
        console.log('Actual Buffer Size:', buffer.byteLength);

        const nodeBuffer = Buffer.from(buffer);
        fs.writeFileSync('api_result.xlsx', nodeBuffer);

        // Check magic bytes (Excel XLSX is a ZIP, starts with PK \x50\x4B)
        const header = nodeBuffer.slice(0, 2).toString('hex');
        console.log('File Header (hex):', header);

        if (header === '504b') {
            console.log('✅ File starts with PK (Valid ZIP/XLSX header)');
        } else {
            console.error('❌ Invalid File Header! Not a standard XLSX/ZIP file.');
            console.log('First 20 bytes as string:', nodeBuffer.slice(0, 20).toString());
        }

    } catch (err) {
        console.error('Error during fetch:', err);
    }
}

verify();
