import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import Stripe from 'stripe';
import { sendPaymentLinkEmail } from '../lib/email.js';

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// All routes require superadmin role
router.use(authenticateToken);
router.use(requireRole('superadmin'));

// ============================================================================
// CONTACT SUBMISSIONS - Leads from Pricing Page
// ============================================================================

/**
 * GET /api/admin/contact-submissions
 * Get all contact form submissions (leads)
 */
router.get('/contact-submissions', async (req, res) => {
  try {
    const { status } = req.query;

    let query = supabase
      .from('contact_submissions')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching contact submissions:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/admin/contact-submissions/:id
 * Update contact submission status/notes
 */
router.put('/contact-submissions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const updateData = { updated_at: new Date().toISOString() };
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    const { data, error } = await supabase
      .from('contact_submissions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating contact submission:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/admin/contact-submissions/:id
 * Delete a contact submission
 */
router.delete('/contact-submissions/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('contact_submissions')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting contact submission:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/contact-submissions/:id/convert
 * Convert contact submission to pending signup
 */
router.post('/contact-submissions/:id/convert', async (req, res) => {
  try {
    const { id } = req.params;
    const { tier } = req.body;

    if (!tier) {
      return res.status(400).json({ error: 'Tier is required' });
    }

    // Get contact submission
    const { data: submission, error: fetchError } = await supabase
      .from('contact_submissions')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Create pending signup
    const { data: signup, error: signupError } = await supabase
      .from('pending_signups')
      .insert({
        company_name: submission.company_name,
        contact_name: submission.contact_name,
        contact_email: submission.email,
        contact_phone: submission.phone,
        requested_tier: tier,
        status: 'pending',
        notes: submission.message ? `From contact form: ${submission.message}` : null
      })
      .select()
      .single();

    if (signupError) throw signupError;

    // Update contact submission to mark as converted
    const { error: updateError } = await supabase
      .from('contact_submissions')
      .update({
        status: 'converted',
        converted_to_signup_id: signup.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) throw updateError;

    res.json({ success: true, data: signup });
  } catch (error) {
    console.error('Error converting contact submission:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// PENDING SIGNUPS - Company Onboarding
// ============================================================================

/**
 * GET /api/admin/pending-signups
 * Get all pending company signups
 */
router.get('/pending-signups', async (req, res) => {
  try {
    const { status } = req.query;

    let query = supabase
      .from('pending_signups')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching pending signups:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/pending-signups
 * Create a new pending signup (prospect)
 */
router.post('/pending-signups', async (req, res) => {
  try {
    const {
      companyName,
      contactName,
      contactEmail,
      contactPhone,
      requestedTier,
      notes
    } = req.body;

    // Validation
    if (!companyName || !contactName || !contactEmail || !requestedTier) {
      return res.status(400).json({
        error: 'Missing required fields: companyName, contactName, contactEmail, requestedTier'
      });
    }

    if (!['basic', 'premium', 'enterprise'].includes(requestedTier)) {
      return res.status(400).json({
        error: 'Invalid tier. Must be: basic, premium, or enterprise'
      });
    }

    // Check if email already exists
    const { data: existing } = await supabase
      .from('pending_signups')
      .select('id')
      .eq('contact_email', contactEmail)
      .eq('status', 'pending')
      .single();

    if (existing) {
      return res.status(400).json({
        error: 'A pending signup already exists for this email'
      });
    }

    // Create pending signup
    const { data, error } = await supabase
      .from('pending_signups')
      .insert({
        company_name: companyName,
        contact_name: contactName,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        requested_tier: requestedTier,
        notes,
        status: 'pending',
        created_by: req.user.userId
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error creating pending signup:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/pending-signups/:id/send-payment
 * Send payment link to prospect
 */
router.post('/pending-signups/:id/send-payment', async (req, res) => {
  try {
    const { id } = req.params;

    // Get pending signup
    const { data: signup, error: fetchError } = await supabase
      .from('pending_signups')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (!signup) {
      return res.status(404).json({ error: 'Pending signup not found' });
    }

    if (signup.status !== 'pending') {
      return res.status(400).json({
        error: `Cannot send payment link. Current status: ${signup.status}`
      });
    }

    // Get Stripe price ID based on tier
    const priceIds = {
      basic: process.env.STRIPE_PRICE_BASIC,
      premium: process.env.STRIPE_PRICE_PREMIUM,
      enterprise: process.env.STRIPE_PRICE_ENTERPRISE
    };

    const priceId = priceIds[signup.requested_tier];
    if (!priceId) {
      return res.status(500).json({
        error: `Stripe price ID not configured for tier: ${signup.requested_tier}`
      });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      customer_email: signup.contact_email,
      client_reference_id: id, // Link back to pending_signup
      metadata: {
        pending_signup_id: id,
        company_name: signup.company_name,
        tier: signup.requested_tier
      },
      success_url: `${process.env.WEB_URL}/signup-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.WEB_URL}/signup-cancelled`
    });

    // Update pending signup with Stripe session ID
    const { error: updateError } = await supabase
      .from('pending_signups')
      .update({
        stripe_checkout_session_id: session.id,
        status: 'payment_sent',
        payment_sent_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) throw updateError;

    // Send email with payment link
    const emailResult = await sendPaymentLinkEmail({
      to: signup.contact_email,
      companyName: signup.company_name,
      checkoutUrl: session.url,
      tier: signup.requested_tier
    });

    if (!emailResult.success) {
      console.error('Failed to send payment email:', emailResult.error);
      // Don't fail the request, just log it
    }

    res.json({
      success: true,
      data: {
        checkoutUrl: session.url,
        sessionId: session.id,
        emailSent: emailResult.success
      }
    });
  } catch (error) {
    console.error('Error sending payment link:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/admin/pending-signups/:id
 * Update pending signup (notes, status, etc.)
 */
router.put('/pending-signups/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Don't allow updating certain fields
    delete updates.id;
    delete updates.created_by;
    delete updates.created_at;
    delete updates.stripe_checkout_session_id;
    delete updates.stripe_customer_id;
    delete updates.stripe_subscription_id;

    const { data, error } = await supabase
      .from('pending_signups')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating pending signup:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/admin/pending-signups/:id
 * Cancel/delete a pending signup
 */
router.delete('/pending-signups/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('pending_signups')
      .update({ status: 'canceled' })
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true, message: 'Pending signup cancelled' });
  } catch (error) {
    console.error('Error cancelling pending signup:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// COMPANY MANAGEMENT
// ============================================================================

/**
 * GET /api/admin/companies
 * Get all companies with subscription details
 */
router.get('/companies', async (req, res) => {
  try {
    const { data: clinics, error } = await supabase
      .from('clinics')
      .select(`
        *,
        subscriptions (
          id,
          tier,
          status,
          stripe_customer_id,
          stripe_subscription_id,
          current_period_start,
          current_period_end,
          cancel_at_period_end
        ),
        users!users_clinic_id_fkey (
          id,
          email,
          first_name,
          last_name,
          role
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Format response
    const companies = clinics.map(clinic => ({
      id: clinic.id,
      name: clinic.name,
      email: clinic.email,
      phone: clinic.phone,
      address: clinic.address,
      city: clinic.city,
      state: clinic.state,
      isActive: clinic.is_active,
      subscription: clinic.subscriptions?.[0] || null,
      admins: clinic.users?.filter(u => u.role === 'admin' || u.role === 'superadmin') || [],
      createdAt: clinic.created_at
    }));

    res.json({ success: true, data: companies });
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/companies/:id
 * Get detailed company information
 */
router.get('/companies/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: clinic, error } = await supabase
      .from('clinics')
      .select(`
        *,
        subscriptions (*),
        payment_history (*),
        users!users_clinic_id_fkey (*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!clinic) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Get usage stats
    const { data: drivers } = await supabase
      .from('drivers')
      .select('id')
      .eq('clinic_id', id);

    const { data: trips } = await supabase
      .from('trips')
      .select('id')
      .eq('clinic_id', id)
      .gte('created_at', new Date(new Date().setDate(new Date().getDate() - 30)).toISOString());

    res.json({
      success: true,
      data: {
        ...clinic,
        isActive: clinic.is_active,
        admins: clinic.users?.filter(u => u.role === 'admin' || u.role === 'superadmin') || [],
        stats: {
          totalDrivers: drivers?.length || 0,
          tripsLast30Days: trips?.length || 0
        }
      }
    });
  } catch (error) {
    console.error('Error fetching company details:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/admin/companies/:id/deactivate
 * Deactivate a company (soft delete - blocks login but preserves data)
 */
router.put('/companies/:id/deactivate', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Update clinic status
    const { error: clinicError } = await supabase
      .from('clinics')
      .update({ 
        is_active: false,
        deactivation_reason: reason || null,
        deactivated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (clinicError) throw clinicError;

    // Deactivate all users in this clinic
    const { error: usersError } = await supabase
      .from('users')
      .update({ status: 'inactive' })
      .eq('clinic_id', id);

    if (usersError) throw usersError;

    res.json({ 
      success: true, 
      message: 'Company deactivated successfully. All users have been blocked from login.' 
    });
  } catch (error) {
    console.error('Error deactivating company:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/admin/companies/:id/activate
 * Reactivate a company
 */
router.put('/companies/:id/activate', async (req, res) => {
  try {
    const { id } = req.params;

    // Update clinic status
    const { error: clinicError } = await supabase
      .from('clinics')
      .update({ 
        is_active: true,
        deactivation_reason: null,
        deactivated_at: null
      })
      .eq('id', id);

    if (clinicError) throw clinicError;

    // Reactivate all users in this clinic
    const { error: usersError } = await supabase
      .from('users')
      .update({ status: 'active' })
      .eq('clinic_id', id);

    if (usersError) throw usersError;

    res.json({ 
      success: true, 
      message: 'Company reactivated successfully. All users can now login.' 
    });
  } catch (error) {
    console.error('Error reactivating company:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/admin/companies/:id
 * Permanently delete a company and all associated data
 */
router.delete('/companies/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Delete in order due to foreign key constraints
    // 1. Delete trips
    await supabase.from('trips').delete().eq('clinic_id', id);
    
    // 2. Delete drivers
    await supabase.from('drivers').delete().eq('clinic_id', id);
    
    // 3. Delete patients
    await supabase.from('patients').delete().eq('clinic_id', id);
    
    // 4. Delete vehicles
    await supabase.from('vehicles').delete().eq('clinic_id', id);
    
    // 5. Delete users
    await supabase.from('users').delete().eq('clinic_id', id);
    
    // 6. Delete subscriptions
    await supabase.from('subscriptions').delete().eq('clinic_id', id);
    
    // 7. Delete payment history
    await supabase.from('payment_history').delete().eq('clinic_id', id);
    
    // 8. Delete support tickets
    await supabase.from('support_tickets').delete().eq('clinic_id', id);
    
    // 9. Finally delete the clinic
    const { error } = await supabase
      .from('clinics')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ 
      success: true, 
      message: 'Company and all associated data permanently deleted' 
    });
  } catch (error) {
    console.error('Error deleting company:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
