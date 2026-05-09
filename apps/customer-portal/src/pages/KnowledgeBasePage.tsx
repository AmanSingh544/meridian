import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSearchKBQuery, useGetKBCategoriesQuery } from '@3sc/api';
import { useDocumentTitle, useDebouncedValue } from '@3sc/hooks';
import { Card, SearchInput, EmptyState, Skeleton, Badge, Button, Icon } from '@3sc/ui';
import { Search } from 'lucide-react';
import { truncate } from '@3sc/utils';

export const KnowledgeBasePage: React.FC = () => {
  useDocumentTitle('Knowledge Base');
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<{ id: string; name: string } | null>(null);
  const debouncedSearch = useDebouncedValue(search, 400);

  const { data: categories } = useGetKBCategoriesQuery();

  // Featured articles — always load top results for the landing view
  const { data: featuredResults, isLoading: featuredLoading } = useSearchKBQuery(
    { query: '', limit: 50 },
    { skip: debouncedSearch.length >= 2 },
  );

  // Search results — only fire when the user has typed at least 2 chars
  const { data: searchResults, isLoading: searchLoading, isFetching } = useSearchKBQuery(
    { query: debouncedSearch, limit: 10 },
    { skip: debouncedSearch.length < 2 },
  );

  const isSearching = debouncedSearch.length >= 2;
  const isLoading = isSearching ? (searchLoading || isFetching) : featuredLoading;

  const handleCategoryClick = (cat: { id: string; name: string }) => {
    if (selectedCategory?.id === cat.id) {
      setSelectedCategory(null);
      setSearch('');
    } else {
      setSelectedCategory(cat);
      setSearch(cat.name);
    }
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    // Clear category filter whenever the user edits the search box directly
    if (selectedCategory) setSelectedCategory(null);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
          Knowledge Base
        </h1>
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
          Find answers to common questions and step-by-step guides.
        </p>
      </div>

      {/* Search */}
      <div style={{ maxWidth: '36rem', marginBottom: '1.25rem' }}>
        <SearchInput
          value={search}
          onChange={handleSearchChange}
          placeholder="Search articles, guides, and FAQs..."
        />
      </div>

      {/* Active category chip */}
      {selectedCategory && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>Filtering by:</span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
            padding: '0.25rem 0.625rem', borderRadius: '999px',
            background: 'var(--color-brand-100)', color: 'var(--color-brand-700)',
            fontSize: '0.8125rem', fontWeight: 600,
          }}>
            {selectedCategory.name}
            <button
              onClick={() => { setSelectedCategory(null); setSearch(''); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, color: 'var(--color-brand-500)', fontSize: '0.875rem' }}
            >×</button>
          </span>
        </div>
      )}

      {isSearching ? (
        /* ── Search / filtered results ── */
        <div>
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}><Skeleton height="3rem" /></Card>
              ))}
            </div>
          ) : searchResults && searchResults.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                {searchResults.length} article{searchResults.length !== 1 ? 's' : ''} found
              </p>
              {searchResults.map((r) => (
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
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                        {truncate(r.article.excerpt, 150)}
                      </p>
                      {r.article.tags.length > 0 && (
                        <div style={{ marginTop: '0.375rem', display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                          {r.article.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag}>{tag}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    {debouncedSearch.length >= 2 && (
                      <span style={{
                        fontSize: '0.6875rem', fontWeight: 600,
                        color: r.score > 0.8 ? 'var(--color-success)' : 'var(--color-text-muted)',
                        whiteSpace: 'nowrap', marginLeft: '1rem',
                      }}>
                        {Math.round(r.score * 100)}% match
                      </span>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Icon icon={Search} size="xl" />}
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
        /* ── Landing view: categories + featured ── */
        <div>
          {/* Categories grid */}
          <h2 style={{ margin: '0 0 0.75rem', fontSize: '1rem', fontWeight: 700 }}>Browse by Category</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(14rem, 1fr))', gap: '0.75rem', marginBottom: '2rem' }}>
            {categories?.map((cat) => (
              <Card
                key={cat.id}
                hover
                onClick={() => handleCategoryClick(cat)}
                style={{ cursor: 'pointer' }}
              >
                <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>{cat.name}</h3>
                {cat.description && (
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                    {truncate(cat.description, 80)}
                  </p>
                )}
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem', display: 'block' }}>
                  {cat.articleCount} article{cat.articleCount !== 1 ? 's' : ''}
                </span>
              </Card>
            ))}
          </div>

          {/* Featured articles */}
          <h2 style={{ margin: '0 0 0.75rem', fontSize: '1rem', fontWeight: 700 }}>Most Viewed Articles</h2>
          {featuredLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(18rem, 1fr))', gap: '0.75rem' }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}><Skeleton height="4rem" /></Card>
              ))}
            </div>
          ) : featuredResults && featuredResults.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(18rem, 1fr))', gap: '0.75rem' }}>
              {featuredResults
                .slice()
                .sort((a, b) => b.article.viewCount - a.article.viewCount)
                .map((r) => (
                  <Card
                    key={r.article.id}
                    hover
                    onClick={() => navigate(`/knowledge/${r.article.id}`)}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      {r.article.category && (
                        <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)' }}>
                          {r.article.category.name}
                        </span>
                      )}
                      <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-brand-700)', lineHeight: 1.3 }}>
                        {r.article.title}
                      </h3>
                      <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                        {truncate(r.article.excerpt ?? '', 100)}
                      </p>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        {r.article.viewCount.toLocaleString()} views · {r.article.helpfulCount} found helpful
                      </span>
                    </div>
                  </Card>
                ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
