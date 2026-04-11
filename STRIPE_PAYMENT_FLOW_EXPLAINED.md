# 🔗 How Stripe Payment Links Track Companies & Plans

## 🎯 Your Question
*"How would we know which plan they pick and how will we link it to the user/company?"*

---

## ✅ The Answer: Metadata + Webhooks

The system uses **Stripe metadata** to track everything, and **webhooks** to automatically create the subscription when they pay.

---

## 📊 The Complete Flow

### Step 1: You Create a Pending Signup
**In UI**: Company Signups tab → Click "Add New Signup"

**What happens**:
```javascript
// You enter:
- Company Name: "ABC Transport"
- Contact Email: "admin@abc.com"
- Contact Name: "John Smith"
- Phone: "555-1234"
- Tier: "Premium"  // ← YOU choose the plan here

// Saved to database:
pending_signups table:
  id: "abc-123"
  company_name: "ABC Transport"
  contact_email: "admin@abc.com"
  requested_tier: "premium"  // ← Plan is saved here
  status: "pending"
```

### Step 2: You Send Payment Link
**In UI**: Click "Send Payment Link" button

**What happens in backend** (`server/routes/admin.js:158-176`):
```javascript
// Create Stripe checkout session
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  line_items: [{
    price: process.env.STRIPE_PRICE_PREMIUM,  // ← Based on tier you chose
    quantity: 1
  }],
  customer_email: "admin@abc.com",
  
  // 🔑 THIS IS THE MAGIC - METADATA TRACKS EVERYTHING:
  metadata: {
    pending_signup_id: "abc-123",      // ← Links back to pending signup
    company_name: "ABC Transport",     // ← Company info
    tier: "premium"                    // ← Which plan they're paying for
  },
  
  success_url: "https://yourapp.com/signup-success",
  cancel_url: "https://yourapp.com/signup-cancelled"
});

// Email sent with link: session.url
```

**Email sent**:
```
Subject: Complete Your TransportHub Subscription

Hi ABC Transport,

Click here to complete your Premium plan subscription:
[Pay Now] → https://checkout.stripe.com/c/pay/cs_test_abc123...

- Premium Plan: $299/month
- 50 drivers
- 200 trips/day
- SMS notifications
```

### Step 3: Customer Pays
**Customer clicks link** → Stripe checkout page opens

**They see**:
- Premium Plan: $299/month
- Enter credit card
- Click "Subscribe"

**They CANNOT change the plan** - it's locked to Premium because that's what you sent them.

### Step 4: Stripe Webhook Fires
**When payment succeeds**, Stripe sends webhook to your server:

**Webhook received** (`server/routes/subscriptions.js:275-390`):
```javascript
// Stripe sends this event:
event.type = 'checkout.session.completed'
event.data.object = {
  customer: "cus_abc123",
  subscription: "sub_xyz789",
  metadata: {
    pending_signup_id: "abc-123",    // ← We know which signup!
    company_name: "ABC Transport",   // ← We know the company!
    tier: "premium"                  // ← We know the plan!
  }
}

// Your webhook handler AUTOMATICALLY:
// 1. Creates the clinic (company)
await supabase.from('clinics').insert({
  name: "ABC Transport",
  email: "admin@abc.com",
  is_active: true
});

// 2. Creates the admin user
await supabase.auth.admin.createUser({
  email: "admin@abc.com",
  password: "random-temp-password",
  role: 'admin'
});

// 3. Creates the subscription
await supabase.from('subscriptions').insert({
  clinic_id: newClinic.id,
  tier: "premium",                    // ← From metadata!
  stripe_customer_id: "cus_abc123",
  stripe_subscription_id: "sub_xyz789",
  status: "active",
  max_drivers: 50,
  max_trips_per_day: 200,
  sms_enabled: true
});

// 4. Sends welcome email with login credentials
await sendWelcomeEmail({
  to: "admin@abc.com",
  companyName: "ABC Transport",
  email: "admin@abc.com",
  tempPassword: "random-temp-password",
  tier: "premium"
});
```

