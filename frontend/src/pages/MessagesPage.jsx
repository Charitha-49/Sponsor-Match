import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { messageApi, creatorApi, campaignApi } from '../services/api';
import {
  MessageSquare,
  Send,
  User,
  Sparkles,
  Search,
  CheckCheck,
  Clock,
  Inbox,
  AlertCircle,
  Loader2
} from 'lucide-react';

export default function MessagesPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const targetCreatorId = searchParams.get('creatorId');
  const targetCampaignId = searchParams.get('campaignId');
  const targetBrandId = searchParams.get('brandId');

  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [error, setError] = useState('');

  // Draft state when initiating a new conversation from Smart Match or Discovery
  const [draftTargetCreator, setDraftTargetCreator] = useState(null);
  const [draftTargetCampaign, setDraftTargetCampaign] = useState(null);
  const [loadingDraft, setLoadingDraft] = useState(false);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadConversationsAndHandleParams();
  }, [targetCreatorId, targetCampaignId]);

  useEffect(() => {
    if (activeConvId) {
      setDraftTargetCreator(null);
      loadMessages(activeConvId);
    }
  }, [activeConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversationsAndHandleParams = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await messageApi.listConversations();
      const list = res.data || [];
      setConversations(list);

      if (targetCreatorId) {
        // Check if matching conversation exists
        const matched = list.find(c =>
          String(c.creatorId) === String(targetCreatorId) &&
          (!targetCampaignId || String(c.campaignId) === String(targetCampaignId))
        );

        if (matched) {
          setActiveConvId(matched.id);
        } else {
          // Fetch creator info to show draft header
          setActiveConvId(null);
          setLoadingDraft(true);
          try {
            const cRes = await creatorApi.get(targetCreatorId);
            setDraftTargetCreator(cRes.data);
            if (targetCampaignId) {
              const campRes = await campaignApi.get(targetCampaignId);
              setDraftTargetCampaign(campRes.data);
            }
          } catch (e) {
            console.error('Failed to load target creator for draft conversation', e);
          } finally {
            setLoadingDraft(false);
          }
        }
      } else if (targetBrandId) {
        // Check if matching conversation exists for brand
        const matched = list.find(c =>
          String(c.brandId) === String(targetBrandId) &&
          (!targetCampaignId || String(c.campaignId) === String(targetCampaignId))
        );

        if (matched) {
          setActiveConvId(matched.id);
        } else {
          setActiveConvId(null);
          const anyBrandConv = list.find(c => String(c.brandId) === String(targetBrandId));
          setDraftTargetCreator({ 
            name: anyBrandConv ? anyBrandConv.brandName : 'Brand', 
            creatorId: Number(targetBrandId) 
          });
          if (targetCampaignId) {
            try { 
              const campRes = await campaignApi.get(targetCampaignId); 
              setDraftTargetCampaign(campRes.data); 
            } catch(e) {
              console.error('Failed to load target campaign', e);
            }
          }
        }
      } else if (list.length > 0 && !activeConvId) {
        setActiveConvId(list[0].id);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load conversations.');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async convId => {
    try {
      const res = await messageApi.getMessages(convId);
      setMessages(res.data || []);
      // Update unread count in conversation list locally
      setConversations(prev =>
        prev.map(c => (c.id === convId ? { ...c, unreadCount: 0 } : c))
      );
    } catch (err) {
      console.error('Failed to load messages', err);
    }
  };

  const handleSendMessage = async e => {
    e?.preventDefault();
    if (!newMessage.trim() || sending) return;

    const text = newMessage.trim();
    setSending(true);

    try {
      if (activeConvId) {
        // Send message in existing conversation
        const res = await messageApi.send(activeConvId, { message: text });
        setMessages(prev => [...prev, res.data]);
        setNewMessage('');
        // Update snippet in conversation list
        setConversations(prev =>
          prev.map(c =>
            c.id === activeConvId
              ? { ...c, lastMessage: text, updatedAt: new Date().toISOString() }
              : c
          )
        );
      } else if (draftTargetCreator) {
        // Initiate new conversation
        const res = await messageApi.initiate({
          creatorId: Number(draftTargetCreator.creatorId || targetCreatorId),
          campaignId: targetCampaignId ? Number(targetCampaignId) : null,
          message: text
        });

        setNewMessage('');
        // Refresh conversations and select newly created conversation
        const convListRes = await messageApi.listConversations();
        const updatedList = convListRes.data || [];
        setConversations(updatedList);
        setDraftTargetCreator(null);
        setActiveConvId(res.data.conversationId);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const isBrand = user?.role === 'BRAND';

  const getCounterpartName = conv => {
    return isBrand ? conv.creatorName : conv.brandName;
  };

  const getInitials = name => {
    return (name || 'User')
      .split(' ')
      .map(n => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const activeConv = conversations.find(c => c.id === activeConvId);

  const filteredConversations = conversations.filter(c => {
    if (!filterQuery.trim()) return true;
    const name = getCounterpartName(c).toLowerCase();
    const camp = (c.campaignTitle || '').toLowerCase();
    const last = (c.lastMessage || '').toLowerCase();
    const q = filterQuery.toLowerCase();
    return name.includes(q) || camp.includes(q) || last.includes(q);
  });

  return (
    <div className="messages-page-wrapper">
      <header className="messages-header-top">
        <div>
          <div className="discovery-eyebrow">
            <span>Direct Messaging &middot; Sponsorship Inquiries</span>
          </div>
          <h1>Messages &amp; Inquiries</h1>
        </div>
      </header>

      {error && (
        <div className="discovery-alert error" style={{ marginBottom: 16 }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="messages-layout-card card">
        {/* Left Sidebar: Conversations List */}
        <div className="conversations-sidebar">
          <div className="conversations-search-wrap">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={filterQuery}
              onChange={e => setFilterQuery(e.target.value)}
            />
          </div>

          <div className="conversations-scroll-list">
            {loading ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>
                Loading conversations...
              </div>
            ) : conversations.length === 0 && !draftTargetCreator ? (
              <div className="no-conversations-empty">
                <Inbox size={32} />
                <p>No messages yet.</p>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {isBrand
                    ? 'Inquire with creators directly from Creator Discovery or Smart Match.'
                    : 'When brands send inquiries regarding campaigns, they will appear here.'}
                </span>
              </div>
            ) : filteredConversations.length === 0 && !draftTargetCreator ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)' }}>
                No matches found.
              </div>
            ) : (
              <>
                {draftTargetCreator && !activeConvId && (
                  <div className="conversation-item active">
                    <div className="conv-avatar">{getInitials(draftTargetCreator.name)}</div>
                    <div className="conv-text-col">
                      <div className="conv-header-line">
                        <span className="conv-name">{draftTargetCreator.name} (New)</span>
                      </div>
                      {draftTargetCampaign && (
                        <div className="conv-camp-pill">
                          <span>{draftTargetCampaign.title}</span>
                        </div>
                      )}
                      <p className="conv-snippet">Drafting inquiry...</p>
                    </div>
                  </div>
                )}
                {filteredConversations.map(conv => {
                  const name = getCounterpartName(conv);
                  const isActive = conv.id === activeConvId;
                  return (
                    <div
                      key={conv.id}
                      className={`conversation-item ${isActive ? 'active' : ''}`}
                      onClick={() => {
                        setDraftTargetCreator(null);
                        setActiveConvId(conv.id);
                      }}
                    >
                      <div className="conv-avatar">{getInitials(name)}</div>
                      <div className="conv-text-col">
                        <div className="conv-header-line">
                          <span className="conv-name">{name}</span>
                          {conv.updatedAt && (
                            <span className="conv-time">
                              {new Date(conv.updatedAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          )}
                        </div>
                        {conv.campaignTitle && (
                          <div className="conv-camp-pill">
                            <span>{conv.campaignTitle}</span>
                          </div>
                        )}
                        <p className="conv-snippet">
                          {conv.lastMessage || 'No messages yet'}
                        </p>
                      </div>
                      {conv.unreadCount > 0 && (
                        <span className="conv-unread-dot">{conv.unreadCount}</span>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* Right Panel: Chat Thread or Draft Inquiry */}
        <div className="chat-thread-panel">
          {activeConv ? (
            <>
              {/* Thread Header */}
              <div className="chat-thread-header">
                <div className="thread-user-info">
                  <div className="thread-avatar">
                    {getInitials(getCounterpartName(activeConv))}
                  </div>
                  <div>
                    <h3 className="thread-name">{getCounterpartName(activeConv)}</h3>
                    <span className="thread-role-badge">
                      {isBrand ? 'Content Creator' : 'Brand Sponsor'}
                    </span>
                  </div>
                </div>
                {activeConv.campaignTitle && (
                  <div className="thread-campaign-tag">
                    <span>Campaign:</span>
                    <strong>{activeConv.campaignTitle}</strong>
                  </div>
                )}
              </div>

              {/* Messages History */}
              <div className="chat-messages-scroll">
                {messages.length === 0 ? (
                  <div className="empty-messages-placeholder">
                    <p>Start the conversation with {getCounterpartName(activeConv)} below.</p>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isMe = msg.senderId === user.userId;
                    return (
                      <div
                        key={msg.id}
                        className={`message-bubble-row ${isMe ? 'outgoing' : 'incoming'}`}
                      >
                        <div className="message-bubble">
                          <div className="message-sender-name">
                            {isMe ? 'You' : msg.senderName}
                          </div>
                          <div className="message-content-text">{msg.message}</div>
                          <div className="message-timestamp">
                            {msg.createdAt
                              ? new Date(msg.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : ''}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Form */}
              <form className="chat-input-form" onSubmit={handleSendMessage}>
                <input
                  type="text"
                  placeholder={`Reply to ${getCounterpartName(activeConv)}...`}
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  disabled={sending}
                />
                <button
                  type="submit"
                  className="button chat-send-btn"
                  disabled={!newMessage.trim() || sending}
                >
                  <Send size={16} />
                  <span>Send</span>
                </button>
              </form>
            </>
          ) : draftTargetCreator ? (
            <>
              {/* Draft Inquiry View */}
              <div className="chat-thread-header">
                <div className="thread-user-info">
                  <div className="thread-avatar">
                    {getInitials(draftTargetCreator.name)}
                  </div>
                  <div>
                    <h3 className="thread-name">{draftTargetCreator.name}</h3>
                    <span className="thread-role-badge">
                      {draftTargetCreator.category} &middot; {draftTargetCreator.platform}
                    </span>
                  </div>
                </div>
                {draftTargetCampaign && (
                  <div className="thread-campaign-tag">
                    <span>Campaign:</span>
                    <strong>{draftTargetCampaign.title}</strong>
                  </div>
                )}
              </div>

              <div className="chat-messages-scroll">
                <div className="empty-messages-placeholder">
                  <Sparkles size={32} style={{ color: 'var(--primary)', marginBottom: 8 }} />
                  <h4>Start an Inquiry with {draftTargetCreator.name}</h4>
                  <p>Send a message below to inquire about collaboration rates, deliverables, and timeline.</p>
                </div>
              </div>

              <form className="chat-input-form" onSubmit={handleSendMessage}>
                <input
                  type="text"
                  placeholder={`Send direct inquiry to ${draftTargetCreator.name}...`}
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  disabled={sending}
                  autoFocus
                />
                <button
                  type="submit"
                  className="button chat-send-btn"
                  disabled={!newMessage.trim() || sending}
                >
                  {sending ? <Loader2 size={16} className="button-spinner" /> : <Send size={16} />}
                  <span>Send Inquiry</span>
                </button>
              </form>
            </>
          ) : (
            <div className="no-chat-selected card">
              <MessageSquare size={48} className="empty-icon" />
              <h3>Select a Conversation</h3>
              <p>Choose an inquiry from the left to view messages and reply.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
