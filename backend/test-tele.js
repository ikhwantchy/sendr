
const dotenv = require('dotenv');
const axios = require('axios');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.ADMIN_TELEGRAM_CHAT_ID;

console.log('Bot Token:', botToken ? 'Found' : 'Not Found');
console.log('Chat ID:', chatId);

if (!botToken || !chatId) {
    console.error('Missing Bot Token or Chat ID');
    process.exit(1);
}

const message = '<b>Test Connection</b>\n\nIf you see this, your Admin Telegram Chat ID is working!';

axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    chat_id: chatId,
    text: message,
    parse_mode: 'HTML'
})
    .then(response => {
        console.log('Success:', response.data.ok);
    })
    .catch(error => {
        console.error('Error:', error.response ? error.response.data : error.message);
    });
