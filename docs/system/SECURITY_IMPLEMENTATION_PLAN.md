# Implementation Plan - Enhanced Security & Dashboard Cleanup

This plan outlines the steps to implement a robust security system for Sendr, including Session Management, 2FA, Telegram Alerts, and Cloudflare Turnstile integration, while cleaning up the authentication flow.

## 1. Authentication Flow Cleanup
- [ ] **Frontend**: Remove "Sign Up" page and links.
- [ ] **Frontend**: Remove Google Login integration from the Login page.
- [ ] **Backend**: Disable/Remove the `/api/auth/register` endpoint to prevent unauthorized account creation.

## 2. Database Schema Updates
- [ ] **Migration**: Add security columns to `users` table:
    - `two_factor_secret` (TEXT)
    - `two_factor_enabled` (BOOLEAN, default false)
    - `telegram_chat_id` (VARCHAR)
- [ ] **New Table**: `user_sessions`
    - `id` (UUID)
    - `user_id` (UUID)
    - `token_hash` (TEXT)
    - `ip_address` (VARCHAR)
    - `user_agent` (TEXT)
    - `last_active` (TIMESTAMP)
    - `is_revoked` (BOOLEAN)
- [ ] **New Table**: `security_logs`
    - `id` (UUID)
    - `user_id` (UUID)
    - `event_type` (VARCHAR) - e.g., 'LOGIN_SUCCESS', 'LOGIN_FAILED', '2FA_ENABLED', 'SESSION_REVOKED'
    - `ip_address` (VARCHAR)
    - `metadata` (JSONB)
    - `created_at` (TIMESTAMP)

## 3. Backend Implementation (Security Service)
- [ ] **Telegram Integration**: Create a utility to send alerts via Telegram Bot API.
- [ ] **Session Management**: Implement logic to track active sessions and allow remote revocation.
- [ ] **2FA Logic**: Implement TOTP generation and verification using `speakeasy`.
- [ ] **Cloudflare Turnstile**: Implement backend verification for the Turnstile token (using placeholder keys for now).
- [ ] **IP Tracking**: Capture and log IP addresses for all security-relevant actions.

## 4. Frontend Implementation (Security Dashboard)
- [ ] **Security Page**: Create a new page under `/dashboard/settings/security` or a top-level `/dashboard/security`.
    - **Session Manager**: UI to view and revoke active sessions.
    - **2FA Setup**: UI to enable 2FA with QR code.
    - **Telegram Setup**: Field to enter Telegram Chat ID and test notifications.
    - **Audit Logs**: Filtered view of `security_logs`.

## 5. Integration & Proactive Alerts
- [ ] **Login Alert**: Trigger Telegram notification on successful login from a new IP/Device.
- [ ] **Brute Force Protection**: Logic to alert and temporarily block IPs after multiple failed attempts.
- [ ] **Session Refresh**: Logic to update `last_active` in `user_sessions` without expiration (as requested).

## Environment Variables Needed:
```env
TELEGRAM_BOT_TOKEN=your_token_here
CF_TURNSTILE_SITE_KEY=placeholder_key
CF_TURNSTILE_SECRET_KEY=placeholder_secret
```
