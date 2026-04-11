import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { sendSupportTicketEmail } from '../lib/email.js';

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

router.use(authenticateToken);

// ============================================================================
// SUPPORT TICKETS
// ============================================================================

/**
 * GET /api/support/tickets
 * Get support tickets (filtered by role)
 */
router.get('/tickets', async (req, res) => {
  try {
    const { userId, role, clinicId } = req.user;
    const { status, priority } = req.query;

    // Only regular admins need clinicId
    if (role === 'admin' && !clinicId) {
      return res.status(403).json({ 
        error: 'Access denied. Your account is not associated with a company. Please contact support.' 
      });
    }

    let query = supabase
      .from('support_tickets')
      .select(`
        *,
        clinic:clinic_id (id, name),
        creator:created_by (id, first_name, last_name, email),
        ticket_responses (
          id,
          message,
          is_internal,
          created_at,
          user:user_id (id, first_name, last_name, role)
        )
      `)
      .order('created_at', { ascending: false });

    // Superadmins see all tickets, others see only their clinic's tickets
    if (role !== 'superadmin') {
      query = query.eq('clinic_id', clinicId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (priority) {
      query = query.eq('priority', priority);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Filter out internal responses for non-superadmins
    const filteredData = data.map(ticket => ({
      ...ticket,
      ticket_responses: ticket.ticket_responses.filter(
        response => !response.is_internal || role === 'superadmin'
      )
    }));

    res.json({ success: true, data: filteredData });
  } catch (error) {
    console.error('Error fetching support tickets:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/support/tickets/:id
 * Get single ticket with full conversation
 */
router.get('/tickets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { role, clinicId } = req.user;

    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .select(`
        *,
        clinic:clinic_id (id, name),
        creator:created_by (id, first_name, last_name, email),
        ticket_responses (
          id,
          message,
          is_internal,
          created_at,
          user:user_id (id, first_name, last_name, role)
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Check access
    if (role !== 'superadmin' && ticket.clinic_id !== clinicId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Filter internal responses
    ticket.ticket_responses = ticket.ticket_responses.filter(
      response => !response.is_internal || role === 'superadmin'
    );

    res.json({ success: true, data: ticket });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/support/tickets
 * Create a new support ticket
 */
router.post('/tickets', async (req, res) => {
  try {
    const { userId, clinicId, role } = req.user;
    const { subject, message, priority } = req.body;

    if (!subject || !message) {
      return res.status(400).json({
        error: 'Subject and message are required'
      });
    }

    // Only admins with a clinic can create tickets (not superadmin, dispatchers, or drivers)
    if (role !== 'admin' || !clinicId) {
      return res.status(403).json({
        error: 'Only company administrators can create support tickets'
      });
    }

    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .insert({
        clinic_id: clinicId,
        created_by: userId,
        subject,
        message,
        priority: priority || 'normal',
        status: 'open'
      })
      .select(`
        *,
        clinic:clinic_id (id, name)
      `)
      .single();

    if (error) throw error;

    // Send email notification to superadmin
    const superadminEmail = process.env.SUPERADMIN_EMAIL || 'admin@yourdomain.com';
    
    await sendSupportTicketEmail({
      to: superadminEmail,
      companyName: ticket.clinic.name,
      subject,
      message,
      ticketId: ticket.id,
      priority: priority || 'normal'
    });

    res.json({ success: true, data: ticket });
  } catch (error) {
    console.error('Error creating support ticket:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/support/tickets/:id/responses
 * Add a response to a ticket
 */
router.post('/tickets/:id/responses', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role, clinicId } = req.user;
    const { message, isInternal } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get ticket to verify access
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .select('clinic_id, status')
      .eq('id', id)
      .single();

    if (ticketError) throw ticketError;
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Check access
    if (role !== 'superadmin' && ticket.clinic_id !== clinicId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Only superadmins can create internal notes
    const isInternalNote = isInternal && role === 'superadmin';

    const { data: response, error } = await supabase
      .from('ticket_responses')
      .insert({
        ticket_id: id,
        user_id: userId,
        message,
        is_internal: isInternalNote
      })
      .select(`
        *,
        user:user_id (id, first_name, last_name, role)
      `)
      .single();

    if (error) throw error;

    // Update ticket status to in_progress if it was open
    if (ticket.status === 'open') {
      await supabase
        .from('support_tickets')
        .update({ status: 'in_progress' })
        .eq('id', id);
    }

    res.json({ success: true, data: response });
  } catch (error) {
    console.error('Error adding ticket response:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/support/tickets/:id
 * Update ticket status/priority (superadmin only)
 */
router.put('/tickets/:id', requireRole('superadmin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority, assignedTo } = req.body;

    const updates = {};
    if (status) updates.status = status;
    if (priority) updates.priority = priority;
    if (assignedTo !== undefined) updates.assigned_to = assignedTo;

    // Set resolved_at if status is resolved
    if (status === 'resolved') {
      updates.resolved_at = new Date().toISOString();
    }

    // Set closed_at if status is closed
    if (status === 'closed') {
      updates.closed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('support_tickets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating ticket:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/support/stats
 * Get support ticket statistics (superadmin only)
 */
router.get('/stats', requireRole('superadmin'), async (req, res) => {
  try {
    const { data: tickets, error } = await supabase
      .from('support_tickets')
      .select('status, priority, created_at');

    if (error) throw error;

    const stats = {
      total: tickets.length,
      byStatus: {
        open: tickets.filter(t => t.status === 'open').length,
        in_progress: tickets.filter(t => t.status === 'in_progress').length,
        resolved: tickets.filter(t => t.status === 'resolved').length,
        closed: tickets.filter(t => t.status === 'closed').length
      },
      byPriority: {
        low: tickets.filter(t => t.priority === 'low').length,
        normal: tickets.filter(t => t.priority === 'normal').length,
        high: tickets.filter(t => t.priority === 'high').length,
        urgent: tickets.filter(t => t.priority === 'urgent').length
      }
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching support stats:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
