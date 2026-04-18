import React, { useState } from 'react';
import type { Comment } from '@3sc/types';
import { Avatar } from './Avatar';
import { Badge } from './Badge';
import { formatRelativeTime } from '@3sc/utils';

export interface ThreadedCommentsProps {
  comments: Comment[];
  onReply?: (parentId: string, content: string) => void;
  onAddComment?: (content: string, isInternal?: boolean) => void;
  showInternalToggle?: boolean;
  currentUserId?: string;
}

const CommentNode: React.FC<{
  comment: Comment;
  replies: Comment[];
  onReply?: (parentId: string, content: string) => void;
  depth?: number;
}> = ({ comment, replies, onReply, depth = 0 }) => {
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState('');

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
              {formatRelativeTime(comment.createdAt)}
            </span>
          </div>
          <div style={{
            marginTop: '0.375rem', fontSize: '0.875rem',
            lineHeight: 1.6, color: 'var(--color-text)',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
            {comment.content}
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
            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply..."
                style={{
                  flex: 1, padding: '0.375rem 0.625rem', fontSize: '0.8125rem',
                  border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
                  fontFamily: 'var(--font-body)', outline: 'none',
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && replyText.trim()) {
                    onReply(comment.id, replyText.trim());
                    setReplyText('');
                    setReplying(false);
                  }
                }}
              />
              <button
                onClick={() => {
                  if (replyText.trim()) {
                    onReply(comment.id, replyText.trim());
                    setReplyText('');
                    setReplying(false);
                  }
                }}
                style={{
                  padding: '0.375rem 0.75rem', fontSize: '0.8125rem',
                  background: 'var(--color-brand-600)', color: '#fff',
                  border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                }}
              >Send</button>
            </div>
          )}
        </div>
      </div>
      {replies.map((r) => (
        <CommentNode key={r.id} comment={r} replies={[]} onReply={onReply} depth={depth + 1} />
      ))}
    </div>
  );
};

export const ThreadedComments: React.FC<ThreadedCommentsProps> = ({
  comments,
  onReply,
  onAddComment,
  showInternalToggle = false,
}) => {
  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const rootComments = comments.filter((c) => !c.parentId);

  const getReplies = (parentId: string) => comments.filter((c) => c.parentId === parentId);

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {rootComments.map((c) => (
          <CommentNode key={c.id} comment={c} replies={getReplies(c.id)} onReply={onReply} />
        ))}
      </div>
      {onAddComment && (
        <div style={{ marginTop: '1rem' }}>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            rows={3}
            style={{
              width: '100%', padding: '0.625rem', fontSize: '0.875rem',
              border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-body)', resize: 'vertical', outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
            {showInternalToggle && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />
                Internal note
              </label>
            )}
            <button
              onClick={() => {
                if (newComment.trim()) {
                  onAddComment(newComment.trim(), isInternal);
                  setNewComment('');
                }
              }}
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
