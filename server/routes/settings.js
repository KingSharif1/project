import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

// ============ DOCUMENT SUBMISSIONS ============

router.get('/document-submissions', async (req, res) => {
  try {
    const { driverId, status } = req.query;
    let query = supabase.from('document_submissions').select('*').order('submission_date', { ascending: false });
    if (driverId) query = query.eq('driver_id', driverId);
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error in GET /document-submissions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/document-submissions', async (req, res) => {
  try {
    const { data, error } = await supabase.from('document_submissions').insert([req.body]).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error in POST /document-submissions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/document-submissions/:id/approve', requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewerId, notes } = req.body;
    const { data, error } = await supabase.from('document_submissions').update({
      status: 'approved', reviewed_by: reviewerId, reviewed_at: new Date().toISOString(), review_notes: notes
    }).eq('id', id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    await supabase.from('document_reviews').insert([{ submission_id: id, reviewer_id: reviewerId, action: 'approved', notes }]);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error in PUT /document-submissions/:id/approve:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/document-submissions/:id/reject', requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewerId, reason } = req.body;
    const { data, error } = await supabase.from('document_submissions').update({
      status: 'rejected', reviewed_by: reviewerId, reviewed_at: new Date().toISOString(), rejection_reason: reason
    }).eq('id', id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    await supabase.from('document_reviews').insert([{ submission_id: id, reviewer_id: reviewerId, action: 'rejected', notes: reason }]);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error in PUT /document-submissions/:id/reject:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ SYSTEM SETTINGS ============

router.get('/system-settings', async (req, res) => {
  try {
    const { category, key } = req.query;
    let query = supabase.from('system_settings').select('*');
    if (category) query = query.eq('category', category);
    if (key) query = query.eq('setting_key', key);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, data: key ? (data?.[0] || null) : (data || []) });
  } catch (error) {
    console.error('Error in GET /system-settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/system-settings', requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const { key, value, category, userId } = req.body;
    const { data, error } = await supabase.from('system_settings').upsert({
      setting_key: key, setting_value: value, category, updated_by: userId
    }, { onConflict: 'setting_key' }).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error in PUT /system-settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/system-settings/:key', requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const { error } = await supabase.from('system_settings').delete().eq('setting_key', req.params.key);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /system-settings/:key:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ NOTIFICATION SETTINGS ============

router.get('/notification-settings', async (req, res) => {
  try {
    const { userId, driverId } = req.query;
    let query = supabase.from('notification_settings').select('*');
    if (userId) query = query.eq('user_id', userId);
    if (driverId) query = query.eq('driver_id', driverId);
    const { data, error } = await query.maybeSingle();
    if (error && error.code !== 'PGRST116') return res.status(500).json({ error: error.message });
    res.json({ success: true, data: data || null });
  } catch (error) {
    console.error('Error in GET /notification-settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/notification-settings', async (req, res) => {
  try {
    const { data, error } = await supabase.from('notification_settings').upsert(req.body).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error in PUT /notification-settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ REMINDER SCHEDULES ============

router.get('/reminder-schedules', async (req, res) => {
  try {
    const { enabledOnly } = req.query;
    let query = supabase.from('reminder_schedules').select('*').order('days_before_expiry', { ascending: false });
    if (enabledOnly === 'true') query = query.eq('is_enabled', true);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error in GET /reminder-schedules:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/reminder-schedules', requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const { data, error } = await supabase.from('reminder_schedules').insert([req.body]).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error in POST /reminder-schedules:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/reminder-schedules/:id', requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const { data, error } = await supabase.from('reminder_schedules').update(req.body).eq('id', req.params.id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error in PUT /reminder-schedules/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/reminder-schedules/:id', requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const { error } = await supabase.from('reminder_schedules').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /reminder-schedules/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ COMPLIANCE METRICS ============

router.get('/compliance-metrics', async (req, res) => {
  try {
    const { startDate, endDate, latest } = req.query;
    if (latest === 'true') {
      const { data, error } = await supabase.from('compliance_metrics').select('*').order('metric_date', { ascending: false }).limit(1).maybeSingle();
      if (error && error.code !== 'PGRST116') return res.status(500).json({ error: error.message });
      return res.json({ success: true, data: data || null });
    }
    let query = supabase.from('compliance_metrics').select('*').order('metric_date', { ascending: true });
    if (startDate) query = query.gte('metric_date', startDate);
    if (endDate) query = query.lte('metric_date', endDate);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error in GET /compliance-metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/compliance-metrics', async (req, res) => {
  try {
    const { data, error } = await supabase.from('compliance_metrics').insert([req.body]).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error in POST /compliance-metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ DOCUMENT EXPIRY ALERTS ============

router.get('/document-expiry-alerts', async (req, res) => {
  try {
    const { driverId, activeOnly } = req.query;
    let query = supabase.from('document_expiry_alerts').select('*');
    if (driverId) query = query.eq('driver_id', driverId);
    if (activeOnly === 'true') query = query.eq('alert_sent', false);
    query = query.order('alert_date', { ascending: activeOnly === 'true' ? true : false });
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error in GET /document-expiry-alerts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/document-expiry-alerts', async (req, res) => {
  try {
    const { data, error } = await supabase.from('document_expiry_alerts').insert([req.body]).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error in POST /document-expiry-alerts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/document-expiry-alerts/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('document_expiry_alerts').update(req.body).eq('id', req.params.id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error in PUT /document-expiry-alerts/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
