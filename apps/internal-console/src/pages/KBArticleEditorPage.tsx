import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  useGetKBArticleQuery,
  useGetKBCategoriesQuery,
  useCreateKBArticleMutation,
  useUpdateKBArticleMutation,
  useSearchKBQuery,
  useGenerateKBDraftMutation,
} from '@3sc/api';
import { useDocumentTitle, useDebouncedValue } from '@3sc/hooks';
import { Card, Button, Input, TextArea, Select, Badge, Skeleton, useToast } from '@3sc/ui';
import { slugify } from '@3sc/utils';

export const KBArticleEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = (location.state ?? {}) as { suggestedTitle?: string; topic?: string };
  const { showToast } = useToast();

  useDocumentTitle(isEditing ? 'Edit Article' : 'New Article');

  // Load existing article if editing
  const { data: existing, isLoading: loadingArticle } = useGetKBArticleQuery(id ?? '', { skip: !isEditing });
  const { data: categories } = useGetKBCategoriesQuery();

  const [createArticle, { isLoading: creating }] = useCreateKBArticleMutation();
  const [updateArticle, { isLoading: updating }] = useUpdateKBArticleMutation();
  const [generateDraft, { isLoading: generating }] = useGenerateKBDraftMutation();
  const isSaving = creating || updating;

  // Form state — pre-fill title from gap suggestion if navigated from gaps tab
  const [title, setTitle] = useState(locationState.suggestedTitle ?? '');
  const [categoryId, setCategoryId] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isPublished, setIsPublished] = useState(false);
  const [relatedIds, setRelatedIds] = useState<string[]>([]);

  const [aiDraftTopic, setAiDraftTopic] = useState(locationState.topic ?? '');
  const [showDraftPanel, setShowDraftPanel] = useState(!!locationState.topic);

  const handleGenerateDraft = async () => {
    const topic = aiDraftTopic.trim() || title.trim();
    if (!topic) { showToast({ message: 'Enter a topic or title first', variant: 'error' }); return; }
    try {
      const draft = await generateDraft({ topic, categoryId: categoryId || undefined }).unwrap();
      if (!title) setTitle(draft.title);
      if (!excerpt) setExcerpt(draft.excerpt);
      setContent(draft.content);
      const newTags = draft.suggestedTags.filter((t) => !tags.includes(t));
      if (newTags.length) setTags([...tags, ...newTags]);
      if (!categoryId && draft.suggestedCategoryId) setCategoryId(draft.suggestedCategoryId);
      setShowDraftPanel(false);
      setAiDraftTopic('');
      showToast({ message: 'Draft generated — review and edit before publishing', variant: 'success' });
    } catch {
      showToast({ message: 'Failed to generate draft', variant: 'error' });
    }
  };

  // Related article search
  const [relatedSearch, setRelatedSearch] = useState('');
  const debouncedRelatedSearch = useDebouncedValue(relatedSearch, 300);
  const { data: relatedResults } = useSearchKBQuery(
    { query: debouncedRelatedSearch, limit: 5 },
    { skip: debouncedRelatedSearch.length < 2 },
  );

  // Populate form when editing
  useEffect(() => {
    if (existing) {
      setTitle(existing.title);
      setCategoryId(existing.categoryId ?? '');
      setExcerpt(existing.excerpt);
      setContent(existing.content);
      setTags(existing.tags);
      setIsPublished(existing.isPublished);
      setRelatedIds(existing.relatedArticleIds);
    }
  }, [existing]);

  const handleAddTag = () => {
    const newTags = tagInput.split(',').map((t) => t.trim().toLowerCase()).filter((t) => t && !tags.includes(t));
    if (newTags.length) setTags([...tags, ...newTags]);
    setTagInput('');
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); handleAddTag(); }
  };

  const handleRemoveTag = (tag: string) => setTags(tags.filter((t) => t !== tag));

  const handleToggleRelated = (articleId: string) => {
    setRelatedIds((prev) =>
      prev.includes(articleId) ? prev.filter((r) => r !== articleId) : [...prev, articleId],
    );
  };

  const handleSave = async () => {
    if (!title.trim()) { showToast({ message: 'Title is required', variant: 'error' }); return; }
    if (!excerpt.trim()) { showToast({ message: 'Excerpt is required', variant: 'error' }); return; }
    if (!content.trim()) { showToast({ message: 'Content is required', variant: 'error' }); return; }

    // Flush any unsaved tag input before saving
    const pendingTags = tagInput.split(',').map((t) => t.trim().toLowerCase()).filter((t) => t && !tags.includes(t));
    const finalTags = pendingTags.length ? [...tags, ...pendingTags] : tags;

    const payload = {
      title: title.trim(),
      categoryId: categoryId || undefined,
      excerpt: excerpt.trim(),
      content: content.trim(),
      tags: finalTags,
      isPublished,
      relatedArticleIds: relatedIds,
      slug: slugify(title.trim()),
    };

    try {
      if (isEditing && id) {
        await updateArticle({ id, ...payload }).unwrap();
        showToast({ message: 'Article updated', variant: 'success' });
      } else {
        await createArticle(payload).unwrap();
        showToast({ message: 'Article created', variant: 'success' });
      }
      navigate('/knowledge');
    } catch {
      showToast({ message: 'Failed to save article', variant: 'error' });
    }
  };

  if (isEditing && loadingArticle) {
    return (
      <div style={{ maxWidth: '52rem' }}>
        <Skeleton height="2rem" style={{ marginBottom: '1rem' }} />
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height="3rem" style={{ marginBottom: '0.75rem' }} />)}
      </div>
    );
  }

  const categoryOptions = [
    { value: '', label: 'No category' },
    ...(categories?.map((c) => ({ value: c.id, label: c.name })) ?? []),
  ];

  const suggestedArticles = relatedResults?.map((r) => r.article).filter((a) => a.id !== id) ?? [];

  return (
    <div style={{ maxWidth: '52rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button
          onClick={() => navigate('/knowledge')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', fontSize: '1rem', padding: 0 }}
        >←</button>
        <h1 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700, fontFamily: 'var(--font-display)', flex: 1 }}>
          {isEditing ? 'Edit Article' : 'New Article'}
        </h1>
        <Button variant="ghost" size="sm" onClick={() => setShowDraftPanel((v) => !v)}>
          🤖 AI Draft
        </Button>
      </div>

      {/* AI Draft Panel */}
      {showDraftPanel && (
        <div style={{
          marginBottom: '1rem', padding: '1rem 1.25rem',
          background: 'var(--color-bg-subtle)', border: '1px solid var(--color-brand-300, var(--color-border))',
          borderRadius: 'var(--radius-lg)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '1rem' }}>🤖</span>
            <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-brand-600)' }}>Generate Article Draft with AI</span>
          </div>
          <p style={{ margin: '0 0 0.75rem', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
            Describe the topic and AI will generate a structured article draft. You can edit everything before publishing.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              value={aiDraftTopic}
              onChange={(e) => setAiDraftTopic(e.target.value)}
              placeholder={title || 'e.g. How to reset your password'}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleGenerateDraft(); } }}
              disabled={generating}
              style={{
                flex: 1,
                padding: '0.5rem 0.75rem',
                border: '1px solid var(--color-border-strong)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                background: 'var(--color-bg)',
                color: 'var(--color-text)',
                fontFamily: 'var(--font-body)',
                outline: 'none',
                opacity: generating ? 0.6 : 1,
              }}
            />
            <Button variant="primary" size="sm" onClick={handleGenerateDraft} loading={generating}>
              Generate
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowDraftPanel(false)} disabled={generating}>
              Cancel
            </Button>
          </div>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Leave the field empty to use the article title above.
          </p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Title */}
        <Card>
          <label style={labelStyle}>Title <span style={{ color: 'var(--color-danger)' }}>*</span></label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Clear, descriptive article title"
          />
        </Card>

        {/* Category + Status row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem' }}>
          <Card>
            <label style={labelStyle}>Category</label>
            <Select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              options={categoryOptions}
            />
          </Card>
          <Card style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <label style={{ ...labelStyle, marginBottom: '0.625rem' }}>Status</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: 'var(--color-brand-600)' }}
              />
              <span style={{ fontSize: '0.875rem', fontWeight: isPublished ? 600 : 400, color: isPublished ? 'var(--color-success)' : 'var(--color-text-secondary)' }}>
                {isPublished ? 'Published' : 'Draft'}
              </span>
            </label>
          </Card>
        </div>

        {/* Tags */}
        <Card>
          <label style={labelStyle}>Tags</label>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: tags.length ? '0.625rem' : 0 }}>
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="Type a tag and press Enter or comma"
              style={{ flex: 1 }}
            />
            <Button variant="ghost" size="sm" onClick={handleAddTag}>Add</Button>
          </div>
          {tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
              {tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                    padding: '0.2rem 0.5rem', borderRadius: '999px',
                    background: 'var(--color-brand-100)', color: 'var(--color-brand-700)',
                    fontSize: '0.8125rem', fontWeight: 500,
                  }}
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, color: 'var(--color-brand-500)' }}
                  >×</button>
                </span>
              ))}
            </div>
          )}
        </Card>

        {/* Excerpt */}
        <Card>
          <label style={labelStyle}>
            Excerpt <span style={{ color: 'var(--color-danger)' }}>*</span>
            <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', marginLeft: '0.5rem' }}>({excerpt.length}/300)</span>
          </label>
          <TextArea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value.slice(0, 300))}
            placeholder="Short summary shown in search results and category listings"
            rows={3}
          />
        </Card>

        {/* Content */}
        <Card>
          <label style={labelStyle}>
            Content <span style={{ color: 'var(--color-danger)' }}>*</span>
          </label>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Use ## for headings, - or 1. for lists. Plain text is rendered as paragraphs.
          </p>
          <TextArea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Full article body..."
            rows={18}
            style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', resize: 'vertical' }}
          />
        </Card>

        {/* Related articles */}
        <Card>
          <label style={labelStyle}>Related Articles</label>
          {relatedIds.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.75rem' }}>
              {relatedIds.map((relId) => (
                <span
                  key={relId}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                    padding: '0.2rem 0.5rem', borderRadius: '999px',
                    background: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)',
                    fontSize: '0.8125rem',
                  }}
                >
                  {relId}
                  <button
                    onClick={() => handleToggleRelated(relId)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, color: 'var(--color-text-muted)' }}
                  >×</button>
                </span>
              ))}
            </div>
          )}
          <Input
            value={relatedSearch}
            onChange={(e) => setRelatedSearch(e.target.value)}
            placeholder="Search articles to link..."
          />
          {suggestedArticles.length > 0 && (
            <div style={{ marginTop: '0.5rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              {suggestedArticles.map((a) => (
                <button
                  key={a.id}
                  onClick={() => { handleToggleRelated(a.id); setRelatedSearch(''); }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', padding: '0.625rem 0.875rem',
                    background: relatedIds.includes(a.id) ? 'var(--color-brand-50)' : 'transparent',
                    border: 'none', borderBottom: '1px solid var(--color-border)',
                    cursor: 'pointer', textAlign: 'left', fontSize: '0.875rem',
                  }}
                >
                  <span>{a.title}</span>
                  {relatedIds.includes(a.id) && <Badge variant="success">Added</Badge>}
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingBottom: '2rem' }}>
          <Button variant="ghost" onClick={() => navigate('/knowledge')} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} loading={isSaving}>
            {isEditing ? 'Save Changes' : 'Create Article'}
          </Button>
        </div>
      </div>
    </div>
  );
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '0.5rem',
  fontSize: '0.8125rem',
  fontWeight: 600,
  color: 'var(--color-text)',
};
