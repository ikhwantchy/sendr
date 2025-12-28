// Quick script to recreate bots
// Run with: node recreate-bots.js

const bots = [
    {
        id: 'f46399a0-e45d-4fbd-9966-34cb0372e37a',
        name: 'Auto Reply Bot',
        phone: '628561942069'
    },
    {
        id: 'bb6d19c6-b6de-4db4-8a6f-d78d2b77310f',
        name: 'BYU Bot',
        phone: '6285129795281'
    }
];

async function recreateBots() {
    const token = 'YOUR_TOKEN_HERE'; // Get from localStorage in browser

    for (const bot of bots) {
        try {
            const response = await fetch('http://localhost:3001/api/bots', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: bot.name,
                    config: {}
                })
            });

            const data = await response.json();
            console.log(`✅ Created bot: ${bot.name}`, data);
        } catch (error) {
            console.error(`❌ Failed to create bot: ${bot.name}`, error);
        }
    }
}

recreateBots();
