const axios = require('axios');
const fs = require('fs');

async function debug() {
    const url = 'https://docs.google.com/spreadsheets/d/1fZsxDxGQ2SiVnO3-tBTl-q8S_G3nQ/htmlview';
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        fs.writeFileSync('debug_sheet.html', response.data);
        console.log('Saved HTML to debug_sheet.html');
    } catch (e) {
        console.error('Fetch failed:', e.message);
    }
}
debug();
