import React, { useRef, useState } from 'react';
import { FILE_CONFIG } from '@3sc/config';
import { formatFileSize, getFileIcon } from '@3sc/utils';

export interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  accept?: string;
  uploading?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFilesSelected,
  maxFiles = FILE_CONFIG.maxAttachments,
  accept,
  uploading = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [rejectedCount, setRejectedCount] = useState(0);

  const handleFiles = (fileList: FileList) => {
    const files = Array.from(fileList).slice(0, maxFiles);
    const valid = files.filter(
      (f) => f.size <= FILE_CONFIG.maxFileSize && FILE_CONFIG.allowedTypes.includes(f.type as any)
    );
    setSelectedFiles(valid);
    onFilesSelected(valid);
    setRejectedCount(files.length - valid.length);
  };

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragActive ? 'var(--color-brand-500)' : 'var(--color-border)'}`,
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragActive ? 'var(--color-brand-50)' : 'var(--color-bg-subtle)',
          transition: 'var(--transition-fast)',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept ?? FILE_CONFIG.allowedTypes.join(',')}
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          style={{ display: 'none' }}
        />
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
          📎 Drag files here or <span style={{ color: 'var(--color-brand-600)', fontWeight: 500 }}>browse</span>
        </p>
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          Max {formatFileSize(FILE_CONFIG.maxFileSize)} per file · Up to {maxFiles} files
        </p>
      </div>
      {selectedFiles.length > 0 && (
        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          {selectedFiles.map((f, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.375rem 0.75rem',
              background: 'var(--color-bg-subtle)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8125rem',
            }}>
              <span>{getFileIcon(f.type)}</span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>{formatFileSize(f.size)}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const next = selectedFiles.filter((_, j) => j !== i);
                  setSelectedFiles(next);
                  onFilesSelected(next);
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
              >✕</button>
            </div>
          ))}
        </div>
      )}
      {rejectedCount > 0 && (
        <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--color-error)' }}>
          {rejectedCount} file(s) rejected (invalid type or exceeds {formatFileSize(FILE_CONFIG.maxFileSize)})
        </p>
      )}
      {uploading && (
        <div style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: 'var(--color-brand-600)' }}>
          Uploading...
        </div>
      )}
    </div>
  );
};
