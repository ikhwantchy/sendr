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
declare class EmailService {
    private transporter;
    /**
     * Initialize email transporter with SMTP settings
     */
    private getTransporter;
    /**
     * Send an email
     */
    sendEmail(options: EmailOptions): Promise<void>;
    /**
     * Send invite email
     */
    sendInviteEmail(email: string, token: string, inviterName: string): Promise<void>;
    /**
     * Send password reset email
     */
    sendPasswordResetEmail(email: string, resetToken: string): Promise<void>;
    /**
     * Send test email
     */
    sendTestEmail(to: string): Promise<void>;
    /**
     * Send welcome email to newly created user
     */
    sendWelcomeEmail(name: string, userEmail: string, password: string): Promise<void>;
    /**
     * Substitute template variables like {{name}}, {{email}}, etc.
     */
    private substituteVariables;
    /**
     * Default welcome email HTML template
     */
    private getDefaultWelcomeTemplate;
    /**
     * Invite email template
     */
    private getInviteEmailTemplate;
    /**
     * Password reset email template
     */
    private getPasswordResetTemplate;
    /**
     * Clear transporter (force reconnect)
     */
    clearTransporter(): void;
}
declare const _default: EmailService;
export default _default;
//# sourceMappingURL=emailService.d.ts.map