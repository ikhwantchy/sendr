import axios from 'axios';

async function testApi() {
    try {
        console.log('Testing /api/analytics/system-status...');
        const res = await axios.get('http://localhost:3001/api/analytics/system-status');
        console.log('Response:', res.data);
    } catch (error: any) {
        console.error('API Test failed:', error.message);
    }
}

testApi();
