import nodemailer from 'nodemailer';
import systemSettingsService from './systemSettingsService';

/**
 * Email Service
 * Handles sending emails for invites, notifications, etc.
 */

export interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

class EmailService {
    private transporter: nodemailer.Transporter | null = null;

    /**
     * Initialize email transporter with SMTP settings
     */
    private async getTransporter(): Promise<nodemailer.Transporter> {
        if (this.transporter) {
            return this.transporter;
        }

        // Get SMTP settings
        const host = await systemSettingsService.get('email', 'smtp_host');
        const port = await systemSettingsService.get('email', 'smtp_port', 587);
        const username = await systemSettingsService.get('email', 'smtp_username');
        const password = await systemSettingsService.get('email', 'smtp_password');

        if (!host || !username || !password) {
            throw new Error('SMTP settings not configured');
        }

        this.transporter = nodemailer.createTransporter({
            host,
            port: parseInt(port),
            secure: parseInt(port) === 465, // true for 465, false for other ports
            auth: {
                user: username,
                pass: password
            }
        });

        return this.transporter;
    }

    /**
     * Send an email
     */
    async sendEmail(options: EmailOptions): Promise<void> {
        try {
            const transporter = await this.getTransporter();
            const fromEmail = await systemSettingsService.get('email', 'from_email', 'noreply@example.com');
            const fromName = await systemSettingsService.get('email', 'from_name', 'WA Platform');

            await transporter.sendMail({
                from: `"${fromName}" <${fromEmail}>`,
                to: options.to,
                subject: options.subject,
                text: options.text,
                html: options.html
            });

            console.log(`[Email] Sent to ${options.to}: ${options.subject}`);
        } catch (error) {
            console.error('[Email] Failed to send:', error);
            throw new Error('Failed to send email');
        }
    }

    /**
     * Send invite email
     */
    async sendInviteEmail(email: string, token: string, inviterName: string): Promise<void> {
        const siteName = await systemSettingsService.getSiteName();
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const signupUrl = `${baseUrl}/signup?token=${token}`;

        const html = this.getInviteEmailTemplate(siteName, inviterName, signupUrl);
        const text = `You've been invited to join ${siteName}!\n\nClick here to accept: ${signupUrl}\n\nThis invite will expire in 7 days.`;

        await this.sendEmail({
            to: email,
            subject: `You've been invited to ${siteName}`,
            html,
            text
        });
    }

    /**
     * Send password reset email
     */
    async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
        const siteName = await systemSettingsService.getSiteName();
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

        const html = this.getPasswordResetTemplate(siteName, resetUrl);
        const text = `Reset your password for ${siteName}\n\nClick here: ${resetUrl}\n\nThis link will expire in 1 hour.`;

        await this.sendEmail({
            to: email,
            subject: `Reset your password - ${siteName}`,
            html,
            text
        });
    }

    /**
     * Send test email
     */
    async sendTestEmail(to: string): Promise<void> {
        const siteName = await systemSettingsService.getSiteName();

        await this.sendEmail({
            to,
            subject: `Test Email from ${siteName}`,
            html: `<h1>Test Email</h1><p>If you received this, your SMTP settings are working correctly!</p>`,
            text: 'Test Email - If you received this, your SMTP settings are working correctly!'
        });
    }

    /**
     * Invite email template
     */
    private getInviteEmailTemplate(siteName: string, inviterName: string, signupUrl: string): string {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>You've been invited!</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">You're Invited!</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="font-size: 16px; color: #333333; line-height: 1.6; margin: 0 0 20px 0;">
                                <strong>${inviterName}</strong> has invited you to join <strong>${siteName}</strong>.
                            </p>
                            
                            <p style="font-size: 16px; color: #666666; line-height: 1.6; margin: 0 0 30px 0;">
                                Click the button below to create your account and get started.
                            </p>
                            
                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="${signupUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
                                            Accept Invitation
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="font-size: 14px; color: #999999; line-height: 1.6; margin: 30px 0 0 0; padding-top: 20px; border-top: 1px solid #eeeeee;">
                                Or copy and paste this link into your browser:<br>
                                <a href="${signupUrl}" style="color: #667eea; word-break: break-all;">${signupUrl}</a>
                            </p>
                            
                            <p style="font-size: 14px; color: #999999; line-height: 1.6; margin: 20px 0 0 0;">
                                This invitation will expire in 7 days.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center;">
                            <p style="font-size: 12px; color: #999999; margin: 0;">
                                © ${new Date().getFullYear()} ${siteName}. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        `;
    }

    /**
     * Password reset email template
     */
    private getPasswordResetTemplate(siteName: string, resetUrl: string): string {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 40px 20px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Reset Your Password</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="font-size: 16px; color: #333333; line-height: 1.6; margin: 0 0 20px 0;">
                                We received a request to reset your password for your ${siteName} account.
                            </p>
                            
                            <p style="font-size: 16px; color: #666666; line-height: 1.6; margin: 0 0 30px 0;">
                                Click the button below to reset your password:
                            </p>
                            
                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="${resetUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
                                            Reset Password
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="font-size: 14px; color: #999999; line-height: 1.6; margin: 30px 0 0 0; padding-top: 20px; border-top: 1px solid #eeeeee;">
                                Or copy and paste this link into your browser:<br>
                                <a href="${resetUrl}" style="color: #f5576c; word-break: break-all;">${resetUrl}</a>
                            </p>
                            
                            <p style="font-size: 14px; color: #999999; line-height: 1.6; margin: 20px 0 0 0;">
                                This link will expire in 1 hour.
                            </p>
                            
                            <p style="font-size: 14px; color: #999999; line-height: 1.6; margin: 20px 0 0 0;">
                                If you didn't request this, you can safely ignore this email.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center;">
                            <p style="font-size: 12px; color: #999999; margin: 0;">
                                © ${new Date().getFullYear()} ${siteName}. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        `;
    }

    /**
     * Clear transporter (force reconnect)
     */
    clearTransporter(): void {
        this.transporter = null;
    }
}

export default new EmailService();
