import fetch from 'node-fetch';

async function testAuth() {
    try {
        const res = await fetch('http://localhost:3000/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'foetainment@gmail.com', password: '048965' })
        });
        const data = await res.json();
        console.log('Status:', res.status);
        console.log('Body:', data);
    } catch (e) {
        console.error('Fetch error:', e);
    }
}

testAuth();
