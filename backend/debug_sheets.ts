import axios from 'axios';
import * as fs from 'fs';

async function testFetch() {
    const spreadsheetId = '1fZsxDxGQ2SiVnO3-tBTl-q8S_G3nQ';
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/htmlview`;

    try {
        console.log('Fetching:', url);
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            timeout: 10000
        });

        const html = response.data;
        console.log('Response status:', response.status);
        console.log('HTML length:', html.length);

        // Save to file for inspection
        fs.writeFileSync('debug_sheet_response.html', html);
        console.log('Saved to debug_sheet_response.html');

        // Test regex patterns
        const metadataMatches = Array.from(html.matchAll(/\{"sheetId":\d+,"title":"([^"]+)"/g));
        console.log('Metadata matches:', metadataMatches.length);
        metadataMatches.forEach(m => console.log('  -', m[1]));

        const footerMatches = Array.from(html.matchAll(/data-sheet-name="([^"]+)"/g));
        console.log('Footer matches:', footerMatches.length);
        footerMatches.forEach(m => console.log('  -', m[1]));

    } catch (err: any) {
        console.error('Error:', err.message);
        if (err.response) {
            console.error('Status:', err.response.status);
            console.error('Headers:', err.response.headers);
        }
    }
}

testFetch();
