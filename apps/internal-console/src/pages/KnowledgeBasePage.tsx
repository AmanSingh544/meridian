import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSearchKBQuery, useGetKBCategoriesQuery, useDeleteKBArticleMutation, useGetKBGapsQuery } from '@3sc/api';
import { formatDate } from '@3sc/utils';
import { useDocumentTitle, useDebouncedValue, usePermissions } from '@3sc/hooks';
import { Card, Badge, Button, SearchInput, Skeleton, EmptyState, ConfirmDialog, Tabs, useToast } from '@3sc/ui';
import { Permission } from '@3sc/types';
import type { AIKBGap } from '@3sc/types';

export const KnowledgeBasePage: React.FC = () => {
  useDocumentTitle('Knowledge Base');
  const navigate = useNavigate();
  const permissions = usePermissions();
  const { showToast } = useToast();
  const canManage = permissions.has(Permission.KB_MANAGE);

  const [activeTab, setActiveTab] = useState<'articles' | 'categories' | 'gaps'>('articles');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  const { data: allResults, isLoading: articlesLoading } = useSearchKBQuery(
    { query: debouncedSearch, limit: 50 },
    // Always fetch — empty query returns all articles for the management table
  );
  const { data: categories, isLoading: catsLoading } = useGetKBCategoriesQuery();
  const [deleteArticle, { isLoading: deleting }] = useDeleteKBArticleMutation();
  const { data: kbGaps, isLoading: gapsLoading } = useGetKBGapsQuery(undefined, { skip: !canManage });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteArticle(deleteTarget.id).unwrap();
      showToast({ message: `"${deleteTarget.title}" deleted`, variant: 'success' });
    } catch {
      showToast({ message: 'Failed to delete article', variant: 'error' });
    } finally {
      setDeleteTarget(null);
    }
  };

  const articles = allResults?.map((r) => r.article) ?? [];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
            Knowledge Base
          </h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            Manage articles and categories visible to customers and agents.
          </p>
        </div>
        {canManage && (
          <Button variant="primary" onClick={() => navigate('/knowledge/new')}>
            + New Article
          </Button>
        )}
      </div>

      <Tabs
        tabs={[
          { key: 'articles', label: 'Articles' },
          { key: 'categories', label: 'Categories' },
          ...(canManage ? [{ key: 'gaps', label: 'AI Gaps', badge: kbGaps?.length }] : []),
        ]}
        activeTab={activeTab}
        onChange={(key) => setActiveTab(key as 'articles' | 'categories' | 'gaps')}
      />

      {/* ── Articles tab ── */}
      {activeTab === 'articles' && (
        <div>
          <div style={{ marginBottom: '1rem', maxWidth: '24rem' }}>
            <SearchInput value={search} onChange={setSearch} placeholder="Search articles..." />
          </div>

          {articlesLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {Array.from({ length: 6 }).map((_, i) => <Card key={i}><Skeleton height="2.5rem" /></Card>)}
            </div>
          ) : articles.length === 0 ? (
            <EmptyState
              icon="📄"
              title="No articles found"
              description={debouncedSearch ? 'No articles match your search.' : 'Get started by creating your first article.'}
              action={canManage ? (
                <Button variant="primary" size="sm" onClick={() => navigate('/knowledge/new')}>Create Article</Button>
              ) : undefined}
            />
          ) : (
            <Card style={{ overflow: 'hidden', padding: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-subtle)' }}>
                    {['Title', 'Category', 'Status', 'Views', 'Helpful', 'Updated', ''].map((h) => (
                      <th key={h} style={{ padding: '0.625rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {articles.map((article, idx) => (
                    <tr
                      key={article.id}
                      style={{ borderBottom: idx < articles.length - 1 ? '1px solid var(--color-border)' : 'none' }}
                    >
                      <td style={{ padding: '0.75rem 1rem', maxWidth: '20rem' }}>
                        <span
                          style={{ fontWeight: 500, color: 'var(--color-brand-700)', cursor: 'pointer' }}
                          onClick={() => navigate(`/knowledge/${article.id}/edit`)}
                        >
                          {article.title}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                        {article.category?.name ? (
                          <Badge variant="neutral">{article.category.name}</Badge>
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                        <Badge variant={article.isPublished ? 'success' : 'warning'}>
                          {article.isPublished ? 'Published' : 'Draft'}
                        </Badge>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                        {article.viewCount.toLocaleString()}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                        {article.helpfulCount.toLocaleString()}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', fontSize: '0.8125rem' }}>
                        {formatDate(article.updated_at)}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                        {canManage && (
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/knowledge/${article.id}/edit`)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => setDeleteTarget({ id: article.id, title: article.title })}
                            >
                              Delete
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {/* ── Categories tab ── */}
      {activeTab === 'categories' && (
        <div>
          {catsLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(16rem, 1fr))', gap: '0.75rem' }}>
              {Array.from({ length: 6 }).map((_, i) => <Card key={i}><Skeleton height="4rem" /></Card>)}
            </div>
          ) : categories && categories.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(16rem, 1fr))', gap: '0.75rem' }}>
              {categories.map((cat) => (
                <Card key={cat.id}>
                  <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>{cat.name}</h3>
                  {cat.description && (
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                      {cat.description}
                    </p>
                  )}
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem', display: 'block' }}>
                    {cat.articleCount} article{cat.articleCount !== 1 ? 's' : ''}
                  </span>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState icon="🗂️" title="No categories" description="Categories are created automatically when articles are assigned to them." />
          )}
        </div>
      )}

      {/* ── AI Gaps tab ── */}
      {activeTab === 'gaps' && canManage && (
        <div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700 }}>Knowledge Base Gaps</h2>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                Topics customers ask about frequently that have no KB article. Create articles to reduce ticket volume.
              </p>
            </div>
          </div>

          {gapsLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {Array.from({ length: 4 }).map((_, i) => <Card key={i}><Skeleton height="4rem" /></Card>)}
            </div>
          ) : kbGaps && kbGaps.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {kbGaps.map((gap: AIKBGap) => (
                <Card key={gap.id} style={{ borderLeft: `3px solid ${gap.priority === 'high' ? 'var(--color-danger)' : gap.priority === 'medium' ? 'var(--color-warning)' : 'var(--color-border)'}` }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span style={{
                          fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                          color: gap.priority === 'high' ? 'var(--color-danger)' : gap.priority === 'medium' ? 'var(--color-warning)' : 'var(--color-text-muted)',
                          padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-sm)',
                          background: gap.priority === 'high' ? 'var(--color-danger-light)' : gap.priority === 'medium' ? 'var(--color-warning-light)' : 'var(--color-bg-subtle)',
                        }}>
                          {gap.priority}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                          {gap.ticketCount} tickets
                        </span>
                      </div>
                      <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>{gap.topic}</h3>
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                        {gap.description}
                      </p>
                      <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        Suggested title: <em>"{gap.suggestedTitle}"</em>
                      </div>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => navigate('/knowledge/new', { state: { suggestedTitle: gap.suggestedTitle, topic: gap.topic } })}
                      style={{ flexShrink: 0 }}
                    >
                      + Create Article
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState icon="✅" title="No gaps detected" description="Your knowledge base covers the topics customers are asking about." />
          )}
        </div>
      )}

      {/* Delete confirm dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Article"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
};
