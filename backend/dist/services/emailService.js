"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const nodemailer = __importStar(require("nodemailer"));
const systemSettingsService_1 = __importDefault(require("./systemSettingsService"));
class EmailService {
    transporter = null;
    /**
     * Initialize email transporter with SMTP settings
     */
    async getTransporter() {
        if (this.transporter) {
            return this.transporter;
        }
        // Get SMTP settings
        const host = await systemSettingsService_1.default.get('email', 'smtp_host');
        const port = await systemSettingsService_1.default.get('email', 'smtp_port', 587);
        const username = await systemSettingsService_1.default.get('email', 'smtp_username');
        const password = await systemSettingsService_1.default.get('email', 'smtp_password');
        if (!host || !username || !password) {
            throw new Error('SMTP settings not configured');
        }
        this.transporter = nodemailer.createTransport({
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
    async sendEmail(options) {
        try {
            const transporter = await this.getTransporter();
            const fromEmail = await systemSettingsService_1.default.get('email', 'from_email', 'noreply@example.com');
            const fromName = await systemSettingsService_1.default.get('email', 'from_name', 'WA Platform');
            await transporter.sendMail({
                from: `"${fromName}" <${fromEmail}>`,
                to: options.to,
                subject: options.subject,
                text: options.text,
                html: options.html
            });
            console.log(`[Email] Sent to ${options.to}: ${options.subject}`);
        }
        catch (error) {
            console.error('[Email] Failed to send:', error);
            // Preserve original error message for debugging
            const detail = error.message || 'Unknown error';
            throw new Error(`Failed to send email: ${detail}`);
        }
    }
    /**
     * Send invite email
     */
    async sendInviteEmail(email, token, inviterName) {
        const siteName = await systemSettingsService_1.default.getSiteName();
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
    async sendPasswordResetEmail(email, resetToken) {
        const siteName = await systemSettingsService_1.default.getSiteName();
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
    async sendTestEmail(to) {
        const siteName = await systemSettingsService_1.default.getSiteName();
        await this.sendEmail({
            to,
            subject: `Test Email from ${siteName}`,
            html: `<h1>Test Email</h1><p>If you received this, your SMTP settings are working correctly!</p>`,
            text: 'Test Email - If you received this, your SMTP settings are working correctly!'
        });
    }
    /**
     * Send welcome email to newly created user
     */
    async sendWelcomeEmail(name, userEmail, password) {
        const siteName = await systemSettingsService_1.default.getSiteName();
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const loginUrl = `${baseUrl}/login`;
        // Check if welcome email is enabled (default: true)
        const enabled = await systemSettingsService_1.default.get('email', 'welcome_email_enabled', 'true');
        if (enabled === 'false') {
            console.log(`[Email] Welcome email disabled, skipping for ${userEmail}`);
            return;
        }
        const vars = {
            name,
            email: userEmail,
            password,
            login_url: loginUrl,
            site_name: siteName,
            year: new Date().getFullYear().toString()
        };
        // Get subject from settings (with variable substitution)
        let subject = await systemSettingsService_1.default.get('email', 'welcome_email_subject', 'Selamat Datang di {{site_name}}');
        subject = this.substituteVariables(subject, vars);
        // Get template from settings
        let template = await systemSettingsService_1.default.get('email', 'welcome_email_template', '');
        // Use default template if none configured
        if (!template) {
            template = this.getDefaultWelcomeTemplate();
        }
        // Substitute variables in template
        const html = this.substituteVariables(template, vars);
        const text = `Selamat datang di ${siteName}!\n\nHai ${name},\n\nAkun kamu telah dibuat.\n\nEmail: ${userEmail}\nPassword: ${password}\n\nLogin di: ${loginUrl}\n\nSegera ganti password setelah login pertama.`;
        await this.sendEmail({ to: userEmail, subject, html, text });
    }
    /**
     * Substitute template variables like {{name}}, {{email}}, etc.
     */
    substituteVariables(template, vars) {
        let result = template;
        for (const [key, value] of Object.entries(vars)) {
            result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
        }
        return result;
    }
    /**
     * Default welcome email HTML template
     */
    getDefaultWelcomeTemplate() {
        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Selamat Datang!</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Selamat Datang!</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="font-size: 16px; color: #333333; line-height: 1.6; margin: 0 0 20px 0;">
                                Hai <strong>{{name}}</strong>, akun kamu di <strong>{{site_name}}</strong> telah berhasil dibuat.
                            </p>
                            <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
                                <p style="font-size: 14px; color: #666; margin: 0 0 10px 0;"><strong>Detail Login:</strong></p>
                                <table cellpadding="4" cellspacing="0" style="font-size: 14px; color: #333;">
                                    <tr><td style="color: #666;">Email:</td><td><strong>{{email}}</strong></td></tr>
                                    <tr><td style="color: #666;">Password:</td><td><strong>{{password}}</strong></td></tr>
                                </table>
                            </div>
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="{{login_url}}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
                                            Login Sekarang
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            <p style="font-size: 13px; color: #999999; line-height: 1.6; margin: 20px 0 0 0; padding-top: 20px; border-top: 1px solid #eeeeee;">
                                Segera ganti password kamu setelah login pertama demi keamanan akun.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center;">
                            <p style="font-size: 12px; color: #999999; margin: 0;">
                                &copy; {{year}} {{site_name}}. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
    }
    /**
     * Invite email template
     */
    getInviteEmailTemplate(siteName, inviterName, signupUrl) {
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
    getPasswordResetTemplate(siteName, resetUrl) {
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
    clearTransporter() {
        this.transporter = null;
    }
}
exports.default = new EmailService();
//# sourceMappingURL=emailService.js.map