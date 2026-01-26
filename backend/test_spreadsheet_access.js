
const axios = require('axios');

async function testSpreadsheet() {
    const spreadsheetId = '1fZsxDxGQ2Sm1KtJGkeKmgc-kyNUcPSXBTi-q8S_G3nQ';
    const sheetName = 'daily_digest';
    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;

    try {
        console.log(`📡 Fetching from: ${csvUrl}`);
        const response = await axios.get(csvUrl, { timeout: 10000 });
        console.log('✅ Success! Data received.');
        console.log('--- DATA PREVIEW ---');
        console.log(response.data.substring(0, 500));
        process.exit(0);
    } catch (error) {
        console.error('❌ Failed to fetch spreadsheet:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
        }
        process.exit(1);
    }
}

testSpreadsheet();
