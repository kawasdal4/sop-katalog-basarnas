import fs from 'fs';

async function testFetch() {
    try {
        const res = await fetch('http://localhost:3000/api/sop?publicOnly=true');
        const data = await res.json();
        console.log(JSON.stringify(data.data[0], null, 2));
    } catch (err) {
        console.error(err);
    }
}

testFetch();
