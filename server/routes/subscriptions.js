import express from 'express';
import { supabase } from '../lib/supabase.js';
import { requireRole } from '../middleware/auth.js';
import Stripe from 'stripe';

const router = express.Router();

// Initialize Stripe (will be configured via env var)
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

// ============================================================================
// GET SUBSCRIPTION FOR CLINIC
// ============================================================================

router.get('/', requireRole('admin', 'superadmin'), async (req, res) => {
  try {
    const { clinic_id } = req.user;

    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select(`
        *,
        clinic:clinics(id, name, company_name)
      `)
      .eq('clinic_id', clinic_id)
      .single();

    if (error) throw error;

    res.json({ success: true, subscription });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// GET ALL SUBSCRIPTIONS (SUPERADMIN ONLY)
// ============================================================================

router.get('/all', requireRole('superadmin'), async (req, res) => {
  try {
    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select(`
        *,
        clinic:clinics(id, name, company_name, email)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, subscriptions });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// CREATE SUBSCRIPTION (SUPERADMIN ONLY)
// ============================================================================

router.post('/', requireRole('superadmin'), async (req, res) => {
  try {
    const { clinic_id, tier, trial_days = 30 } = req.body;

    if (!clinic_id || !tier) {
      return res.status(400).json({ success: false, error: 'clinic_id and tier are required' });
    }

    // Set limits based on tier
    const tierConfig = {
      basic: { max_drivers: 10, max_trips_per_day: 50, data_retention_months: 6 },
      premium: { max_drivers: 50, max_trips_per_day: 200, data_retention_months: 24, sms_enabled: true },
      enterprise: { max_drivers: 999, max_trips_per_day: 9999, data_retention_months: 120, sms_enabled: true }
    };

    const config = tierConfig[tier] || tierConfig.basic;

    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .insert({
        clinic_id,
        tier,
        status: 'trialing',
        trial_end: new Date(Date.now() + trial_days * 24 * 60 * 60 * 1000).toISOString(),
        ...config
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, subscription });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// UPDATE SUBSCRIPTION TIER (SUPERADMIN ONLY)
// ============================================================================

router.patch('/:id', requireRole('superadmin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { tier, status, sms_enabled } = req.body;

    const updates = {};
    if (tier) {
      updates.tier = tier;
      // Update limits based on tier
      const tierConfig = {
        basic: { max_drivers: 10, max_trips_per_day: 50, data_retention_months: 6 },
        premium: { max_drivers: 50, max_trips_per_day: 200, data_retention_months: 24 },
        enterprise: { max_drivers: 999, max_trips_per_day: 9999, data_retention_months: 120 }
      };
      Object.assign(updates, tierConfig[tier] || tierConfig.basic);
    }
    if (status) updates.status = status;
    if (typeof sms_enabled === 'boolean') updates.sms_enabled = sms_enabled;

    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, subscription });
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// GET FEATURE FLAGS FOR CLINIC
// ============================================================================

router.get('/features', requireRole('admin', 'superadmin', 'dispatcher'), async (req, res) => {
  try {
    const { clinic_id } = req.user;

    const { data: features, error } = await supabase
      .from('feature_flags')
      .select('*')
      .eq('clinic_id', clinic_id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    // Return default features if none exist
    const defaultFeatures = {
      sms_reminders_enabled: false,
      advanced_analytics_enabled: false,
      api_access_enabled: false,
      custom_branding_enabled: false,
      white_label_enabled: false,
      priority_support_enabled: false,
      max_api_calls_per_day: 0
    };

    res.json({ success: true, features: features || defaultFeatures });
  } catch (error) {
    console.error('Error fetching feature flags:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// CREATE STRIPE CHECKOUT SESSION
// ============================================================================

router.post('/create-checkout', requireRole('admin', 'superadmin'), async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({ success: false, error: 'Stripe not configured' });
    }

    const { clinic_id } = req.user;
    const { tier, success_url, cancel_url } = req.body;

    // Get clinic details
    const { data: clinic, error: clinicError } = await supabase
      .from('clinics')
      .select('name, email, company_name')
      .eq('id', clinic_id)
      .single();

    if (clinicError) throw clinicError;

    // Price IDs (these should be set in your Stripe dashboard)
    const priceIds = {
      basic: process.env.STRIPE_PRICE_BASIC,
      premium: process.env.STRIPE_PRICE_PREMIUM,
      enterprise: process.env.STRIPE_PRICE_ENTERPRISE
    };

    const priceId = priceIds[tier];
    if (!priceId) {
      return res.status(400).json({ success: false, error: 'Invalid tier' });
    }

    // Create or get Stripe customer
    let customerId;
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('clinic_id', clinic_id)
      .single();

    if (existingSub?.stripe_customer_id) {
      customerId = existingSub.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: clinic.email,
        name: clinic.company_name || clinic.name,
        metadata: { clinic_id }
      });
      customerId = customer.id;
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1
      }],
      success_url: success_url || `${process.env.WEB_URL}/settings?payment=success`,
      cancel_url: cancel_url || `${process.env.WEB_URL}/settings?payment=canceled`,
      metadata: {
        clinic_id,
        tier
      }
    });

    res.json({ success: true, sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// STRIPE WEBHOOK HANDLER
// ============================================================================

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({ success: false, error: 'Stripe not configured' });
    }

    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const { clinic_id, tier, pending_signup_id } = session.metadata;

        // Check if this is a new company signup (has pending_signup_id)
        if (pending_signup_id) {
          // AUTO-CREATE COMPANY ACCOUNT
          const { sendWelcomeEmail } = await import('../lib/email.js');
          
          // Get pending signup details
          const { data: signup } = await supabase
            .from('pending_signups')
            .select('*')
            .eq('id', pending_signup_id)
            .single();

          if (signup && signup.status === 'payment_sent') {
            // Generate random password
            const tempPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10).toUpperCase();

            // 1. Create clinic
            const { data: newClinic, error: clinicError } = await supabase
              .from('clinics')
              .insert({
                name: signup.company_name,
                email: signup.contact_email,
                phone: signup.contact_phone,
                is_active: true
              })
              .select()
              .single();

            if (!clinicError && newClinic) {
              // 2. Create admin user in auth.users
              const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
                email: signup.contact_email,
                password: tempPassword,
                email_confirm: true,
                user_metadata: {
                  first_name: signup.contact_name.split(' ')[0],
                  last_name: signup.contact_name.split(' ').slice(1).join(' ') || '',
                  role: 'admin'
                }
              });

              if (!authError && authUser) {
                // 3. Create user in public.users
                const { data: newUser } = await supabase
                  .from('users')
                  .insert({
                    id: authUser.user.id,
                    email: signup.contact_email,
                    first_name: signup.contact_name.split(' ')[0],
                    last_name: signup.contact_name.split(' ').slice(1).join(' ') || '',
                    phone: signup.contact_phone,
                    role: 'admin',
                    clinic_id: newClinic.id,
                    status: 'active',
                    must_change_password: true
                  })
                  .select()
                  .single();

                // 4. Create subscription
                const periodEnd = new Date();
                periodEnd.setMonth(periodEnd.getMonth() + 1);

                await supabase
                  .from('subscriptions')
                  .insert({
                    clinic_id: newClinic.id,
                    tier: signup.requested_tier,
                    stripe_customer_id: session.customer,
                    stripe_subscription_id: session.subscription,
                    status: 'active',
                    current_period_start: new Date().toISOString(),
                    current_period_end: periodEnd.toISOString()
                  });

                // 5. Update pending signup
                await supabase
                  .from('pending_signups')
                  .update({
                    status: 'account_created',
                    stripe_customer_id: session.customer,
                    stripe_subscription_id: session.subscription,
                    paid_at: new Date().toISOString(),
                    account_created_at: new Date().toISOString(),
                    created_clinic_id: newClinic.id,
                    created_admin_id: newUser?.id
                  })
                  .eq('id', pending_signup_id);

                // 6. Send welcome email with credentials
                await sendWelcomeEmail({
                  to: signup.contact_email,
                  companyName: signup.company_name,
                  email: signup.contact_email,
                  password: tempPassword,
                  subscriptionTier: signup.requested_tier,
                  expiryDate: periodEnd.toISOString()
                });

                console.log(`✅ Auto-created account for ${signup.company_name}`);
              }
            }
          }
        } else if (clinic_id) {
          // Existing clinic upgrading/changing subscription
          await supabase
            .from('subscriptions')
            .upsert({
              clinic_id,
              tier,
              stripe_customer_id: session.customer,
              stripe_subscription_id: session.subscription,
              status: 'active',
              current_period_start: new Date().toISOString(),
              current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            }, { onConflict: 'clinic_id' });
        }

        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        
        await supabase
          .from('subscriptions')
          .update({
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
          })
          .eq('stripe_subscription_id', subscription.id);

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        
        await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            canceled_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscription.id);

        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        
        // Get subscription to find clinic_id
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('id, clinic_id')
          .eq('stripe_subscription_id', invoice.subscription)
          .single();

        if (sub) {
          await supabase
            .from('payment_history')
            .insert({
              subscription_id: sub.id,
              clinic_id: sub.clinic_id,
              stripe_payment_intent_id: invoice.payment_intent,
              stripe_invoice_id: invoice.id,
              amount_cents: invoice.amount_paid,
              currency: invoice.currency,
              status: 'succeeded',
              paid_at: new Date(invoice.status_transitions.paid_at * 1000).toISOString(),
              receipt_url: invoice.hosted_invoice_url,
              invoice_pdf_url: invoice.invoice_pdf
            });
        }

        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('id, clinic_id')
          .eq('stripe_subscription_id', invoice.subscription)
          .single();

        if (sub) {
          await supabase
            .from('payment_history')
            .insert({
              subscription_id: sub.id,
              clinic_id: sub.clinic_id,
              stripe_invoice_id: invoice.id,
              amount_cents: invoice.amount_due,
              currency: invoice.currency,
              status: 'failed',
              failed_at: new Date().toISOString(),
              failure_reason: invoice.last_finalization_error?.message || 'Payment failed'
            });

          // Update subscription status
          await supabase
            .from('subscriptions')
            .update({ status: 'past_due' })
            .eq('id', sub.id);
        }

        break;
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// GET PAYMENT HISTORY
// ============================================================================

router.get('/payments', requireRole('admin', 'superadmin'), async (req, res) => {
  try {
    const { clinic_id } = req.user;

    const { data: payments, error } = await supabase
      .from('payment_history')
      .select('*')
      .eq('clinic_id', clinic_id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, payments });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
