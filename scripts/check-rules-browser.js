// RUN THIS IN BROWSER CONSOLE (F12)
// This will check what rules are actually in the database

async function checkRules() {
    const botId = window.location.pathname.split('/').pop();

    console.log('=== CHECKING RULES ===');
    console.log('Bot ID:', botId);
    console.log('');

    try {
        const token = localStorage.getItem('token');

        // Fetch rules
        const response = await fetch(`http://localhost:3001/api/rules/bot/${botId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        console.log('API Response:', data);
        console.log('');

        if (data.success && data.data && data.data.length > 0) {
            console.log(`✅ Found ${data.data.length} rule(s):`);
            console.log('');

            data.data.forEach((rule, index) => {
                console.log(`Rule #${index + 1}:`);
                console.log('  ID:', rule.id);
                console.log('  Name:', rule.name);
                console.log('  Keyword:', rule.keyword);
                console.log('  Match Type:', rule.match_type);
                console.log('  Scope:', rule.scope);
                console.log('  Is Active:', rule.is_active);
                console.log('  Actions:', rule.actions);
                console.log('  Created:', rule.created_at);
                console.log('');

                // Parse actions if string
                if (typeof rule.actions === 'string') {
                    try {
                        const actions = JSON.parse(rule.actions);
                        console.log('  Parsed Actions:', actions);
                    } catch (e) {
                        console.log('  ❌ Failed to parse actions');
                    }
                }
                console.log('---');
            });
        } else {
            console.log('❌ No rules found');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Run it
checkRules();
