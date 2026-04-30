import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAiSemanticSearchQuery } from '@3sc/api';
import { useDocumentTitle, useDebouncedValue, usePermissions } from '@3sc/hooks';
import { Card, SearchInput, EmptyState, Skeleton, Badge, ConfidenceBar, Select } from '@3sc/ui';

export const SearchPage: React.FC = () => {
  useDocumentTitle('Search');
  const navigate = useNavigate();
  const permissions = usePermissions();
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState('');
  const debouncedQuery = useDebouncedValue(query, 500);

  const { data, isLoading, isFetching } = useAiSemanticSearchQuery(
    { query: debouncedQuery, scope: scope || undefined },
    { skip: debouncedQuery.length < 3 || !permissions.canUseAI() },
  );

  const typeIcons: Record<string, string> = {
    ticket: '🎫',
    article: '📚',
    comment: '💬',
  };

  return (
    <div>
      <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.375rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
        Search
      </h1>
      <p style={{ margin: '0 0 1.25rem', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
        {permissions.canUseAI() ? 'AI-powered semantic search across tickets and knowledge base' : 'Search across tickets and knowledge base'}
      </p>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Describe what you're looking for..."
          />
        </div>
        <div style={{ width: '9rem' }}>
          <Select
            options={[
              { value: '', label: 'All types' },
              { value: 'ticket', label: 'Tickets' },
              { value: 'article', label: 'Articles' },
            ]}
            value={scope}
            onChange={(e) => setScope(e.target.value)}
          />
        </div>
      </div>

      {debouncedQuery.length >= 3 ? (
        isFetching ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><Skeleton height="3.5rem" /></Card>
            ))}
          </div>
        ) : data && data.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {data.map((result) => (
              <Card
                key={result.id}
                hover
                onClick={() => {
                  if (result.type === 'ticket') navigate(`/tickets/${result.id}`);
                  else if (result.type === 'article') navigate(`/knowledge/${result.id}`);
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.25rem', marginTop: '0.125rem' }}>
                    {typeIcons[result.type] || '📌'}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.125rem' }}>
                      <Badge>{result.type}</Badge>
                      <h3 style={{
                        margin: 0, fontSize: '0.9375rem', fontWeight: 600,
                        color: 'var(--color-brand-700)',
                      }}>
                        {result.title}
                      </h3>
                    </div>
                    <p style={{
                      margin: 0, fontSize: '0.8125rem',
                      color: 'var(--color-text-secondary)', lineHeight: 1.5,
                    }}>
                      {result.excerpt}
                    </p>
                  </div>
                  <div style={{ width: '5rem', flexShrink: 0 }}>
                    <ConfidenceBar confidence={result.similarity} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="🔍"
            title="No results found"
            description="Try different keywords or broaden your search scope."
          />
        )
      ) : (
        <div style={{
          textAlign: 'center', padding: '4rem 1rem', color: 'var(--color-text-muted)',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔎</div>
          <p style={{ fontSize: '0.875rem' }}>Start typing to search across all content</p>
        </div>
      )}
    </div>
  );
};
