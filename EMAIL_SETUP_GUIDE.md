# 🔧 Email Setup Required

## ❌ Current Error

```
Email send exception: TypeError: Cannot read properties of null (reading 'emails')
Failed to send payment email: Cannot read properties of null (reading 'emails')
```

**Cause**: `RESEND_API_KEY` is not configured in your `.env` file.

---

## ✅ How to Fix

### Step 1: Get Resend API Key

1. Go to **[resend.com](https://resend.com)**
2. Sign up for a free account
3. Verify your email
4. Go to **API Keys** section
5. Click **Create API Key**
6. Copy the key (starts with `re_...`)

**Free Tier**: 100 emails/day, 3,000 emails/month

---

### Step 2: Create `.env` File

In the `server` directory, create a `.env` file:

```bash
cd server
copy .env.example .env
```

Or manually create `server/.env` with this content:

```env
# Supabase Configuration (already configured)
SUPABASE_URL=https://ocjqsnocuqyumoltighi.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-jwt-secret-key-here-make-it-long-and-random
JWT_EXPIRES_IN=7d

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_PRICE_BASIC=price_basic_plan_id
STRIPE_PRICE_PREMIUM=price_premium_plan_id
STRIPE_PRICE_ENTERPRISE=price_enterprise_plan_id

# Twilio Configuration (optional for SMS)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# ⚠️ REQUIRED: Resend Configuration (for emails)
RESEND_API_KEY=re_your_actual_api_key_here

# Application URLs
WEB_URL=http://localhost:5173
SUPERADMIN_EMAIL=admin@nemtbilling.com
```

---

### Step 3: Add Your Resend API Key

Replace `re_your_actual_api_key_here` with your actual Resend API key:

```env
RESEND_API_KEY=re_abc123xyz456...
```

---

### Step 4: Verify Domain (Optional but Recommended)

**For production emails**:

1. In Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Enter `nemtbilling.com`
4. Add the DNS records to your domain provider
5. Wait for verification

**Until verified**, you can only send emails to:
- Your own verified email address
- Test email addresses

---

### Step 5: Restart Server

```bash
# Server will auto-restart with nodemon
# Or manually restart:
cd server
npm start
```

---

## 📧 What Emails Are Sent?

### 1. **Payment Link Email**
- **Trigger**: Superadmin sends payment link to pending signup
- **To**: Company contact email
- **Contains**: Stripe payment link for subscription

### 2. **Welcome Email**
- **Trigger**: After successful payment via webhook
- **To**: Company admin email
- **Contains**: Login credentials, subscription details

### 3. **Support Ticket Email**
- **Trigger**: Company creates support ticket
- **To**: Superadmin email
- **Contains**: Ticket details, priority, message

### 4. **Renewal Reminder Email**
- **Trigger**: 7 days before subscription expires
- **To**: Company admin email
- **Contains**: Expiry date, renewal link

---

## 🧪 Test Email Sending

After setting up, test the flow:

1. **Login as superadmin**
2. Go to **Contact Leads** tab
3. Convert a lead to pending signup
4. Go to **Company Signups** tab
5. Click **Send Payment Link**
6. Check your email inbox

---

## 🚨 Troubleshooting

### Error: "Invalid API key"
- Check that your API key starts with `re_`
- Verify no extra spaces in `.env` file
- Restart the server

### Error: "Domain not verified"
- Use your verified email address for testing
- Or verify your domain in Resend dashboard

### Emails not arriving
- Check spam folder
- Verify recipient email is correct
- Check Resend dashboard logs

---

## 🔒 Security Notes

- ✅ `.env` is gitignored (won't be committed)
- ✅ Never share your API key
- ✅ Use different keys for dev/production
- ✅ Rotate keys if exposed

---

## 📝 Current Email Addresses

Based on your code:

- **From (Support)**: `support@nemtbilling.com`
- **From (General)**: `noreply@yourdomain.com` (needs update)
- **Superadmin**: `admin@nemtbilling.com`

**TODO**: Update remaining email addresses in `server/lib/email.js` to use `@nemtbilling.com`

---

## ✅ Once Configured

After adding `RESEND_API_KEY`, the complete payment flow will work:

1. Contact form submission → Contact Leads
2. Convert to pending signup
3. **Send payment link email** ✅
4. Customer pays via Stripe
5. **Welcome email sent** ✅
6. Account auto-created
7. Customer can login

**Email functionality is now the only missing piece for the complete flow!**
