import fs from 'fs';

async function testUpload() {
    const formData = new FormData();
    formData.append('judul', 'Test SOP Upload Local');
    formData.append('kategori', 'SIAGA');
    formData.append('jenis', 'SOP');
    formData.append('tahun', '2026');
    formData.append('status', 'AKTIF');
    formData.append('isPublicSubmission', 'true');
    formData.append('submitterName', 'Test User');
    formData.append('submitterEmail', 'test@example.com');
    formData.append('keterangan', 'Test description');

    // Create a dummy PDF file in memory to upload
    const dummyFile = new Blob(['dummy pdf content'], { type: 'application/pdf' });
    formData.append('file', dummyFile, 'test-sop-123.pdf');

    try {
        const res = await fetch('http://localhost:3000/api/sop', {
            method: 'POST',
            body: formData,
        });

        console.log('Status:', res.status);
        const text = await res.text();
        console.log('Response:', text);
    } catch (err) {
        console.error('Fetch error:', err);
    }
}

testUpload();
