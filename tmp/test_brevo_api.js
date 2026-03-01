require('dotenv').config({ path: './.env' });
const https = require('https');

async function checkBrevoAccount() {
    const apiKey = process.env.SMTP_PASS;
    console.log("Checking Brevo account status...");

    const options = {
        hostname: 'api.brevo.com',
        port: 443,
        path: '/v3/account',
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'api-key': apiKey
        }
    };

    const req = https.request(options, (res) => {
        console.log(`Status: ${res.statusCode}`);

        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            try {
                console.log("Response:", JSON.stringify(JSON.parse(data), null, 2));
            } catch (e) {
                console.log("Raw Response:", data);
            }
        });
    });

    req.on('error', (e) => {
        console.error(`Problem with request: ${e.message}`);
    });

    req.end();
}

checkBrevoAccount();