### Step 5: Company Can Login
**Customer receives email**:
```
Welcome to TransportHub!

Your account is ready:
Email: admin@abc.com
Password: Xy9kL2mP4q

Login: https://yourapp.com

Your Premium subscription includes:
✓ 50 drivers
✓ 200 trips/day
✓ SMS notifications
✓ 24 months data retention
```

---

## 🔑 Key Points

### 1. **You Choose the Plan, Not Them**
- When you create the pending signup, **YOU select** Basic/Premium/Enterprise
- The Stripe link is **locked to that plan**
- They can only pay for what you chose
- They **cannot** change plans during checkout

### 2. **Metadata Tracks Everything**
```javascript
metadata: {
  pending_signup_id: "abc-123",  // Links to pending_signups table
  company_name: "ABC Transport", // Company info
  tier: "premium"                // Which plan
}
```

This metadata travels with the payment and comes back in the webhook.

### 3. **Webhook Creates Everything Automatically**
When payment succeeds:
- ✅ Clinic created
- ✅ Admin user created
- ✅ Subscription created with correct tier
- ✅ Welcome email sent
- ✅ Pending signup marked as "account_created"

**You don't have to do anything manually!**

### 4. **Different Flow for Existing Companies**
If a company already exists and wants to upgrade:
- They go to Settings → Subscription & Billing
- Click "Upgrade Plan"
- Choose Basic/Premium/Enterprise
- Pay via Stripe
- Webhook updates their existing subscription

---

## 📋 What If They Want to Choose the Plan?

**Current System**: You choose for them (recommended for B2B)

**If you want them to choose**:

### Option 1: Multiple Pending Signups
Create 3 pending signups with different tiers:
- ABC Transport - Basic
- ABC Transport - Premium  
- ABC Transport - Enterprise

Send 3 different payment links, they pick one.

### Option 2: Pricing Page
Create a public pricing page where they:
1. See all plans
2. Click "Subscribe to Premium"
3. Fill out company info
4. Creates pending signup automatically
5. Redirects to Stripe checkout

### Option 3: Let Them Choose in Checkout
Modify the checkout session to show all 3 plans:
```javascript
line_items: [
  { price: STRIPE_PRICE_BASIC, quantity: 1 },
  { price: STRIPE_PRICE_PREMIUM, quantity: 1 },
  { price: STRIPE_PRICE_ENTERPRISE, quantity: 1 }
]
```

But this is messy - better to have separate links.

---

## 🧪 Testing the Flow

### Test in Company Signups Tab:

1. **Create Pending Signup**
   - Company: "Test Corp"
   - Email: "test@example.com"
   - Tier: Premium
   - Click "Create"

2. **Send Payment Link**
   - Click "Send Payment Link"
   - Check email for Stripe link
   - OR copy the checkout URL from response

3. **Pay with Test Card**
   - Use Stripe test card: `4242 4242 4242 4242`
   - Any future expiry date
   - Any CVC
   - Click "Subscribe"

4. **Webhook Fires**
   - Check server logs
   - Check `clinics` table → new company created
   - Check `users` table → new admin created
   - Check `subscriptions` table → Premium subscription created
   - Check email → welcome email sent

5. **Login as New Company**
   - Use email from welcome email
   - Use temp password from welcome email
   - Should see Premium features

---

## 🎯 Summary

**Q: How do we know which plan they picked?**
**A**: You choose the plan when creating the pending signup. The Stripe link is locked to that plan.

**Q: How do we link it to the company?**
**A**: Stripe metadata includes `pending_signup_id` which links back to the `pending_signups` table. The webhook uses this to create the company and subscription.

**Q: What if they want to choose?**
**A**: Either create multiple pending signups (one per plan) or build a public pricing page where they select first.

**The current system is designed for B2B sales where YOU (superadmin) choose the plan for them based on their needs.**
