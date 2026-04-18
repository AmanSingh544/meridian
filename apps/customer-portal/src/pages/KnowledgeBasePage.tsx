import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSearchKBQuery, useGetKBCategoriesQuery } from '@3sc/api';
import { useDocumentTitle, useDebouncedValue } from '@3sc/hooks';
import { Card, SearchInput, EmptyState, Skeleton, Badge, Button } from '@3sc/ui';
import { truncate } from '@3sc/utils';

export const KnowledgeBasePage: React.FC = () => {
  useDocumentTitle('Knowledge Base');
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 400);

  const { data: categories } = useGetKBCategoriesQuery();
  const { data: results, isLoading, isFetching } = useSearchKBQuery(
    { query: debouncedSearch, limit: 10 },
    { skip: debouncedSearch.length < 2 },
  );

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
          Knowledge Base
        </h1>
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
          Find answers to common questions
        </p>
      </div>

      <div style={{ maxWidth: '36rem', marginBottom: '1.5rem' }}>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search articles, guides, and FAQs..."
        />
      </div>

      {debouncedSearch.length >= 2 ? (
        <div>
          {isFetching ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}><Skeleton height="3rem" /></Card>
              ))}
            </div>
          ) : results && results.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {results.map((r) => (
                <Card
                  key={r.article.id}
                  hover
                  onClick={() => navigate(`/knowledge/${r.article.id}`)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--color-brand-700)' }}>
                        {r.article.title}
                      </h3>
                      <p style={{
                        margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'var(--color-text-secondary)',
                        lineHeight: 1.5,
                      }}>
                        {truncate(r.article.excerpt, 150)}
                      </p>
                      {r.highlights.length > 0 && (
                        <div style={{ marginTop: '0.375rem', display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                          {r.article.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag}>{tag}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <span style={{
                      fontSize: '0.6875rem', fontWeight: 600,
                      color: r.score > 0.8 ? 'var(--color-success)' : 'var(--color-text-muted)',
                      whiteSpace: 'nowrap',
                      marginLeft: '1rem',
                    }}>
                      {Math.round(r.score * 100)}% match
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              icon="🔍"
              title="No articles found"
              description="We couldn't find any matching articles. Try different keywords or create a support ticket."
              action={
                <Button variant="primary" size="sm" onClick={() => navigate('/tickets/new')}>
                  Create Ticket
                </Button>
              }
            />
          )}
        </div>
      ) : (
        /* Categories grid */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(14rem, 1fr))', gap: '1rem' }}>
          {categories?.map((cat) => (
            <Card key={cat.id} hover onClick={() => setSearch(cat.name)}>
              <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>{cat.name}</h3>
              {cat.description && (
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                  {cat.description}
                </p>
              )}
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.375rem', display: 'block' }}>
                {cat.articleCount} articles
              </span>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
