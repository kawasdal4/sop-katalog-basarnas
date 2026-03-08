async function testProxy() {
    const key = 'sop/2026/03/00033c37-e1d7-4274-a21c-7123d1d3a30a.jpg'; // One of the keys from sop/
    const url = `http://localhost:3000/api/users/photo?key=${encodeURIComponent(key)}`;

    console.log('Testing Proxy URL:', url);

    try {
        const res = await fetch(url);
        console.log('Status:', res.status);

        if (res.ok) {
            console.log('Success! Image retrieved from misplaced location.');
        } else {
            const text = await res.text();
            console.log('Error Response:', text);
        }
    } catch (err) {
        console.error('Fetch Error:', err);
    }
}

testProxy();
