async function testProxy() {
    const key = 'profile-photos/cmm6m2x270000-1741150242137.jpg';
    const url = `http://localhost:3000/api/users/photo?key=${encodeURIComponent(key)}`;

    console.log('Testing Proxy URL:', url);

    try {
        const res = await fetch(url);
        console.log('Status:', res.status);
        console.log('Headers:', JSON.stringify([...res.headers.entries()], null, 2));

        if (res.ok) {
            console.log('Success! Image retrieved.');
        } else {
            const text = await res.text();
            console.log('Error Response:', text);
        }
    } catch (err) {
        console.error('Fetch Error:', err);
    }
}

testProxy();
