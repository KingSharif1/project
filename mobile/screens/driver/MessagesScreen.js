import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../../theme';
import { driverAPI, supabase } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function DriverMessagesScreen({ navigation }) {
  const [conversations, setConversations] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [selectedConvo, setSelectedConvo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const flatListRef = useRef(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const selectedConvoRef = useRef(null);

  // Keep ref in sync so realtime callback can access latest value
  useEffect(() => {
    selectedConvoRef.current = selectedConvo;
  }, [selectedConvo]);

  // Load user ID for realtime filtering
  useEffect(() => {
    (async () => {
      const profile = await AsyncStorage.getItem('userProfile');
      if (profile) {
        try { setCurrentUserId(JSON.parse(profile).userId); } catch {}
      }
    })();
    loadConversations();
  }, []);

  // Supabase Realtime subscription for messages
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel('mobile-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new;
          // Only care about messages involving this user
          if (msg.sender_id !== currentUserId && msg.receiver_id !== currentUserId) return;

          const activeConvo = selectedConvoRef.current;
          const activeId = activeConvo?.userId;

          if (activeId && (msg.sender_id === activeId || msg.receiver_id === activeId)) {
            // In active chat — reload messages to get formatted data
            loadMessages(activeId);
            // Mark as read if the message is from the other person
            if (msg.sender_id === activeId) {
              driverAPI.markMessagesRead(activeId).catch(() => {});
            }
          }
          // Always refresh conversation list for updated last message / unread count
          loadConversations();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new;
          // Read receipt update — if I sent this message and it now has read_at
          if (msg.sender_id === currentUserId && msg.read_at) {
            setMessages(prev => prev.map(m =>
              m.id === msg.id ? { ...m, readAt: msg.read_at } : m
            ));
          }
        }
      )
      .subscribe((status) => {
        console.log('[Messages Realtime] Status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const loadConversations = useCallback(async () => {
    try {
      const result = await driverAPI.getConversations();
      if (result.success) {
        setConversations(result.conversations || []);
      }
    } catch (error) {
      console.error('Load conversations error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadContacts = useCallback(async () => {
    try {
      const result = await driverAPI.getContacts();
      if (result.success) {
        setContacts(result.contacts || []);
      }
    } catch (error) {
      console.error('Load contacts error:', error);
    }
  }, []);

  const loadMessages = useCallback(async (otherUserId) => {
    try {
      const result = await driverAPI.getMessages(otherUserId);
      if (result.success) {
        setMessages(result.messages || []);
      }
    } catch (error) {
      console.error('Load messages error:', error);
    }
  }, []);

  const openConversation = (convo) => {
    setSelectedConvo(convo);
    loadMessages(convo.userId);
    // Clear unread count locally
    setConversations(prev =>
      prev.map(c => c.userId === convo.userId ? { ...c, unreadCount: 0 } : c)
    );
  };

  const startNewChat = (contact) => {
    setSelectedConvo({
      userId: contact.id,
      name: contact.name,
      role: contact.role,
    });
    loadMessages(contact.id);
    setShowNewChat(false);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConvo?.userId || sending) return;
    setSending(true);
    try {
      const result = await driverAPI.sendMessage(selectedConvo.userId, newMessage.trim());
      if (result.success && result.message) {
        setMessages(prev => [...prev, result.message]);
        setNewMessage('');
        // Update conversation list
        setConversations(prev => {
          const exists = prev.find(c => c.userId === selectedConvo.userId);
          if (exists) {
            return prev.map(c =>
              c.userId === selectedConvo.userId
                ? { ...c, lastMessage: result.message.content, lastMessageTime: result.message.createdAt }
                : c
            );
          }
          return [{ userId: selectedConvo.userId, name: selectedConvo.name, role: selectedConvo.role, lastMessage: result.message.content, lastMessageTime: result.message.createdAt, unreadCount: 0 }, ...prev];
        });
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch (error) {
      console.error('Send message error:', error);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = diffMs / 3600000;

    if (diffHours < 1) {
      const mins = Math.round(diffMs / 60000);
      return mins <= 1 ? 'Just now' : `${mins}m ago`;
    }
    if (diffHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getRoleIcon = (role) => {
    if (role === 'dispatcher') return 'headset-outline';
    if (role === 'admin' || role === 'superadmin') return 'business-outline';
    return 'person-outline';
  };

  // New chat contact picker
  if (showNewChat) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.chatHeader}>
          <TouchableOpacity style={styles.backButton} onPress={() => setShowNewChat(false)}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textWhite} />
          </TouchableOpacity>
          <View style={styles.chatHeaderInfo}>
            <Text style={styles.chatHeaderName}>New Message</Text>
          </View>
        </View>
        <FlatList
          data={contacts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.convoCard} onPress={() => startNewChat(item)} activeOpacity={0.7}>
              <View style={styles.convoAvatar}>
                <Ionicons name={getRoleIcon(item.role)} size={24} color={COLORS.textWhite} />
              </View>
              <View style={styles.convoInfo}>
                <Text style={styles.convoName}>{item.name}</Text>
                <Text style={[styles.convoLastMessage, { textTransform: 'capitalize' }]}>{item.role}</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color={COLORS.seafoam} />
              <Text style={styles.emptySubtext}>Loading contacts...</Text>
            </View>
          }
        />
      </View>
    );
  }

  // Message detail view
  if (selectedConvo) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        {/* Chat Header */}
        <View style={styles.chatHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => { setSelectedConvo(null); loadConversations(); }}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.textWhite} />
          </TouchableOpacity>
          <View style={styles.chatHeaderInfo}>
            <View style={styles.chatAvatar}>
              <Ionicons name={getRoleIcon(selectedConvo.role)} size={20} color={COLORS.textWhite} />
            </View>
            <View>
              <Text style={styles.chatHeaderName}>{selectedConvo.name}</Text>
              <Text style={styles.chatHeaderRole}>{selectedConvo.role}</Text>
            </View>
          </View>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="chatbubble-outline" size={40} color={COLORS.textLight} />
              <Text style={styles.emptySubtext}>No messages yet. Say hello!</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.messageBubbleRow, item.isMe && styles.messageBubbleRowMe]}>
              <View style={[styles.messageBubble, item.isMe ? styles.messageBubbleMe : styles.messageBubbleOther]}>
                {!item.isMe && (
                  <Text style={styles.senderLabel}>{item.senderName}</Text>
                )}
                <Text style={[styles.messageText, item.isMe && styles.messageTextMe]}>
                  {item.content}
                </Text>
                <View style={styles.messageFooter}>
                  <Text style={[styles.messageTime, item.isMe && styles.messageTimeMe]}>
                    {formatTime(item.createdAt)}
                  </Text>
                  {item.isMe && (
                    <Ionicons
                      name={item.readAt ? 'checkmark-done' : 'checkmark'}
                      size={14}
                      color={item.readAt ? COLORS.seafoam : 'rgba(255,255,255,0.5)'}
                      style={{ marginLeft: 4 }}
                    />
                  )}
                </View>
              </View>
            </View>
          )}
        />

        {/* Input */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <View style={styles.inputBar}>
            <TextInput
              style={styles.messageInput}
              placeholder="Type a message..."
              placeholderTextColor={COLORS.textLight}
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={!newMessage.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color={COLORS.textWhite} />
              ) : (
                <Ionicons name="send" size={20} color={COLORS.textWhite} />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // Conversation list view
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.seafoam} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity
          style={styles.newChatButton}
          onPress={() => { setShowNewChat(true); loadContacts(); }}
        >
          <Ionicons name="create-outline" size={22} color={COLORS.textWhite} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.userId}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadConversations(); }}
            colors={[COLORS.seafoam]}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.convoCard}
            onPress={() => openConversation(item)}
            activeOpacity={0.7}
          >
            <View style={styles.convoAvatar}>
              <Ionicons name={getRoleIcon(item.role)} size={24} color={COLORS.textWhite} />
            </View>
            <View style={styles.convoInfo}>
              <View style={styles.convoTopRow}>
                <Text style={styles.convoName}>{item.name}</Text>
                <Text style={styles.convoTime}>{formatTime(item.lastMessageTime)}</Text>
              </View>
              <View style={styles.convoBottomRow}>
                <Text style={styles.convoLastMessage} numberOfLines={1}>
                  {item.lastMessage}
                </Text>
                {item.unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{item.unreadCount}</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={48} color={COLORS.textLight} />
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>Messages from dispatch will appear here</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.softGrey,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.softGrey,
  },
  header: {
    backgroundColor: COLORS.navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 56,
    paddingBottom: 16,
  },
  newChatButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textWhite,
  },
  listContainer: {
    padding: 16,
  },
  convoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    ...SHADOWS.small,
  },
  convoAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.navy,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  convoInfo: {
    flex: 1,
  },
  convoTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  convoName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  convoTime: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  convoBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  convoLastMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 1,
    marginRight: 8,
  },
  unreadBadge: {
    backgroundColor: COLORS.seafoam,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textWhite,
  },
  // Chat view styles
  chatHeader: {
    backgroundColor: COLORS.navy,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 56,
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  chatHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  chatAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.seafoam,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  chatHeaderName: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.textWhite,
  },
  chatHeaderRole: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'capitalize',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageBubbleRow: {
    flexDirection: 'row',
    marginBottom: 10,
    justifyContent: 'flex-start',
  },
  messageBubbleRowMe: {
    justifyContent: 'flex-end',
  },
  messageBubble: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  messageBubbleOther: {
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 4,
    ...SHADOWS.small,
  },
  messageBubbleMe: {
    backgroundColor: COLORS.navy,
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    color: COLORS.textPrimary,
    lineHeight: 21,
  },
  messageTextMe: {
    color: COLORS.textWhite,
  },
  senderLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.seafoam,
    marginBottom: 2,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
    color: COLORS.textLight,
  },
  messageTimeMe: {
    color: 'rgba(255,255,255,0.5)',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  messageInput: {
    flex: 1,
    backgroundColor: COLORS.softGrey,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.textPrimary,
    maxHeight: 100,
    marginRight: 10,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.seafoam,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  emptyState: {
    padding: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
  },
});
