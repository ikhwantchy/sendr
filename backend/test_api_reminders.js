
const axios = require('axios');

async function testApi() {
    try {
        // Need a token
        const loginRes = await axios.post('http://localhost:3001/api/auth/login', {
            email: 'admin@Sendr.com',
            password: 'admin' // Presumed default
        });
        const token = loginRes.data.data.token;

        const res = await axios.get('http://localhost:3001/api/reminders', {
            headers: { Authorization: `Bearer ${token}` }
        });

        const testReminder = res.data.data.find(r => r.name === 'TEST');
        console.log('--- API REMINDER DATA ---');
        console.log(JSON.stringify(testReminder, null, 2));
        process.exit(0);
    } catch (error) {
        console.error('API Error:', error.response?.data || error.message);
        process.exit(1);
    }
}

testApi();
