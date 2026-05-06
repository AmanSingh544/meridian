import React, { useState, useRef, useEffect } from 'react';
import type { Comment, User } from '@3sc/types';
import { Avatar } from './Avatar';
import { Badge } from './Badge';
import { formatRelativeTime, formatFileSize, getFileIcon, downloadAttachment, fetchAttachmentPreviewUrl, isPreviewableAttachment } from '@3sc/utils';

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

// ── Mention helpers ──────────────────────────────────────────────

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
  return content.split(regex).map((part, i) =>
    regex.test(part) ? (
      <span key={i} style={{ color: 'var(--color-brand-600)', fontWeight: 600, background: 'var(--color-brand-50,#eff6ff)', borderRadius: '0.25rem', padding: '0 0.125rem' }}>
        {part}
      </span>
    ) : part
  );
}

// ── Mention textarea ─────────────────────────────────────────────

export interface MentionTextareaProps {
  value: string;
  onChange: (val: string) => void;
  onMentionsChange: (ids: string[]) => void;
  mentionableUsers: User[];
  placeholder?: string;
  rows?: number;
}

export const MentionTextarea: React.FC<MentionTextareaProps> = ({
  value, onChange, onMentionsChange, mentionableUsers,
  placeholder = 'Add a comment… Use @ to mention someone', rows = 3,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionedIds, setMentionedIds] = useState<string[]>([]);

  const filteredUsers = mentionQuery !== null
    ? mentionableUsers.filter((u) =>
        u.displayName.toLowerCase().includes(mentionQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(mentionQuery.toLowerCase())
      ).slice(0, 6)
    : [];

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    onChange(val);
    setMentionQuery(getMentionQuery(val, e.target.selectionStart ?? val.length));
  };

  const insertMention = (user: User) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const cursorPos = textarea.selectionStart ?? value.length;
    const before = value.slice(0, cursorPos).replace(/@\w*$/, `@${user.displayName} `);
    const newValue = before + value.slice(cursorPos);
    onChange(newValue);
    setMentionQuery(null);
    const newIds = mentionedIds.includes(user.id) ? mentionedIds : [...mentionedIds, user.id];
    setMentionedIds(newIds);
    onMentionsChange(newIds);
    setTimeout(() => { textarea.focus(); textarea.selectionStart = textarea.selectionEnd = before.length; }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && filteredUsers.length > 0 && e.key === 'Escape') {
      setMentionQuery(null);
      e.preventDefault();
    }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!textareaRef.current?.closest('[data-mention-container]')?.contains(e.target as Node)) {
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
          width: '100%', padding: '0.625rem 0.75rem', fontSize: '0.875rem',
          border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
          fontFamily: 'var(--font-body)', resize: 'vertical', outline: 'none',
          boxSizing: 'border-box', lineHeight: 1.6, transition: 'border-color 0.15s',
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-brand-500)')}
        onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
      />
      {mentionQuery !== null && filteredUsers.length > 0 && (
        <div style={{
          position: 'absolute', bottom: '100%', left: 0,
          background: 'var(--color-bg)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          zIndex: 50, minWidth: '220px', maxWidth: '320px', overflow: 'hidden', marginBottom: '0.25rem',
        }}>
          {filteredUsers.map((user) => (
            <button
              key={user.id}
              onMouseDown={(e) => { e.preventDefault(); insertMention(user); }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', width: '100%', padding: '0.5rem 0.75rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '0.8125rem' }}
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

// ── Attachment preview modal ─────────────────────────────────────

export const AttachmentPreviewModal: React.FC<{
  attachmentId: string;
  mimeType: string;
  fileName: string;
  onClose: () => void;
}> = ({ attachmentId, mimeType, fileName, onClose }) => {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let revoked = false;
    setLoading(true);
    setError(false);
    fetchAttachmentPreviewUrl(attachmentId)
      .then((url) => { if (!revoked) { setObjectUrl(url); setLoading(false); } })
      .catch(() => { if (!revoked) { setError(true); setLoading(false); } });
    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachmentId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.82)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--color-bg)',
          borderRadius: 'var(--radius-xl, 1rem)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
          maxWidth: '60%', maxHeight: '60%',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          minWidth: '320px',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.875rem 1.25rem',
          borderBottom: '1px solid var(--color-border)',
          gap: '1rem',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', minWidth: 0 }}>
            <span style={{ fontSize: '1.125rem', flexShrink: 0 }}>{getFileIcon(mimeType)}</span>
            <span style={{ fontWeight: 600, fontSize: '0.9375rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {fileName}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            <button
              onClick={() => downloadAttachment(attachmentId, fileName)}
              title="Download"
              style={{
                display: 'flex', alignItems: 'center', gap: '0.375rem',
                padding: '0.375rem 0.75rem', fontSize: '0.8125rem', fontWeight: 500,
                background: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--color-text)',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-border)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-bg-subtle)')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download
            </button>
            <button
              onClick={onClose}
              title="Close (Esc)"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '32px', height: '32px',
                background: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: '1rem', color: 'var(--color-text-muted)',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-border)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-bg-subtle)')}
            >✕</button>
          </div>
        </div>

        {/* Body */}
        <div style={{
          flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1.25rem', minHeight: '200px',
          background: 'var(--color-bg-subtle, #f9fafb)',
        }}>
          {loading && (
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '32px', height: '32px', border: '3px solid var(--color-border)', borderTopColor: 'var(--color-brand-500)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              Loading preview…
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          )}
          {error && !loading && (
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</div>
              Could not load preview
            </div>
          )}
          {!loading && !error && objectUrl && (
            mimeType.startsWith('image/') ? (
              <img
                src={objectUrl}
                alt={fileName}
                style={{ maxWidth: '100%', maxHeight: '75vh', borderRadius: 'var(--radius-md)', objectFit: 'contain', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}
              />
            ) : (
              <iframe
                src={objectUrl}
                title={fileName}
                style={{ width: '80vw', height: '72vh', border: 'none', borderRadius: 'var(--radius-md)' }}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
};

// ── Attachment chip (read-only) ──────────────────────────────────

export const AttachmentChip: React.FC<{
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  onPreview: () => void;
}> = ({ id, fileName, mimeType, fileSize, onPreview }) => {
  const [hovered, setHovered] = useState(false);
  const previewable = isPreviewableAttachment(mimeType);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
        padding: '0.375rem 0.625rem',
        background: hovered ? 'var(--color-bg-subtle)' : 'var(--color-bg)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        transition: 'background 0.15s, border-color 0.15s',
        borderColor: hovered ? 'var(--color-brand-300, #93c5fd)' : 'var(--color-border)',
        cursor: 'default', maxWidth: '240px',
      }}
    >
      <span style={{ fontSize: '1rem', flexShrink: 0 }}>{getFileIcon(mimeType)}</span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {fileName}
        </div>
        {fileSize > 0 && (
          <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>{formatFileSize(fileSize)}</div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
        {previewable && (
          <button
            onClick={onPreview}
            title="Preview"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-brand-500)', padding: '0.125rem', borderRadius: '0.25rem', display: 'flex', lineHeight: 1 }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-brand-50,#eff6ff)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        )}
        <button
          onClick={() => downloadAttachment(id, fileName)}
          title="Download"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '0.125rem', borderRadius: '0.25rem', display: 'flex', lineHeight: 1 }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-brand-500)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </button>
      </div>
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
  const [previewAttachment, setPreviewAttachment] = useState<{ id: string; fileName: string; mimeType: string } | null>(null);

  const submitReply = () => {
    if (!replyText.trim() || !onReply) return;
    onReply(comment.id, replyText.trim(), replyMentions);
    setReplyText(''); setReplyMentions([]); setReplying(false);
  };

  return (
    <div style={{ marginLeft: depth > 0 ? '2rem' : 0, marginTop: depth > 0 ? '0.625rem' : 0 }}>
      <div style={{
        display: 'flex', gap: '0.75rem',
        padding: '0.875rem 1rem',
        background: comment.isInternal ? '#fffbeb' : 'var(--color-bg)',
        border: `1px solid ${comment.isInternal ? '#fde68a' : 'var(--color-border)'}`,
        borderRadius: 'var(--radius-lg, 0.75rem)',
        transition: 'box-shadow 0.15s',
      }}>
        <div style={{ flexShrink: 0 }}>
          <Avatar name={comment.author?.displayName || 'User'} src={comment.author?.avatarUrl} size={32} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text)' }}>
              {comment.author?.displayName || 'Unknown'}
            </span>
            {comment.isInternal && <Badge color="#92400e" bgColor="#fef3c7">Internal note</Badge>}
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              {formatRelativeTime(comment.created_at)}
            </span>
          </div>

          <div style={{ marginTop: '0.375rem', fontSize: '0.875rem', lineHeight: 1.65, color: 'var(--color-text)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {renderContent(comment.content, comment.mentions, allUsers)}
          </div>

          {comment.attachments.length > 0 && (
            <div style={{ marginTop: '0.625rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {comment.attachments.map((a) => (
                <AttachmentChip
                  key={a.id}
                  id={a.id}
                  fileName={a.fileName}
                  mimeType={a.mimeType}
                  fileSize={a.fileSize}
                  onPreview={() => setPreviewAttachment({ id: a.id, fileName: a.fileName, mimeType: a.mimeType })}
                />
              ))}
            </div>
          )}

          {previewAttachment && (
            <AttachmentPreviewModal
              attachmentId={previewAttachment.id}
              mimeType={previewAttachment.mimeType}
              fileName={previewAttachment.fileName}
              onClose={() => setPreviewAttachment(null)}
            />
          )}

          {onReply && (
            <button
              onClick={() => setReplying(!replying)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: '0.5rem', padding: 0, fontWeight: 500 }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-brand-600)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
            >
              ↩ Reply
            </button>
          )}

          {replying && (
            <div style={{ marginTop: '0.625rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <MentionTextarea
                value={replyText}
                onChange={setReplyText}
                onMentionsChange={setReplyMentions}
                mentionableUsers={mentionableUsers}
                placeholder="Write a reply… Use @ to mention"
                rows={2}
              />
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => { setReplying(false); setReplyText(''); setReplyMentions([]); }}
                  style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem', background: 'none', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
                >Cancel</button>
                <button
                  onClick={submitReply}
                  disabled={!replyText.trim()}
                  style={{ padding: '0.375rem 0.875rem', fontSize: '0.8125rem', background: 'var(--color-brand-600)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', opacity: replyText.trim() ? 1 : 0.5 }}
                >Send</button>
              </div>
            </div>
          )}
        </div>
      </div>
      {replies.map((r) => (
        <CommentNode key={r.id} comment={r} replies={[]} allUsers={allUsers} mentionableUsers={mentionableUsers} onReply={onReply} depth={depth + 1} />
      ))}
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────

export const ThreadedComments: React.FC<ThreadedCommentsProps> = ({
  comments, mentionableUsers = [], onReply, onAddComment,
  showInternalToggle = false, allowAttachments = true,
}) => {
  const [newComment, setNewComment] = useState('');
  const [newMentions, setNewMentions] = useState<string[]>([]);
  const [isInternal, setIsInternal] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allUsers: User[] = [
    ...mentionableUsers,
    ...comments.map((c) => c.author).filter((u): u is User => !!u),
  ].filter((u, i, arr) => arr.findIndex((x) => x.id === u.id) === i);

  const rootComments = comments.filter((c) => !c.parentId);
  const getReplies = (parentId: string) => comments.filter((c) => c.parentId === parentId);

  const addFiles = (incoming: File[]) => {
    setAttachedFiles((prev) => {
      const combined = [...prev, ...incoming];
      return combined.filter((f, i, arr) =>
        arr.findIndex((x) => x.name === f.name && x.size === f.size) === i
      ).slice(0, 5);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files));
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) addFiles(Array.from(e.dataTransfer.files));
  };

  const removeFile = (idx: number) => setAttachedFiles((prev) => prev.filter((_, i) => i !== idx));

  const submitComment = () => {
    if (!newComment.trim() || !onAddComment) return;
    onAddComment(newComment.trim(), isInternal, newMentions, attachedFiles);
    setNewComment(''); setNewMentions([]); setIsInternal(false); setAttachedFiles([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submitComment();
  };

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {rootComments.map((c) => (
          <CommentNode key={c.id} comment={c} replies={getReplies(c.id)} allUsers={allUsers} mentionableUsers={mentionableUsers} onReply={onReply} />
        ))}
      </div>

      {onAddComment && (
        <div
          style={{
            marginTop: rootComments.length > 0 ? '1.25rem' : 0,
            border: `1px solid ${dragOver ? 'var(--color-brand-400)' : isInternal ? '#fde68a' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-lg, 0.75rem)',
            background: isInternal ? '#fffbeb' : 'var(--color-bg)',
            overflow: 'hidden',
            transition: 'border-color 0.15s, background 0.15s',
            boxShadow: dragOver ? '0 0 0 3px var(--color-brand-100)' : 'none',
          }}
          onDragOver={(e) => { e.preventDefault(); if (allowAttachments) setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={allowAttachments ? handleDrop : undefined}
        >
          {/* Textarea area */}
          <div style={{ padding: '0.75rem 0.875rem 0' }} onKeyDown={handleKeyDown}>
            <MentionTextarea
              value={newComment}
              onChange={setNewComment}
              onMentionsChange={setNewMentions}
              mentionableUsers={mentionableUsers}
            />
          </div>

          {/* Attached files */}
          {attachedFiles.length > 0 && (
            <div style={{ padding: '0.5rem 0.875rem 0', display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
              {attachedFiles.map((f, i) => (
                <div key={i} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                  padding: '0.25rem 0.5rem 0.25rem 0.625rem',
                  background: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)', fontSize: '0.8125rem',
                }}>
                  <span style={{ fontSize: '0.875rem' }}>{getFileIcon(f.type)}</span>
                  <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-text)' }}>{f.name}</span>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.6875rem', flexShrink: 0 }}>{formatFileSize(f.size)}</span>
                  <button
                    onClick={() => removeFile(i)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '0 0.125rem', lineHeight: 1, display: 'flex', alignItems: 'center' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-danger, #ef4444)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Toolbar */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.5rem 0.875rem 0.75rem',
            gap: '0.5rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {allowAttachments && (
                <>
                  <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={handleFileChange} />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach files (or drag & drop)"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.375rem',
                      padding: '0.375rem 0.625rem', fontSize: '0.8125rem', fontWeight: 500,
                      background: 'none', border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--color-text-muted)',
                      transition: 'background 0.15s, border-color 0.15s, color 0.15s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-brand-400)'; e.currentTarget.style.color = 'var(--color-brand-600)'; e.currentTarget.style.background = 'var(--color-brand-50,#eff6ff)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.background = 'none'; }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                    </svg>
                    Attach
                    {attachedFiles.length > 0 && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: '18px', height: '18px', borderRadius: '50%',
                        background: 'var(--color-brand-600)', color: '#fff', fontSize: '0.6875rem', fontWeight: 700,
                      }}>
                        {attachedFiles.length}
                      </span>
                    )}
                  </button>
                </>
              )}
              {showInternalToggle && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', cursor: 'pointer', userSelect: 'none', color: isInternal ? '#92400e' : 'var(--color-text-muted)' }}>
                  <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} style={{ accentColor: '#f59e0b' }} />
                  Internal note
                </label>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>⌘↵</span>
              <button
                onClick={submitComment}
                disabled={!newComment.trim()}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.375rem',
                  padding: '0.5rem 1.125rem', fontSize: '0.875rem', fontWeight: 600,
                  background: newComment.trim() ? 'var(--color-brand-600)' : 'var(--color-bg-subtle)',
                  color: newComment.trim() ? '#fff' : 'var(--color-text-muted)',
                  border: `1px solid ${newComment.trim() ? 'var(--color-brand-600)' : 'var(--color-border)'}`,
                  borderRadius: 'var(--radius-md)', cursor: newComment.trim() ? 'pointer' : 'default',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                Add Comment
              </button>
            </div>
          </div>

          {dragOver && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(99,102,241,0.06)', borderRadius: 'inherit', pointerEvents: 'none',
              fontSize: '0.875rem', color: 'var(--color-brand-600)', fontWeight: 500,
            }}>
              Drop files to attach
            </div>
          )}
        </div>
      )}
    </div>
  );
};
