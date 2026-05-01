import React, { useRef, useEffect, useState } from 'react';
import { AIChatMessage } from './AIChatMessage';
import { AIChatInput } from './AIChatInput';

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: unknown;
  toolCallId?: string;
}

export interface ConversationItem {
  id: string;
  title?: string;
  updated_at: string;
}

export interface AIChatPanelProps {
  open: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSend: (message: string) => void;
  onConfirmDraft?: (tool: string, payload: Record<string, unknown>) => void;
  onCancelDraft?: () => void;
  isLoading?: boolean;
  quickActions?: string[];
  title?: string;
  indicator?: React.ReactNode;
  // Conversation management
  conversations?: ConversationItem[];
  activeConversationId?: string | null;
  onSelectConversation?: (id: string) => void;
  onNewConversation?: () => void;
  onDeleteConversation?: (id: string) => void;
  onRenameConversation?: (id: string, title: string) => void;
}

export const AIChatPanel: React.FC<AIChatPanelProps> = ({
  open,
  onClose,
  messages,
  onSend,
  onConfirmDraft,
  onCancelDraft,
  isLoading = false,
  quickActions = [],
  title = '🤖 3SC Copilot',
  indicator,
  conversations = [],
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleStartRename = (conv: ConversationItem) => {
    setEditingId(conv.id);
    setEditTitle(conv.title || 'Untitled');
  };

  const handleSaveRename = (id: string) => {
    if (editTitle.trim()) {
      onRenameConversation?.(id, editTitle.trim());
    }
    setEditingId(null);
    setEditTitle('');
  };

  const handleKeyDownRename = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') handleSaveRename(id);
    if (e.key === 'Escape') setEditingId(null);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (!open) return null;

  const hasConversations = conversations.length > 0 || onNewConversation;

  return (
    <div style={{
      position: 'fixed',
      bottom: '5rem',
      right: '1rem',
      width: hasConversations && showSidebar ? '42rem' : '28rem',
      maxWidth: 'calc(100vw - 2rem)',
      height: '32rem',
      maxHeight: 'calc(100vh - 7rem)',
      display: 'flex',
      background: 'var(--color-bg-elevated)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-xl)',
      boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
      zIndex: 9999,
      overflow: 'hidden',
      transition: 'width 0.2s ease',
    }}>
      {/* Sidebar */}
      {hasConversations && showSidebar && (
        <div style={{
          width: '14rem',
          borderRight: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--color-bg-muted)',
        }}>
          <div style={{
            padding: '0.75rem',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            gap: '0.5rem',
          }}>
            <button
              onClick={onNewConversation}
              style={{
                flex: 1,
                padding: '0.375rem 0.5rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg-elevated)',
                color: 'var(--color-text)',
                fontSize: '0.8125rem',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              + New Chat
            </button>
          </div>
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '0.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
          }}>
            {conversations.length === 0 && (
              <div style={{
                textAlign: 'center',
                color: 'var(--color-text-muted)',
                fontSize: '0.75rem',
                marginTop: '1rem',
              }}>
                No conversations yet
              </div>
            )}
            {conversations.map((conv) => {
              const isActive = conv.id === activeConversationId;
              return (
                <div
                  key={conv.id}
                  onClick={() => onSelectConversation?.(conv.id)}
                  style={{
                    padding: '0.5rem 0.625rem',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    background: isActive ? 'var(--color-bg-elevated)' : 'transparent',
                    border: isActive ? '1px solid var(--color-border)' : '1px solid transparent',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.125rem',
                    position: 'relative',
                  }}
                  className="conv-item"
                >
                  {editingId === conv.id ? (
                    <input
                      autoFocus
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onBlur={() => handleSaveRename(conv.id)}
                      onKeyDown={(e) => handleKeyDownRename(e, conv.id)}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        fontSize: '0.8125rem',
                        background: 'var(--color-bg-elevated)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.125rem 0.25rem',
                        color: 'var(--color-text)',
                        width: '100%',
                      }}
                    />
                  ) : (
                    <>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        minWidth: 0,
                      }}>
                        <span style={{
                          fontSize: '0.8125rem',
                          fontWeight: isActive ? 600 : 400,
                          color: 'var(--color-text)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          flex: 1,
                          minWidth: 0,
                          lineHeight: 1.4,
                        }}>
                          {conv.title || 'Untitled'}
                        </span>
                        <div
                          className="conv-actions"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.125rem',
                            flexShrink: 0,
                            marginLeft: '0.125rem',
                          }}
                        >
                          <button
                            onClick={(e) => { e.stopPropagation(); handleStartRename(conv); }}
                            className="conv-action-btn"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'var(--color-text-muted)',
                              width: '1.5rem',
                              height: '1.5rem',
                              padding: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: 'var(--radius-sm)',
                              transition: 'color 0.15s ease, background 0.15s ease',
                              flexShrink: 0,
                            }}
                            title="Rename"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); onDeleteConversation?.(conv.id); }}
                            className="conv-action-btn delete"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'var(--color-text-muted)',
                              width: '1.5rem',
                              height: '1.5rem',
                              padding: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: 'var(--radius-sm)',
                              transition: 'color 0.15s ease, background 0.15s ease',
                              flexShrink: 0,
                            }}
                            title="Delete"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              <line x1="10" y1="11" x2="10" y2="17" />
                              <line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <span style={{
                        fontSize: '0.6875rem',
                        color: 'var(--color-text-muted)',
                        lineHeight: 1.3,
                      }}>
                        {formatDate(conv.updated_at)}
                      </span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1rem',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-bg-muted)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {hasConversations && (
              <button
                onClick={() => setShowSidebar((s) => !s)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  color: 'var(--color-text-muted)',
                  fontSize: '1rem',
                  lineHeight: 1,
                }}
                title="Conversations"
              >
                ☰
              </button>
            )}
            <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{title}</span>
          </div>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            {hasConversations && (
              <button
                onClick={onNewConversation}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  color: 'var(--color-text-muted)',
                  fontSize: '1rem',
                  lineHeight: 1,
                }}
                title="New chat"
              >
                +
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '0.25rem',
                color: 'var(--color-text-muted)',
                fontSize: '1rem',
                lineHeight: 1,
              }}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0.75rem 1rem',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {messages.length === 0 && (
            <div style={{
              textAlign: 'center',
              color: 'var(--color-text-muted)',
              fontSize: '0.875rem',
              marginTop: '2rem',
            }}>
              <p>Hello! I can help you with tickets, projects, and team workflows.</p>
              {quickActions.length > 0 && (
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  justifyContent: 'center',
                  marginTop: '1rem',
                }}>
                  {quickActions.map((action, i) => (
                    <button
                      key={i}
                      onClick={() => onSend(action)}
                      style={{
                        padding: '0.375rem 0.75rem',
                        borderRadius: 'var(--radius-full)',
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-bg-muted)',
                        color: 'var(--color-text)',
                        fontSize: '0.8125rem',
                        cursor: 'pointer',
                      }}
                    >
                      {action}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {messages.map((msg, i) => (
            <AIChatMessage
              key={i}
              role={msg.role}
              content={msg.content}
              toolCalls={msg.toolCalls}
              toolCallId={msg.toolCallId}
              onConfirmDraft={onConfirmDraft}
              onCancelDraft={onCancelDraft}
            />
          ))}
          {indicator}
          {isLoading && !indicator && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              margin: '0.5rem 0',
              fontSize: '0.8125rem',
              color: 'var(--color-text-muted)',
            }}>
              <span style={{
                width: '1rem',
                height: '1rem',
                border: '2px solid var(--color-border)',
                borderTopColor: 'var(--color-brand-500)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
              <span>Thinking...</span>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <AIChatInput onSend={onSend} disabled={isLoading} />
      </div>

      {/* CSS for hover actions on conversation items */}
      <style>{`
        .conv-actions {
          opacity: 0;
          transition: opacity 0.15s ease;
        }
        .conv-item:hover .conv-actions {
          opacity: 1;
        }
        .conv-action-btn:hover {
          color: var(--color-text) !important;
          background: var(--color-bg-muted) !important;
        }
        .conv-action-btn.delete:hover {
          color: #ef4444 !important;
        }
      `}</style>
    </div>
  );
};
