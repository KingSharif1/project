import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare, Search, Send, ChevronLeft,
  CheckCheck, Plus, RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getConversations, getContacts, getMessages, sendMessage } from '../services/api';
import { supabase } from '../lib/supabase';

interface Conversation {
  userId: string;
  name: string;
  role: string;
  profileImage: string | null;
  lastMessage: string;
  lastMessageTime: string;
  lastMessageSenderId: string;
  unreadCount: number;
}

interface Contact {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  role: string;
  email: string;
  phone: string;
  profileImage: string | null;
}

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  senderName: string;
  senderRole: string;
  content: string;
  readAt: string | null;
  createdAt: string;
  isMe: boolean;
}

export const MessageCenter: React.FC = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Real-time subscription for new messages + read receipts
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('web-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload: any) => {
          const msg = payload.new;
          if (msg.sender_id === user.id || msg.receiver_id === user.id) {
            loadConversations();
            const activeId = selectedConversation?.userId || selectedContact?.id;
            if (activeId && (msg.sender_id === activeId || msg.receiver_id === activeId)) {
              loadMessages(activeId);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload: any) => {
          const msg = payload.new;
          // Read receipt: I sent this message and it now has read_at
          if (msg.sender_id === user.id && msg.read_at) {
            setMessages(prev => prev.map(m =>
              m.id === msg.id ? { ...m, readAt: msg.read_at } : m
            ));
          }
          // Also refresh conversations for unread count changes
          if (msg.sender_id === user.id || msg.receiver_id === user.id) {
            loadConversations();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, selectedConversation?.userId, selectedContact?.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when conversation selected
  useEffect(() => {
    if (selectedConversation || selectedContact) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [selectedConversation, selectedContact]);

  const loadConversations = async () => {
    try {
      const res = await getConversations();
      if (res.success) {
        setConversations(res.conversations);
      }
    } catch (e) {
      console.error('Failed to load conversations:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadContacts = async () => {
    try {
      const res = await getContacts();
      if (res.success) {
        setContacts(res.contacts);
      }
    } catch (e) {
      console.error('Failed to load contacts:', e);
    }
  };

  const loadMessages = async (otherUserId: string) => {
    setLoadingMessages(true);
    try {
      const res = await getMessages(otherUserId, 100);
      if (res.success) {
        setMessages(res.messages);
      }
    } catch (e) {
      console.error('Failed to load messages:', e);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    setSelectedContact(null);
    setShowNewChat(false);
    loadMessages(conv.userId);
  };

  const handleSelectContact = (contact: Contact) => {
    // Check if conversation already exists
    const existing = conversations.find(c => c.userId === contact.id);
    if (existing) {
      handleSelectConversation(existing);
    } else {
      setSelectedContact(contact);
      setSelectedConversation(null);
      setMessages([]);
    }
    setShowNewChat(false);
    setContactSearch('');
  };

  const handleNewChat = () => {
    setShowNewChat(true);
    setContactSearch('');
    loadContacts();
  };

  const handleSend = async () => {
    const receiverId = selectedConversation?.userId || selectedContact?.id;
    if (!receiverId || !newMessage.trim() || sending) return;

    setSending(true);
    try {
      const res = await sendMessage(receiverId, newMessage.trim());
      if (res.success) {
        setNewMessage('');
        loadMessages(receiverId);
        loadConversations();
      }
    } catch (e) {
      console.error('Failed to send message:', e);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      driver: 'bg-blue-100 text-blue-700',
      admin: 'bg-purple-100 text-purple-700',
      dispatcher: 'bg-green-100 text-green-700',
      superadmin: 'bg-red-100 text-red-700',
    };
    return colors[role] || 'bg-gray-100 text-gray-700';
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  const activeUserId = selectedConversation?.userId || selectedContact?.id;
  const activeName = selectedConversation?.name || (selectedContact ? selectedContact.name : '');
  const activeRole = selectedConversation?.role || selectedContact?.role || '';

  const filteredConversations = conversations.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
    c.role.toLowerCase().includes(contactSearch.toLowerCase())
  );

  // Exclude contacts that already have conversations
  const newContacts = filteredContacts.filter(
    c => !conversations.some(conv => conv.userId === c.id)
  );

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
            <p className="text-sm text-gray-500">
              {totalUnread > 0 ? `${totalUnread} unread message${totalUnread > 1 ? 's' : ''}` : 'All caught up'}
            </p>
          </div>
        </div>
        <button
          onClick={loadConversations}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm min-h-0">

        {/* Left panel — Conversations */}
        <div className={`w-80 border-r border-gray-200 flex flex-col shrink-0 ${activeUserId ? 'hidden lg:flex' : 'flex'}`}>
          {/* Search + New Chat */}
          <div className="p-4 border-b border-gray-100 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <button
              onClick={handleNewChat}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Conversation
            </button>
          </div>

          {/* New Chat — Contact Picker */}
          {showNewChat && (
            <div className="border-b border-gray-200 bg-blue-50/50">
              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Select Contact</span>
                  <button onClick={() => setShowNewChat(false)} className="text-xs text-gray-500 hover:text-gray-700">
                    Cancel
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={contactSearch}
                  onChange={e => setContactSearch(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  autoFocus
                />
              </div>
              <div className="max-h-48 overflow-y-auto">
                {newContacts.length === 0 && filteredContacts.length === 0 ? (
                  <p className="text-center text-sm text-gray-500 py-4">No contacts found</p>
                ) : (
                  (newContacts.length > 0 ? newContacts : filteredContacts).map(contact => (
                    <button
                      key={contact.id}
                      onClick={() => handleSelectContact(contact)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-100/50 transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {getInitials(contact.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{contact.name}</p>
                        <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${getRoleBadge(contact.role)}`}>
                          {contact.role}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <MessageSquare className="w-10 h-10 text-gray-300 mb-3" />
                <p className="text-sm font-medium text-gray-500">No conversations yet</p>
                <p className="text-xs text-gray-400 mt-1">Start a new conversation with a driver</p>
              </div>
            ) : (
              filteredConversations.map(conv => (
                <button
                  key={conv.userId}
                  onClick={() => handleSelectConversation(conv)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 hover:bg-gray-50 transition-colors text-left ${
                    activeUserId === conv.userId ? 'bg-blue-50 border-l-2 border-l-blue-600' : ''
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-sm font-bold">
                      {getInitials(conv.name)}
                    </div>
                    {conv.unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                        <span className="text-[10px] font-bold text-white">{conv.unreadCount > 9 ? '9+' : conv.unreadCount}</span>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm truncate ${conv.unreadCount > 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                        {conv.name}
                      </p>
                      <span className="text-[10px] text-gray-400 shrink-0">{formatTime(conv.lastMessageTime)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded shrink-0 ${getRoleBadge(conv.role)}`}>
                        {conv.role}
                      </span>
                      <p className={`text-xs truncate ${conv.unreadCount > 0 ? 'text-gray-700 font-medium' : 'text-gray-500'}`}>
                        {conv.lastMessageSenderId === user?.id ? 'You: ' : ''}{conv.lastMessage}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right panel — Chat */}
        <div className={`flex-1 flex flex-col min-w-0 ${!activeUserId ? 'hidden lg:flex' : 'flex'}`}>
          {activeUserId ? (
            <>
              {/* Chat Header */}
              <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-4 bg-white">
                <button
                  onClick={() => { setSelectedConversation(null); setSelectedContact(null); }}
                  className="lg:hidden p-1 hover:bg-gray-100 rounded-lg"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {getInitials(activeName)}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-gray-900 truncate">{activeName}</h3>
                  <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${getRoleBadge(activeRole)}`}>
                    {activeRole}
                  </span>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-gray-50/50">
                {loadingMessages ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <MessageSquare className="w-12 h-12 text-gray-300 mb-3" />
                    <p className="text-sm text-gray-500">No messages yet</p>
                    <p className="text-xs text-gray-400 mt-1">Send a message to start the conversation</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const showDateSep = idx === 0 || new Date(msg.createdAt).toDateString() !== new Date(messages[idx - 1].createdAt).toDateString();
                    return (
                      <React.Fragment key={msg.id}>
                        {showDateSep && (
                          <div className="flex items-center gap-3 py-2">
                            <div className="flex-1 h-px bg-gray-200" />
                            <span className="text-[10px] font-semibold text-gray-400 uppercase">
                              {new Date(msg.createdAt).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                            </span>
                            <div className="flex-1 h-px bg-gray-200" />
                          </div>
                        )}
                        <div className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] ${msg.isMe ? 'order-2' : ''}`}>
                            <div
                              className={`px-4 py-2.5 rounded-2xl ${
                                msg.isMe
                                  ? 'bg-blue-600 text-white rounded-br-md'
                                  : 'bg-white text-gray-900 border border-gray-200 rounded-bl-md shadow-sm'
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                            </div>
                            <div className={`flex items-center gap-1.5 mt-1 ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
                              <span className="text-[10px] text-gray-400">{formatMessageTime(msg.createdAt)}</span>
                              {msg.isMe && msg.readAt && (
                                <CheckCheck className="w-3 h-3 text-blue-500" />
                              )}
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="px-6 py-4 border-t border-gray-200 bg-white">
                <div className="flex items-center gap-3">
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    disabled={sending}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!newMessage.trim() || sending}
                    className="w-11 h-11 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
              <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
                <MessageSquare className="w-10 h-10 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Select a conversation</h3>
              <p className="text-sm text-gray-500 max-w-sm">
                Choose a conversation from the list or start a new one to message your drivers and team members.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
