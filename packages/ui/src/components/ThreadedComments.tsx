import React, { useState, useRef, useEffect } from 'react';
import type { Comment, User } from '@3sc/types';
import { Avatar } from './Avatar';
import { Badge } from './Badge';
import { formatRelativeTime, formatFileSize, getFileIcon } from '@3sc/utils';

export interface ThreadedCommentsProps {
  comments: Comment[];
  /** Users available to @mention — backend should scope this to org members visible to the current user */
  mentionableUsers?: User[];
  onReply?: (parentId: string, content: string, mentionedUserIds: string[]) => void;
  onAddComment?: (content: string, isInternal: boolean, mentionedUserIds: string[], files: File[]) => void;
  showInternalToggle?: boolean;
  /** Allow file attachments in the comment box */
  allowAttachments?: boolean;
  currentUserId?: string;
}

// ── Mention parsing helpers ──────────────────────────────────────

/** Extract @mention query at the current cursor position */
function getMentionQuery(text: string, cursorPos: number): string | null {
  const before = text.slice(0, cursorPos);
  const match = before.match(/@(\w*)$/);
  return match ? match[1] : null;
}

/** Render comment content with highlighted @Display Name spans */
function renderContent(content: string, mentions: string[], users: User[]) {
  if (!mentions.length || !users.length) return content;

  const mentionedUsers = users.filter((u) => mentions.includes(u.id));
  if (!mentionedUsers.length) return content;

  // Build a regex to match any of the mentioned display names
  const pattern = mentionedUsers
    .map((u) => `@${u.displayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)
    .join('|');
  const regex = new RegExp(`(${pattern})`, 'g');

  const parts = content.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <span
        key={i}
        style={{
          color: 'var(--color-brand-600)', fontWeight: 600,
          background: 'var(--color-brand-50, #eff6ff)',
          borderRadius: '0.25rem', padding: '0 0.125rem',
        }}
      >
        {part}
      </span>
    ) : (
      part
    ),
  );
}

// ── Mention autocomplete textarea ────────────────────────────────

interface MentionTextareaProps {
  value: string;
  onChange: (val: string) => void;
  onMentionsChange: (ids: string[]) => void;
  mentionableUsers: User[];
  placeholder?: string;
  rows?: number;
}

const MentionTextarea: React.FC<MentionTextareaProps> = ({
  value,
  onChange,
  onMentionsChange,
  mentionableUsers,
  placeholder = 'Add a comment... Use @ to mention someone',
  rows = 3,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionedIds, setMentionedIds] = useState<string[]>([]);

  const filteredUsers = mentionQuery !== null
    ? mentionableUsers.filter((u) =>
        u.displayName.toLowerCase().includes(mentionQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(mentionQuery.toLowerCase()),
      ).slice(0, 6)
    : [];

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    onChange(val);
    const query = getMentionQuery(val, e.target.selectionStart ?? val.length);
    setMentionQuery(query);
  };

  const insertMention = (user: User) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart ?? value.length;
    const before = value.slice(0, cursorPos);
    const after = value.slice(cursorPos);

    // Replace the @query with @DisplayName
    const newBefore = before.replace(/@\w*$/, `@${user.displayName} `);
    const newValue = newBefore + after;
    onChange(newValue);
    setMentionQuery(null);

    const newIds = mentionedIds.includes(user.id) ? mentionedIds : [...mentionedIds, user.id];
    setMentionedIds(newIds);
    onMentionsChange(newIds);

    // Restore focus and move cursor to after inserted mention
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = newBefore.length;
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && filteredUsers.length > 0) {
      if (e.key === 'Escape') {
        setMentionQuery(null);
        e.preventDefault();
      }
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (textareaRef.current && !textareaRef.current.closest('[data-mention-container]')?.contains(e.target as Node)) {
        setMentionQuery(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div data-mention-container style={{ position: 'relative' }}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        style={{
          width: '100%', padding: '0.625rem', fontSize: '0.875rem',
          border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
          fontFamily: 'var(--font-body)', resize: 'vertical', outline: 'none',
          boxSizing: 'border-box',
        }}
      />
      {mentionQuery !== null && filteredUsers.length > 0 && (
        <div style={{
          position: 'absolute', bottom: '100%', left: 0,
          background: 'var(--color-bg)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)', boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
          zIndex: 50, minWidth: '220px', maxWidth: '320px',
          overflow: 'hidden', marginBottom: '0.25rem',
        }}>
          {filteredUsers.map((user) => (
            <button
              key={user.id}
              onMouseDown={(e) => { e.preventDefault(); insertMention(user); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.625rem',
                width: '100%', padding: '0.5rem 0.75rem',
                background: 'none', border: 'none', cursor: 'pointer',
                textAlign: 'left', fontSize: '0.8125rem',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-subtle)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            >
              <Avatar name={user.displayName} src={user.avatarUrl} size={24} />
              <div>
                <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{user.displayName}</div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>{user.email}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Comment node ─────────────────────────────────────────────────

const CommentNode: React.FC<{
  comment: Comment;
  replies: Comment[];
  allUsers: User[];
  mentionableUsers: User[];
  onReply?: (parentId: string, content: string, mentionedUserIds: string[]) => void;
  depth?: number;
}> = ({ comment, replies, allUsers, mentionableUsers, onReply, depth = 0 }) => {
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyMentions, setReplyMentions] = useState<string[]>([]);

  const submitReply = () => {
    if (!replyText.trim() || !onReply) return;
    onReply(comment.id, replyText.trim(), replyMentions);
    setReplyText('');
    setReplyMentions([]);
    setReplying(false);
  };

  return (
    <div style={{ marginLeft: depth > 0 ? '2rem' : 0, marginTop: depth > 0 ? '0.75rem' : 0 }}>
      <div style={{
        display: 'flex', gap: '0.75rem',
        padding: '0.875rem',
        background: comment.isInternal ? '#fef3c720' : 'var(--color-bg)',
        border: `1px solid ${comment.isInternal ? '#f59e0b40' : 'var(--color-border)'}`,
        borderRadius: 'var(--radius-md)',
      }}>
        <Avatar name={comment.author?.displayName || 'User'} src={comment.author?.avatarUrl} size={32} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>
              {comment.author?.displayName || 'Unknown'}
            </span>
            {comment.isInternal && (
              <Badge color="#b45309" bgColor="#fef3c7">Internal</Badge>
            )}
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              {formatRelativeTime(comment.created_at)}
            </span>
          </div>
          <div style={{
            marginTop: '0.375rem', fontSize: '0.875rem',
            lineHeight: 1.6, color: 'var(--color-text)',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
            {renderContent(comment.content, comment.mentions, allUsers)}
          </div>
          {comment.attachments.length > 0 && (
            <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
              {comment.attachments.map((a) => (
                <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer" style={{
                  fontSize: '0.75rem', color: 'var(--color-brand-600)',
                  textDecoration: 'none', padding: '0.125rem 0.5rem',
                  background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-sm)',
                }}>📎 {a.fileName}</a>
              ))}
            </div>
          )}
          {onReply && (
            <button
              onClick={() => setReplying(!replying)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-text-muted)', fontSize: '0.75rem',
                marginTop: '0.375rem', padding: 0,
              }}
            >
              Reply
            </button>
          )}
          {replying && (
            <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <MentionTextarea
                value={replyText}
                onChange={setReplyText}
                onMentionsChange={setReplyMentions}
                mentionableUsers={mentionableUsers}
                placeholder="Write a reply... Use @ to mention"
                rows={2}
              />
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => { setReplying(false); setReplyText(''); setReplyMentions([]); }}
                  style={{
                    padding: '0.25rem 0.625rem', fontSize: '0.8125rem',
                    background: 'none', border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                  }}
                >Cancel</button>
                <button
                  onClick={submitReply}
                  disabled={!replyText.trim()}
                  style={{
                    padding: '0.25rem 0.75rem', fontSize: '0.8125rem',
                    background: 'var(--color-brand-600)', color: '#fff',
                    border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                    opacity: replyText.trim() ? 1 : 0.5,
                  }}
                >Send</button>
              </div>
            </div>
          )}
        </div>
      </div>
      {replies.map((r) => (
        <CommentNode
          key={r.id}
          comment={r}
          replies={[]}
          allUsers={allUsers}
          mentionableUsers={mentionableUsers}
          onReply={onReply}
          depth={depth + 1}
        />
      ))}
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────

export const ThreadedComments: React.FC<ThreadedCommentsProps> = ({
  comments,
  mentionableUsers = [],
  onReply,
  onAddComment,
  showInternalToggle = false,
  allowAttachments = true,
}) => {
  const [newComment, setNewComment] = useState('');
  const [newMentions, setNewMentions] = useState<string[]>([]);
  const [isInternal, setIsInternal] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Collect all authors for mention highlighting in existing comments
  const allUsers: User[] = [
    ...mentionableUsers,
    ...comments
      .map((c) => c.author)
      .filter((u): u is User => !!u),
  ].filter((u, i, arr) => arr.findIndex((x) => x.id === u.id) === i);

  const rootComments = comments.filter((c) => !c.parentId);
  const getReplies = (parentId: string) => comments.filter((c) => c.parentId === parentId);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const incoming = Array.from(e.target.files);
    setAttachedFiles((prev) => {
      const combined = [...prev, ...incoming];
      // deduplicate by name+size
      return combined.filter((f, i, arr) =>
        arr.findIndex((x) => x.name === f.name && x.size === f.size) === i
      ).slice(0, 5); // max 5 attachments
    });
    // Reset the input so the same file can be re-selected
    e.target.value = '';
  };

  const removeFile = (idx: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const submitComment = () => {
    if (!newComment.trim() || !onAddComment) return;
    onAddComment(newComment.trim(), isInternal, newMentions, attachedFiles);
    setNewComment('');
    setNewMentions([]);
    setIsInternal(false);
    setAttachedFiles([]);
  };

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {rootComments.map((c) => (
          <CommentNode
            key={c.id}
            comment={c}
            replies={getReplies(c.id)}
            allUsers={allUsers}
            mentionableUsers={mentionableUsers}
            onReply={onReply}
          />
        ))}
      </div>
      {onAddComment && (
        <div style={{ marginTop: '1rem' }}>
          <MentionTextarea
            value={newComment}
            onChange={setNewComment}
            onMentionsChange={setNewMentions}
            mentionableUsers={mentionableUsers}
          />

          {/* Attached files preview */}
          {attachedFiles.length > 0 && (
            <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {attachedFiles.map((f, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.25rem 0.625rem',
                  background: 'var(--color-bg-subtle)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8125rem',
                }}>
                  <span>{getFileIcon(f.type)}</span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', flexShrink: 0 }}>{formatFileSize(f.size)}</span>
                  <button
                    onClick={() => removeFile(i)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 0, lineHeight: 1 }}
                  >✕</button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', gap: '0.5rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {showInternalToggle && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />
                  Internal note
                </label>
              )}
              {allowAttachments && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach files"
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--color-text-muted)', fontSize: '1rem',
                      padding: '0.125rem 0.25rem',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex', alignItems: 'center', gap: '0.25rem',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-subtle)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                  >
                    <span>📎</span>
                    {attachedFiles.length > 0 && (
                      <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{attachedFiles.length}</span>
                    )}
                  </button>
                </>
              )}
            </div>
            <button
              onClick={submitComment}
              disabled={!newComment.trim()}
              style={{
                padding: '0.5rem 1rem', fontSize: '0.875rem',
                background: 'var(--color-brand-600)', color: '#fff',
                border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                opacity: newComment.trim() ? 1 : 0.5,
              }}
            >Add Comment</button>
          </div>
        </div>
      )}
    </div>
  );
};
