import fs from 'fs';

async function testDownloadApi() {
    try {
        // get a public submission
        const res = await fetch('http://localhost:3000/api/sop?publicOnly=true');
        const data = await res.json();
        const sops = data.data;
        if (sops.length === 0) {
            console.log('No public submissions to test');
            return;
        }
        const targetSop = sops[0];
        console.log('Testing SOP:', targetSop.id, targetSop.judul);

        // Test download API
        const downloadRes = await fetch(`http://localhost:3000/api/download?id=${targetSop.id}`);
        console.log('Download API Status:', downloadRes.status);
        if (!downloadRes.ok) {
            console.log('Error:', await downloadRes.text());
        } else {
            console.log('Download API returned file! Length:', downloadRes.headers.get('content-length'));
        }

        // Test preview API
        const previewRes = await fetch(`http://localhost:3000/api/file?action=preview&id=${targetSop.id}`);
        console.log('Preview API Status:', previewRes.status);
        if (!previewRes.ok) {
            console.log('Error:', await previewRes.text());
        } else {
            console.log('Preview API returned file! Type:', previewRes.headers.get('content-type'));
        }

    } catch (err) {
        console.error(err);
    }
}

testDownloadApi();
