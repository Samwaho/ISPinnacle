// Common CSS styles for all email templates
const commonCSS = `
    body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        margin: 0;
        padding: 0;
        background-color: #f8fafc;
    }
    .container {
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
        padding: 40px 30px;
        text-align: center;
    }
    .header h1 {
        color: white;
        margin: 0;
        font-size: 28px;
        font-weight: 600;
    }
    .content {
        padding: 40px 30px;
    }
    .greeting {
        font-size: 18px;
        margin-bottom: 20px;
        color: #374151;
    }
    .message {
        font-size: 16px;
        margin-bottom: 30px;
        color: #6b7280;
    }
    .button-container {
        text-align: center;
        margin: 30px 0;
    }
    .action-button {
        display: inline-block;
        color: white;
        text-decoration: none;
        padding: 16px 32px;
        border-radius: 8px;
        font-weight: 600;
        font-size: 16px;
        transition: all 0.3s ease;
    }
    .action-button:hover {
        transform: translateY(-2px);
    }
    .footer {
        background-color: #f9fafb;
        padding: 30px;
        text-align: center;
        border-top: 1px solid #e5e7eb;
    }
    .footer p {
        margin: 5px 0;
        color: #6b7280;
        font-size: 14px;
    }
    .link {
        text-decoration: none;
    }
    .link:hover {
        text-decoration: underline;
    }
    .warning {
        background-color: #fef3c7;
        border: 1px solid #f59e0b;
        border-radius: 6px;
        padding: 15px;
        margin: 20px 0;
        font-size: 14px;
        color: #92400e;
    }
    .features {
        background-color: #f0f9ff;
        border-radius: 8px;
        padding: 20px;
        margin: 20px 0;
    }
    .feature {
        display: flex;
        align-items: center;
        margin: 10px 0;
        font-size: 14px;
        color: #374151;
    }
    .feature-icon {
        margin-right: 10px;
        font-size: 16px;
    }
    .code-container {
        text-align: center;
        margin: 30px 0;
    }
    .verification-code {
        display: inline-block;
        background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
        color: white;
        padding: 20px 40px;
        border-radius: 12px;
        font-size: 32px;
        font-weight: 700;
        letter-spacing: 8px;
        font-family: 'Courier New', monospace;
        box-shadow: 0 8px 25px rgba(139, 92, 246, 0.3);
    }
    @media only screen and (max-width: 600px) {
        .container {
            margin: 10px;
            border-radius: 4px;
        }
        .header, .content, .footer {
            padding: 20px 15px;
        }
        .header h1 {
            font-size: 24px;
        }
        .verification-code {
            font-size: 24px;
            padding: 15px 30px;
            letter-spacing: 4px;
        }
    }
`;

