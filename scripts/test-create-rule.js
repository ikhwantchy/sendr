// TEST SCRIPT - Create Rule
// Paste this in Browser Console (F12) to test create rule

const testCreateRule = async () => {
    const botId = 'GANTI_DENGAN_BOT_ID_ANDA' // ← GANTI INI!

    const testData = {
        bot_id: botId,
        trigger: 'test',
        reply: 'This is a test reply',
        match_type: 'contains',
        is_active: true
    }

    console.log('Testing create rule with data:', testData)

    try {
        const response = await fetch('http://localhost:3001/api/rules', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testData)
        })

        const data = await response.json()

        console.log('Response status:', response.status)
        console.log('Response data:', data)

        if (response.ok) {
            console.log('✅ SUCCESS! Rule created')
        } else {
            console.error('❌ FAILED!', data)
        }

        return data
    } catch (error) {
        console.error('❌ ERROR:', error)
        return error
    }
}

// Run test
testCreateRule()
