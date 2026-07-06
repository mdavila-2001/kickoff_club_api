const https = require('https');

const API_KEY = '123'; // The free tier key
const date = '2026-06-11'; // Pick a World cup day
const leagueId = '4429'; // World Cup

const url = `https://www.thesportsdb.com/api/v1/json/${API_KEY}/eventsday.php?d=${date}&l=${leagueId}`;

console.log('Fetching URL:', url);

https.get(url, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('Response Status:', res.statusCode);
        try {
            const json = JSON.parse(data);
            console.log('Response Body:', JSON.stringify(json, null, 2));
        } catch (e) {
            console.log('Raw Data:', data);
        }
    });
}).on('error', (err) => {
    console.error('Error:', err.message);
});