// Helper function to create email template with common structure
const createEmailTemplate = (
    title: string,
    headerGradient: string,
    content: string,
    linkColor?: string
) => {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
            ${commonCSS}
            .header {
                background: ${headerGradient};
            }
            ${linkColor ? `.link { color: ${linkColor}; }` : ''}
        </style>
    </head>
    <body>
        <div class="container">
            ${content}
        </div>
    </body>
    </html>
    `;
};

export const verifyEmailTemplate = (confirmLink: string, userName?: string) => {
    const content = `
        <div class="header">
            <h1>🎉 Welcome to RentSys</h1>
        </div>
        
        <div class="content">
            <div class="greeting">
                Hello${userName ? ` ${userName}` : ''}! 👋
            </div>
            
            <div class="message">
                Thank you for signing up with RentSys! To complete your registration and start managing your rental properties, please verify your email address by clicking the button below.
            </div>
            
            <div class="button-container">
                <a href="${confirmLink}" class="action-button" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                    ✅ Verify Email Address
                </a>
            </div>
            
            <div class="warning">
                <strong>⚠️ Security Notice:</strong> This verification link will expire in 24 hours for your security. If you didn't create an account with RentSys, you can safely ignore this email.
            </div>
            
            <div class="message">
                If the button above doesn't work, you can also copy and paste this link into your browser:
                <br><br>
                <a href="${confirmLink}" class="link">${confirmLink}</a>
            </div>
        </div>
        
        <div class="footer">
            <p><strong>RentSys</strong> - Your Complete Rental Management Solution</p>
            <p>This email was sent to you because you signed up for a RentSys account.</p>
            <p>If you have any questions, please contact our support team.</p>
            <p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">
                © ${new Date().getFullYear()} RentSys. All rights reserved.
            </p>
        </div>
    `;

    return createEmailTemplate(
        "Verify Your Email - RentSys",
        "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        content,
        "#667eea"
    );
};

export const welcomeEmailTemplate = (userName: string) => {
    const content = `
        <div class="header">
            <h1>🎉 Welcome to RentSys!</h1>
        </div>
        
        <div class="content">
            <div class="greeting">
                Hello ${userName}! 👋
            </div>
            
            <div class="message">
                Congratulations! Your email has been successfully verified and your RentSys account is now active. You're all set to start managing your rental properties with ease.
            </div>
            
            <div class="features">
                <h3 style="margin-top: 0; color: #1f2937;">What you can do now:</h3>
                <div class="feature">
                    <span class="feature-icon">🏠</span>
                    Add and manage your rental properties
                </div>
                <div class="feature">
                    <span class="feature-icon">👥</span>
                    Track tenants and their information
                </div>
                <div class="feature">
                    <span class="feature-icon">💰</span>
                    Monitor rent payments and expenses
                </div>
                <div class="feature">
                    <span class="feature-icon">📊</span>
                    View detailed reports and analytics
                </div>
                <div class="feature">
                    <span class="feature-icon">🔔</span>
                    Set up automated notifications
                </div>
            </div>
            
            <div class="message">
                Ready to get started? Log in to your dashboard and begin exploring all the features RentSys has to offer!
            </div>
        </div>
        
        <div class="footer">
            <p><strong>RentSys</strong> - Your Complete Rental Management Solution</p>
            <p>Thank you for choosing RentSys for your rental management needs.</p>
            <p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">
                © ${new Date().getFullYear()} RentSys. All rights reserved.
            </p>
        </div>
    `;

    return createEmailTemplate(
        "Welcome to RentSys",
        "linear-gradient(135deg, #10b981 0%, #059669 100%)",
        content
    );
};

export const resetPasswordEmailTemplate = (resetLink: string, userName?: string) => {
    const content = `
        <div class="header">
            <h1>🔐 Reset Your Password</h1>
        </div>
        
        <div class="content">
            <div class="greeting">
                Hello${userName ? ` ${userName}` : ''}! 👋
            </div>
            
            <div class="message">
                We received a request to reset your password for your RentSys account. Click the button below to create a new password.
            </div>
            
            <div class="button-container">
                <a href="${resetLink}" class="action-button" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
                    🔑 Reset Password
                </a>
            </div>
            
            <div class="warning">
                <strong>⚠️ Security Notice:</strong> This password reset link will expire in 1 hour for your security. If you didn't request a password reset, you can safely ignore this email.
            </div>
            
            <div class="message">
                If the button above doesn't work, you can also copy and paste this link into your browser:
                <br><br>
                <a href="${resetLink}" class="link">${resetLink}</a>
            </div>
        </div>
        
        <div class="footer">
            <p><strong>RentSys</strong> - Your Complete Rental Management Solution</p>
            <p>This email was sent to you because you requested a password reset.</p>
            <p>If you have any questions, please contact our support team.</p>
            <p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">
                © ${new Date().getFullYear()} RentSys. All rights reserved.
            </p>
        </div>
    `;

    return createEmailTemplate(
        "Reset Password - RentSys",
        "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
        content,
        "#ef4444"
    );
};

export const twoFactorEmailTemplate = (token: string, userName?: string) => {
    const content = `
        <div class="header">
            <h1>🔒 Two-Factor Authentication</h1>
        </div>
        
        <div class="content">
            <div class="greeting">
                Hello${userName ? ` ${userName}` : ''}! 👋
            </div>
            
            <div class="message">
                We received a login request for your RentSys account. To complete the login process, please enter the verification code below.
            </div>
            
            <div class="code-container">
                <div class="verification-code">
                    ${token}
                </div>
            </div>
            
            <div class="warning">
                <strong>⚠️ Security Notice:</strong> This verification code will expire in 10 minutes for your security. If you didn't attempt to log in to your RentSys account, please change your password immediately and contact our support team.
            </div>
            
            <div class="message">
                <strong>Important:</strong> Never share this code with anyone. RentSys staff will never ask for your verification code.
            </div>
        </div>
        
        <div class="footer">
            <p><strong>RentSys</strong> - Your Complete Rental Management Solution</p>
            <p>This email was sent to you because you requested two-factor authentication.</p>
            <p>If you have any questions, please contact our support team.</p>
            <p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">
                © ${new Date().getFullYear()} RentSys. All rights reserved.
            </p>
        </div>
    `;

    return createEmailTemplate(
        "Two-Factor Authentication - RentSys",
        "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
        content,
        "#8b5cf6"
    );
};