import React, { useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useGetKBArticleQuery, useVoteHelpfulMutation, useSearchKBQuery, useAskKBMutation } from '@3sc/api';
import { useDocumentTitle } from '@3sc/hooks';
import { Card, Badge, Button, Skeleton, ErrorState, AIAnswerCard, MarkdownRenderer } from '@3sc/ui';
import { formatDate } from '@3sc/utils';
import type { AIKBAnswer } from '@3sc/types';

export const KnowledgeBaseArticlePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: article, isLoading, isError } = useGetKBArticleQuery(id ?? '', { skip: !id });
  const [voteHelpful] = useVoteHelpfulMutation();
  const [voted, setVoted] = useState<'yes' | 'no' | null>(null);
  const [askKB] = useAskKBMutation();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<AIKBAnswer | null>(null);
  const [asking, setAsking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch all articles once to resolve related article titles — avoids N+1 individual fetches
  const { data: allResults } = useSearchKBQuery({ query: '', limit: 200 }, { skip: !article || article.relatedArticleIds.length === 0 });
  const articleIndex = React.useMemo(() => {
    const map = new Map<string, string>();
    allResults?.forEach((r) => map.set(r.article.id, r.article.title));
    return map;
  }, [allResults]);

  useDocumentTitle(article ? article.title : 'Knowledge Base');

  const handleAskKB = async () => {
    if (!question.trim() || asking) return;
    setAsking(true);
    setAnswer(null);
    try {
      const result = await askKB({ question: question.trim(), articleId: id }).unwrap();
      setAnswer(result);
    } catch {
      setAnswer({ answer: 'Sorry, something went wrong. Please try again.', confidence: 0, sourceArticleIds: [], followUpQuestions: [], cannotAnswer: true });
    } finally {
      setAsking(false);
    }
  };

  const handleAskKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleAskKB();
  };

  const handleFollowUp = (q: string) => {
    setQuestion(q);
    setAnswer(null);
    inputRef.current?.focus();
  };

  const handleHelpful = async (helpful: boolean) => {
    if (voted || !id) return;
    if (helpful) await voteHelpful(id);
    setVoted(helpful ? 'yes' : 'no');
  };

  if (isLoading) {
    return (
      <div style={{ maxWidth: '52rem' }}>
        <Skeleton height="1rem" style={{ width: '12rem', marginBottom: '1.5rem' }} />
        <Skeleton height="2rem" style={{ marginBottom: '0.75rem' }} />
        <Skeleton height="1rem" style={{ width: '16rem', marginBottom: '2rem' }} />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} height="1rem" style={{ marginBottom: '0.5rem' }} />
        ))}
      </div>
    );
  }

  if (isError || !article) {
    return (
      <ErrorState
        title="Article not found"
        description="This article may have been moved or removed."
        action={<Button variant="primary" onClick={() => navigate('/knowledge')}>Back to Knowledge Base</Button>}
      />
    );
  }

  const formattedDate = formatDate(article.updated_at);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr minmax(0, 16rem)', gap: '2rem', alignItems: 'start' }}>
      {/* ── Main article ── */}
      <div style={{ minWidth: 0 }}>
        {/* Breadcrumb */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '1.5rem', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
          <Link to="/knowledge" style={{ color: 'var(--color-brand-600)', textDecoration: 'none' }}>
            Knowledge Base
          </Link>
          <span>/</span>
          {article.category && (
            <>
              <span>{article.category.name}</span>
              <span>/</span>
            </>
          )}
          <span style={{ color: 'var(--color-text-muted)' }}>{article.title}</span>
        </nav>

        {/* Title */}
        <h1 style={{ margin: '0 0 0.75rem', fontSize: '1.75rem', fontWeight: 700, fontFamily: 'var(--font-display)', lineHeight: 1.25 }}>
          {article.title}
        </h1>

        {/* Meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
          {article.category && (
            <Badge variant="info">{article.category.name}</Badge>
          )}
          {article.author && <span>By {article.author.displayName}</span>}
          <span>Updated {formattedDate}</span>
          <span>{article.viewCount.toLocaleString()} views</span>
        </div>

        {/* Tags */}
        {article.tags.length > 0 && (
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginBottom: '1.75rem' }}>
            {article.tags.map((tag) => (
              <Badge key={tag} variant="neutral">{tag}</Badge>
            ))}
          </div>
        )}

        {/* Excerpt */}
        <p style={{
          margin: '0 0 2rem', padding: '1rem 1.25rem',
          background: 'var(--color-bg-subtle)', borderLeft: '3px solid var(--color-brand-500)',
          borderRadius: 'var(--radius-sm)', fontSize: '0.9375rem', lineHeight: 1.6,
          color: 'var(--color-text-secondary)',
        }}>
          {article.excerpt}
        </p>

        {/* Content */}
        <MarkdownRenderer style={{ fontSize: '0.9375rem', lineHeight: 1.8, color: 'var(--color-text)' }}>
          {article.content}
        </MarkdownRenderer>

        {/* Helpfulness */}
        <div style={{
          marginTop: '3rem', padding: '1.5rem',
          border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)',
          textAlign: 'center',
        }}>
          {voted === null ? (
            <>
              <p style={{ margin: '0 0 1rem', fontWeight: 600, fontSize: '0.9375rem' }}>Was this article helpful?</p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <Button variant="primary" size="sm" onClick={() => handleHelpful(true)}>
                  Yes, it helped
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleHelpful(false)}>
                  Not really
                </Button>
              </div>
            </>
          ) : voted === 'yes' ? (
            <p style={{ margin: 0, color: 'var(--color-success)', fontWeight: 600 }}>
              Glad it helped! {article.helpfulCount + 1} people found this useful.
            </p>
          ) : (
            <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
              Thanks for the feedback. <Link to="/tickets/new" style={{ color: 'var(--color-brand-600)' }}>Create a support ticket</Link> if you need more help.
            </p>
          )}
        </div>

        {/* AI Q&A Widget */}
        <div style={{
          marginTop: '2rem', padding: '1.5rem',
          background: 'var(--color-bg-subtle)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '1.125rem' }}>🤖</span>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--color-brand-600)' }}>Ask AI about this topic</h3>
          </div>
          <p style={{ margin: '0 0 1rem', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
            Our AI can answer specific questions based on our knowledge base.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              ref={inputRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleAskKeyDown}
              placeholder="Ask a question..."
              style={{
                flex: 1,
                padding: '0.625rem 0.875rem',
                border: '1px solid var(--color-border-strong)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                background: 'var(--color-bg)',
                color: 'var(--color-text)',
                fontFamily: 'var(--font-body)',
                outline: 'none',
              }}
            />
            <Button variant="primary" size="sm" onClick={handleAskKB} loading={asking} disabled={!question.trim() || asking}>
              Ask
            </Button>
          </div>

          {asking && (
            <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>
              <div style={{ width: 14, height: 14, border: '2px solid var(--color-border-strong)', borderTopColor: 'var(--color-brand-500)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
              Searching knowledge base...
            </div>
          )}

          {answer && (
            <div style={{ marginTop: '1rem' }}>
              <AIAnswerCard
                answer={answer.answer}
                confidence={answer.confidence}
                cannotAnswer={answer.cannotAnswer}
                label="KB Answer"
              />
              {answer.followUpQuestions.length > 0 && (
                <div style={{ marginTop: '0.75rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.375rem' }}>Follow-up questions:</div>
                  {answer.followUpQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleFollowUp(q)}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '0.375rem 0.625rem', marginBottom: '0.25rem',
                        background: 'var(--color-bg-muted)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                        fontSize: '0.8125rem', color: 'var(--color-brand-600)',
                        fontFamily: 'var(--font-body)',
                      }}
                    >
                      → {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Sidebar ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Button variant="ghost" size="sm" onClick={() => navigate('/knowledge')} style={{ alignSelf: 'flex-start' }}>
          ← Back to Knowledge Base
        </Button>

        {/* Related articles */}
        {article.relatedArticleIds.length > 0 && (
          <Card>
            <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)' }}>
              Related Articles
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {article.relatedArticleIds.map((relId) => {
                const title = articleIndex.get(relId);
                if (!title) return null;
                return (
                  <Link
                    key={relId}
                    to={`/knowledge/${relId}`}
                    style={{ fontSize: '0.8125rem', color: 'var(--color-brand-600)', textDecoration: 'none', lineHeight: 1.4 }}
                  >
                    {title}
                  </Link>
                );
              })}
            </div>
          </Card>
        )}

        {/* Need more help */}
        <Card>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.875rem', fontWeight: 700 }}>Need more help?</h3>
          <p style={{ margin: '0 0 0.75rem', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
            Can't find what you're looking for? Our support team is here to help.
          </p>
          <Button variant="primary" size="sm" onClick={() => navigate('/tickets/new')} style={{ width: '100%' }}>
            Create a Ticket
          </Button>
        </Card>
      </div>
    </div>
  );
};

