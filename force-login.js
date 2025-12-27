// PASTE THIS IN BROWSER CONSOLE (F12) AFTER LOGIN

// Force save token and redirect
function forceLogin() {
    // Mock token (for testing)
    const mockToken = 'test-token-123'
    const mockUser = {
        id: '1',
        email: 'admin@example.com',
        username: 'admin',
        role: 'admin'
    }

    localStorage.setItem('token', mockToken)
    localStorage.setItem('user', JSON.stringify(mockUser))

    console.log('✅ Token saved!')
    console.log('Token:', localStorage.getItem('token'))
    console.log('User:', localStorage.getItem('user'))

    // Redirect
    console.log('Redirecting to dashboard...')
    window.location.href = '/dashboard'
}

// Run
forceLogin()
