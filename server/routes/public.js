import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY // Use anon key for public access
);

/**
 * POST /api/public/contact
 * Submit contact form from pricing page (no auth required)
 */
router.post('/contact', async (req, res) => {
  try {
    const { company_name, contact_name, email, phone, message } = req.body;

    // Validate required fields
    if (!company_name || !contact_name || !email) {
      return res.status(400).json({ 
        error: 'Company name, contact name, and email are required' 
      });
    }

    // Insert contact submission
    const { data, error } = await supabase
      .from('contact_submissions')
      .insert({
        company_name,
        contact_name,
        email,
        phone,
        message,
        status: 'new'
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error submitting contact form:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
