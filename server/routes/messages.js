import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/messages/conversations
 * Get all conversations for the current user (grouped by the other participant)
 */
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get all messages where user is sender or receiver
    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        id, sender_id, receiver_id, content, read_at, created_at,
        sender:users!messages_sender_id_fkey(id, first_name, last_name, role, profile_image_url),
        receiver:users!messages_receiver_id_fkey(id, first_name, last_name, role, profile_image_url)
      `)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching conversations:', error);
      return res.status(500).json({ error: 'Failed to fetch conversations' });
    }

    // Group by the other participant to build conversation list
    const conversationMap = {};
    for (const msg of (messages || [])) {
      const otherId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
      const otherUser = msg.sender_id === userId ? msg.receiver : msg.sender;

      if (!conversationMap[otherId]) {
        conversationMap[otherId] = {
          userId: otherId,
          name: otherUser ? `${otherUser.first_name || ''} ${otherUser.last_name || ''}`.trim() : 'Unknown',
          role: otherUser?.role || 'unknown',
          profileImage: otherUser?.profile_image_url || null,
          lastMessage: msg.content,
          lastMessageTime: msg.created_at,
          lastMessageSenderId: msg.sender_id,
          unreadCount: 0,
        };
      }

      // Count unread messages from the other person
      if (msg.receiver_id === userId && !msg.read_at) {
        conversationMap[otherId].unreadCount++;
      }
    }

    const conversations = Object.values(conversationMap)
      .sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));

    res.json({ success: true, conversations });
  } catch (error) {
    console.error('Conversations error:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

/**
 * GET /api/messages/contacts
 * Get available contacts (admins/dispatchers in same clinic, or all for superadmin)
 */
router.get('/contacts', authenticateToken, async (req, res) => {
  try {
    const { userId, role: userRole } = req.user;

    // Get current user's clinic
    const { data: currentUser } = await supabase
      .from('users')
      .select('clinic_id, role')
      .eq('id', userId)
      .single();

    let query = supabase
      .from('users')
      .select('id, first_name, last_name, role, email, phone, profile_image_url, status')
      .neq('id', userId)
      .eq('status', 'active');

    // Drivers see admins + dispatchers; admins/dispatchers see drivers + other staff
    if (currentUser?.role === 'driver') {
      query = query.in('role', ['admin', 'dispatcher', 'superadmin']);
    }

    // Filter by clinic (unless superadmin)
    if (currentUser?.role !== 'superadmin' && currentUser?.clinic_id) {
      query = query.eq('clinic_id', currentUser.clinic_id);
    }

    const { data: contacts, error } = await query.order('first_name');

    if (error) {
      console.error('Error fetching contacts:', error);
      return res.status(500).json({ error: 'Failed to fetch contacts' });
    }

    const formatted = (contacts || []).map(c => ({
      id: c.id,
      name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email,
      firstName: c.first_name,
      lastName: c.last_name,
      role: c.role,
      email: c.email,
      phone: c.phone,
      profileImage: c.profile_image_url,
    }));

    res.json({ success: true, contacts: formatted });
  } catch (error) {
    console.error('Contacts error:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

/**
 * GET /api/messages/unread-count
 * Get total unread message count for the current user (for sidebar badge)
 */
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { count, error } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('receiver_id', userId)
      .is('read_at', null);

    if (error) return res.status(500).json({ error: 'Failed to get unread count' });
    res.json({ success: true, unreadCount: count || 0 });
  } catch (error) {
    console.error('Unread count error:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

/**
 * GET /api/messages/:otherUserId
 * Get messages between current user and another user
 */
router.get('/:otherUserId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { otherUserId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const before = req.query.before; // cursor for pagination

    let query = supabase
      .from('messages')
      .select(`
        id, sender_id, receiver_id, content, read_at, created_at,
        sender:users!messages_sender_id_fkey(id, first_name, last_name, role)
      `)
      .or(
        `and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`
      )
      .order('created_at', { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data: messages, error } = await query;

    if (error) {
      console.error('Error fetching messages:', error);
      return res.status(500).json({ error: 'Failed to fetch messages' });
    }

    // Mark unread messages from the other user as read
    await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('sender_id', otherUserId)
      .eq('receiver_id', userId)
      .is('read_at', null);

    const formatted = (messages || []).reverse().map(m => ({
      id: m.id,
      senderId: m.sender_id,
      receiverId: m.receiver_id,
      senderName: m.sender ? `${m.sender.first_name || ''} ${m.sender.last_name || ''}`.trim() : 'Unknown',
      senderRole: m.sender?.role || 'unknown',
      content: m.content,
      readAt: m.read_at,
      createdAt: m.created_at,
      isMe: m.sender_id === userId,
    }));

    res.json({ success: true, messages: formatted });
  } catch (error) {
    console.error('Messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

/**
 * POST /api/messages
 * Send a message to another user
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { receiverId, content } = req.body;

    if (!receiverId || !content?.trim()) {
      return res.status(400).json({ error: 'receiverId and content are required' });
    }

    // Verify receiver exists
    const { data: receiver } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .eq('id', receiverId)
      .single();

    if (!receiver) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        sender_id: userId,
        receiver_id: receiverId,
        content: content.trim(),
      })
      .select(`
        id, sender_id, receiver_id, content, read_at, created_at,
        sender:users!messages_sender_id_fkey(id, first_name, last_name, role)
      `)
      .single();

    if (error) {
      console.error('Error sending message:', error);
      return res.status(500).json({ error: 'Failed to send message' });
    }

    const formatted = {
      id: message.id,
      senderId: message.sender_id,
      receiverId: message.receiver_id,
      senderName: message.sender ? `${message.sender.first_name || ''} ${message.sender.last_name || ''}`.trim() : 'Unknown',
      senderRole: message.sender?.role || 'unknown',
      content: message.content,
      readAt: message.read_at,
      createdAt: message.created_at,
      isMe: true,
    };

    res.json({ success: true, message: formatted });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

/**
 * PUT /api/messages/:messageId/read
 * Mark a specific message as read
 */
router.put('/:messageId/read', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.userId;

    const { error } = await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('id', messageId)
      .eq('receiver_id', userId);

    if (error) {
      return res.status(500).json({ error: 'Failed to mark as read' });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

export default router;
