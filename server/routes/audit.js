import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

/**
 * POST /api/audit/activity
 * Insert an activity log entry
 * NOTE: This route is BEFORE authenticateToken because it needs to work
 * for login/logout events where no valid token exists yet or anymore.
 */
router.post('/activity', async (req, res) => {
  try {
    const entry = req.body;

    // Basic validation
    if (!entry.action || !entry.entity_type) {
      return res.status(400).json({ error: 'action and entity_type are required' });
    }

    const { data, error } = await supabase
      .from('activity_log')
      .insert({
        user_id: entry.user_id || null,
        clinic_id: entry.clinic_id || null,
        action: entry.action,
        entity_type: entry.entity_type,
        entity_id: entry.entity_id || null,
        details: entry.details || {},
        ip_address: entry.ip_address || null,
      })
      .select();

    if (error) {
      console.error('Error inserting activity log:', error);
      return res.status(500).json({ error: 'Failed to insert activity log' });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error in POST /audit/activity:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// All routes below require authentication
router.use(authenticateToken);

/**
 * POST /api/audit/logs
 * Insert audit log entries (batch)
 */
router.post('/logs', async (req, res) => {
  try {
    const { entries } = req.body;

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'entries array is required' });
    }

    const { error } = await supabase
      .from('audit_logs')
      .insert(entries);

    if (error) {
      console.error('Error inserting audit logs:', error);
      return res.status(500).json({ error: 'Failed to insert audit logs' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error in POST /audit/logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/audit/logs
 * Get audit logs with optional filters
 */
router.get('/logs', requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const { userId, eventType, startDate, endDate, phiOnly } = req.query;

    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(1000);

    if (userId) query = query.eq('user_id', userId);
    if (eventType) query = query.eq('event_type', eventType);
    if (startDate) query = query.gte('timestamp', startDate);
    if (endDate) query = query.lte('timestamp', endDate);
    if (phiOnly === 'true') query = query.eq('phi_accessed', true);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching audit logs:', error);
      return res.status(500).json({ error: 'Failed to fetch audit logs' });
    }

    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error in GET /audit/logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/audit/activity
 * Get activity logs with optional filters
 */
router.get('/activity', async (req, res) => {
  try {
    const { userId, clinicId, entityType, entityId, action, startDate, endDate } = req.query;

    let query = supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false });

    if (clinicId) query = query.eq('clinic_id', clinicId);
    if (userId) query = query.eq('user_id', userId);
    if (entityType) query = query.eq('entity_type', entityType);
    if (entityId) query = query.eq('entity_id', entityId);
    if (action) query = query.eq('action', action);
    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);

    const { data, error } = await query.limit(1000);

    if (error) {
      console.error('Error fetching activity logs:', error);
      return res.status(500).json({ error: 'Failed to fetch activity logs' });
    }

    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error in GET /audit/activity:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
