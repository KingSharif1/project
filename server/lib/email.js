import { Resend } from 'resend';

let resend = null;

function getResend() {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY;
    console.log('🔑 RESEND_API_KEY loaded:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT FOUND');
    
    if (!apiKey) {
      console.error('❌ RESEND_API_KEY is not set in environment variables!');
      console.error('📝 Please add RESEND_API_KEY to your .env file in the server directory');
      return null;
    }
    
    resend = new Resend(apiKey);
  }
  return resend;
}

/**
 * Send welcome email to new company admin after payment confirmation
 */
export async function sendWelcomeEmail({ 
  to, 
  companyName, 
  email, 
  password, 
  subscriptionTier, 
  expiryDate 
}) {
  try {
    const { data, error } = await getResend().emails.send({
      from: 'TransportHub <noreply@yourdomain.com>', // TODO: Replace with your domain
      to: [to],
      subject: 'Welcome to TransportHub - Your Account is Ready!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .credentials { background: white; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to TransportHub!</h1>
            </div>
            <div class="content">
              <h2>Hello ${companyName},</h2>
              <p>Your account has been successfully created and your payment has been confirmed.</p>
              
              <div class="credentials">
                <h3>Login Credentials</h3>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Temporary Password:</strong> ${password}</p>
                <p><strong>Login URL:</strong> https://yourdomain.com</p>
              </div>
              
              <h3>Subscription Details</h3>
              <p><strong>Plan:</strong> ${subscriptionTier.charAt(0).toUpperCase() + subscriptionTier.slice(1)}</p>
              <p><strong>Renewal Date:</strong> ${new Date(expiryDate).toLocaleDateString()}</p>
              
              <a href="https://yourdomain.com" class="button">Log In Now</a>
              
              <p><strong>Important:</strong> Please log in and change your password immediately for security.</p>
              
              <h3>Need Help?</h3>
              <p>If you have any questions, contact us at support@yourdomain.com or use the "Contact Support" feature in your dashboard.</p>
            </div>
            <div class="footer">
              <p>&copy; 2026 TransportHub. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('Email send error:', error);
      return { success: false, error };
    }

    console.log('Welcome email sent successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Email send exception:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send payment link email to prospect
 */
export async function sendPaymentLinkEmail({ 
  to, 
  companyName, 
  checkoutUrl, 
  tier 
}) {
  try {
    const tierDetails = {
      basic: { name: 'Basic', price: '$99/month', features: ['Up to 10 drivers', '50 trips/day', 'Basic reporting'] },
      premium: { name: 'Premium', price: '$299/month', features: ['Up to 50 drivers', '200 trips/day', 'Advanced analytics', 'SMS notifications'] },
      enterprise: { name: 'Enterprise', price: '$599/month', features: ['Unlimited drivers', 'Unlimited trips', 'Custom branding', 'Priority support'] }
    };

    const plan = tierDetails[tier] || tierDetails.basic;

    const { data, error } = await resend.emails.send({
      from: 'TransportHub <noreply@yourdomain.com>', // TODO: Replace with your domain
      to: [to],
      subject: 'Complete Your TransportHub Subscription',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .plan-box { background: white; padding: 20px; border: 2px solid #2563eb; border-radius: 8px; margin: 20px 0; }
            .features { list-style: none; padding: 0; }
            .features li { padding: 8px 0; padding-left: 24px; position: relative; }
            .features li:before { content: "✓"; position: absolute; left: 0; color: #10b981; font-weight: bold; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-size: 16px; font-weight: bold; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Complete Your Subscription</h1>
            </div>
            <div class="content">
              <h2>Hi ${companyName},</h2>
              <p>Thank you for your interest in TransportHub!</p>
              
              <div class="plan-box">
                <h3>${plan.name} Plan - ${plan.price}</h3>
                <ul class="features">
                  ${plan.features.map(f => `<li>${f}</li>`).join('')}
                </ul>
              </div>
              
              <p>Click the button below to complete your payment securely via Stripe:</p>
              
              <div style="text-align: center;">
                <a href="${checkoutUrl}" class="button">Complete Payment</a>
              </div>
              
              <p><strong>What happens next?</strong></p>
              <ol>
                <li>Complete payment via our secure Stripe checkout</li>
                <li>Your account will be automatically created</li>
                <li>You'll receive login credentials via email</li>
                <li>Start managing your transportation operations immediately!</li>
              </ol>
              
              <p>Questions? Reply to this email or contact us at support@yourdomain.com</p>
            </div>
            <div class="footer">
              <p>&copy; 2026 TransportHub. All rights reserved.</p>
              <p>This payment link expires in 24 hours.</p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('Email send error:', error);
      return { success: false, error };
    }

    console.log('Payment link email sent successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Email send exception:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send support ticket notification to superadmin
 */
export async function sendSupportTicketEmail({ 
  to, 
  companyName, 
  subject, 
  message, 
  ticketId,
  priority 
}) {
  try {
    const { data, error } = await getResend().emails.send({
      from: 'TransportHub Support <support@nemtbilling.com>', // TODO: Replace with your domain
      to: [to],
      subject: `[${priority.toUpperCase()}] Support Ticket from ${companyName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #ef4444; color: white; padding: 20px; }
            .content { padding: 20px; background: #f9fafb; }
            .ticket-box { background: white; padding: 15px; border-left: 4px solid #ef4444; margin: 20px 0; }
            .button { display: inline-block; background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New Support Ticket</h1>
            </div>
            <div class="content">
              <div class="ticket-box">
                <p><strong>Company:</strong> ${companyName}</p>
                <p><strong>Priority:</strong> ${priority.toUpperCase()}</p>
                <p><strong>Ticket ID:</strong> ${ticketId}</p>
                <p><strong>Subject:</strong> ${subject}</p>
                <hr>
                <p>${message}</p>
              </div>
              
              <a href="https://yourdomain.com/admin/support-tickets/${ticketId}" class="button">View Ticket</a>
            </div>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('Email send error:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Email send exception:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send subscription renewal reminder
 */
export async function sendRenewalReminderEmail({ 
  to, 
  companyName, 
  subscriptionTier, 
  renewalDate,
  amount 
}) {
  try {
    const { data, error } = await getResend().emails.send({
      from: 'TransportHub Billing <billing@yourdomain.com>',
      to: [to],
      subject: 'Your TransportHub Subscription Renews Soon',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .info-box { background: white; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Subscription Renewal Reminder</h1>
            </div>
            <div class="content">
              <h2>Hi ${companyName},</h2>
              <p>Your TransportHub subscription will renew soon.</p>
              
              <div class="info-box">
                <p><strong>Plan:</strong> ${subscriptionTier.charAt(0).toUpperCase() + subscriptionTier.slice(1)}</p>
                <p><strong>Renewal Date:</strong> ${new Date(renewalDate).toLocaleDateString()}</p>
                <p><strong>Amount:</strong> $${amount}</p>
              </div>
              
              <p>Your payment method on file will be charged automatically. No action is required unless you wish to update your payment method or change your plan.</p>
              
              <p>To manage your subscription, log in to your account.</p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('Email send error:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Email send exception:', error);
    return { success: false, error: error.message };
  }
}
