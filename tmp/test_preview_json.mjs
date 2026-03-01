import fs from 'fs';

async function testFetch() {
    try {
        const res = await fetch('http://localhost:3000/api/sop?publicOnly=true');
        const data = await res.json();
        const sops = data.data;
        if (sops.length === 0) {
            console.log('No public submissions to test');
            return;
        }
        const targetSop = sops[0];
        console.log('Testing Preview for SOP:', targetSop.id, targetSop.judul);

        const previewRes = await fetch(`http://localhost:3000/api/file?action=preview&id=${targetSop.id}`);
        console.log('Status:', previewRes.status);
        console.log('Content-Type:', previewRes.headers.get('content-type'));

        // Simulate what handlePreview does
        const contentType = previewRes.headers.get('content-type') || '';
        if (contentType.includes('application/pdf')) {
            console.log('It is a PDF. Blob size would be:', previewRes.headers.get('content-length'));
        } else {
            console.log('It is not a PDF according to headers, attempting to parse as JSON...');
            try {
                const json = await previewRes.json();
                console.log('Parsed JSON:', json);
            } catch (err) {
                console.error('Failed to parse JSON:', err.message);
                // what is the text?
                // can't read text after json failed, so we'd need a clone
            }
        }

    } catch (err) {
        console.error(err);
    }
}

testFetch();
