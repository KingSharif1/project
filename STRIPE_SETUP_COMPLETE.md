# ✅ Stripe Products & Pricing Created

**Date**: April 9, 2026

---

## 📦 Products Created

### 1. **TransportHub Basic** - $99/month
- **Product ID**: `prod_UJ2A57pJUwxwuI`
- **Price ID**: `price_1TKQ6XDwRwy12iDR3U9fxJWs`
- **Amount**: $99.00/month (9900 cents)
- **Features**:
  - Up to 10 drivers
  - 50 trips/day
  - Basic reporting

---

### 2. **TransportHub Premium** - $299/month
- **Product ID**: `prod_UJ2BPcxaEwkVw8`
- **Price ID**: `price_1TKQ6uDwRwy12iDRSHSFnDJV`
- **Amount**: $299.00/month (29900 cents)
- **Features**:
  - Up to 50 drivers
  - 200 trips/day
  - Advanced analytics
  - SMS notifications

---

### 3. **TransportHub Enterprise** - $599/month
- **Product ID**: `prod_UJ2BVirYYUWZ4C`
- **Price ID**: `price_1TKQ79DwRwy12iDRTxgwCeu6`
- **Amount**: $599.00/month (59900 cents)
- **Features**:
  - Unlimited drivers
  - Unlimited trips
  - Custom branding
  - Priority support

---

## 🔧 Add These to Your `.env` File

```bash
# Stripe Price IDs
STRIPE_PRICE_BASIC=price_1TKQ6XDwRwy12iDR3U9fxJWs
STRIPE_PRICE_PREMIUM=price_1TKQ6uDwRwy12iDRSHSFnDJV
STRIPE_PRICE_ENTERPRISE=price_1TKQ79DwRwy12iDRTxgwCeu6
```

---

## 🎯 Next Steps

1. ✅ Stripe products created
2. ⏳ Add price IDs to `server/.env`
3. ⏳ Set up Stripe webhook endpoint
4. ⏳ Build UI components

---

## 📝 Webhook Setup

When ready to deploy, configure webhook in Stripe Dashboard:

**Webhook URL**: `https://yourdomain.com/api/subscriptions/webhook`

**Events to listen for**:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

Get webhook secret and add to `.env`:
```bash
STRIPE_WEBHOOK_SECRET=whsec_...
```
