import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateTicketMutation, useCreateAttachmentMutation, useSearchKBQuery } from '@3sc/api';
import { useDocumentTitle, useDebouncedValue } from '@3sc/hooks';
import { Button, Input, TextArea, Select, FileUpload, Card, useToast } from '@3sc/ui';
import { TicketPriority, TicketCategory } from '@3sc/types';

export const CreateTicketPage: React.FC = () => {
  useDocumentTitle('Create Ticket');
  const navigate = useNavigate();
  const { toast } = useToast();
  const [createTicket, { isLoading }] = useCreateTicketMutation();
  const [createAttachment] = useCreateAttachmentMutation();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>(TicketPriority.MEDIUM);
  const [category, setCategory] = useState<TicketCategory>(TicketCategory.SUPPORT);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const debouncedTitle = useDebouncedValue(title, 500);
  const { data: kbResults } = useSearchKBQuery(
    { query: debouncedTitle, limit: 3 },
    { skip: debouncedTitle.length < 5 },
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    try {
      let attachment_ids: number[] = [];

      if (files.length > 0) {
        setUploading(true);
        const results = await Promise.all(
          files.map((file) =>
            createAttachment({
              file_name: file.name,
              file_type: file.type,
              file_path: `/uploads/${file.name}`,
              metadata: {},
            }).unwrap()
          )
        );
        attachment_ids = results.map((r) => r?.data?.id);
        setUploading(false);
      }

      const ticket = await createTicket({
        title: title.trim(),
        description: description.trim(),
        priority,
        category,
        attachment_ids,
      }).unwrap();
      toast('Ticket created successfully', 'success');
      navigate(`/tickets/${ticket.id}`);
    } catch {
      setUploading(false);
      toast('Failed to create ticket', 'error');
    }
  };

  return (
    <div style={{ maxWidth: '42rem' }}>
      <button
        onClick={() => navigate('/tickets')}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: '0.8125rem', color: 'var(--color-text-muted)',
          marginBottom: '0.75rem', padding: 0,
        }}
      >
        ← Back to tickets
      </button>

      <h1 style={{ margin: '0 0 1.5rem', fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
        Create New Ticket
      </h1>

      {/* KB suggestions */}
      {kbResults && kbResults.length > 0 && (
        <Card style={{ marginBottom: '1.25rem', background: 'var(--color-info-light)', border: '1px solid var(--color-info)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.25rem' }}>💡</span>
            <div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem', color: '#1d4ed8' }}>
                Related articles found
              </p>
              <p style={{ margin: '0.25rem 0 0.5rem', fontSize: '0.8125rem', color: '#1e40af' }}>
                Check if these answer your question before creating a ticket:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {kbResults.map((r) => (
                  <a
                    key={r.article.id}
                    href={`/knowledge/${r.article.id}`}
                    onClick={(e) => { e.preventDefault(); navigate(`/knowledge/${r.article.id}`); }}
                    style={{
                      fontSize: '0.8125rem', color: '#1d4ed8', fontWeight: 500,
                    }}
                  >
                    → {r.article.title}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <form onSubmit={handleSubmit}>
          <Input
            label="Subject"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Briefly describe your issue"
            required
            autoFocus
          />

          <TextArea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide detailed information about your issue..."
            required
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Select
              label="Priority"
              options={[
                { value: TicketPriority.LOW, label: 'Low' },
                { value: TicketPriority.MEDIUM, label: 'Medium' },
                { value: TicketPriority.HIGH, label: 'High' },
                { value: TicketPriority.CRITICAL, label: 'Critical' },
              ]}
              value={priority}
              onChange={(e) => setPriority(e.target.value as TicketPriority)}
            />
            <Select
              label="Category"
              options={[
                { value: TicketCategory.SUPPORT, label: 'Support' },
                { value: TicketCategory.BUG, label: 'Bug Report' },
                { value: TicketCategory.FEATURE_REQUEST, label: 'Feature Request' },
                { value: TicketCategory.QUESTION, label: 'Question' },
                { value: TicketCategory.INCIDENT, label: 'Incident' },
                { value: TicketCategory.TASK, label: 'Task' },
              ]}
              value={category}
              onChange={(e) => setCategory(e.target.value as TicketCategory)}
            />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{
              display: 'block', fontSize: '0.8125rem', fontWeight: 500,
              marginBottom: '0.375rem',
            }}>
              Attachments
            </label>
            <FileUpload onFilesSelected={setFiles} uploading={uploading} />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button variant="secondary" type="button" onClick={() => navigate('/tickets')}>
              Cancel
            </Button>
            <Button type="submit" loading={isLoading}>
              Create Ticket
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
