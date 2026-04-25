import React from 'react';

function inlineMarkdown(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*'))
      return <em key={i}>{part.slice(1, -1)}</em>;
    if (part.startsWith('`') && part.endsWith('`'))
      return (
        <code
          key={i}
          style={{
            background: 'var(--color-bg-subtle)',
            padding: '0.05em 0.3em',
            borderRadius: '0.25rem',
            fontSize: '0.8125rem',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {part.slice(1, -1)}
        </code>
      );
    return part;
  });
}

export interface MarkdownRendererProps {
  children: string;
  style?: React.CSSProperties;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ children, style }) => {
  const lines = children.split('\n');
  const nodes: React.ReactNode[] = [];
  let tableRows: string[][] = [];
  let inTable = false;

  const flushTable = (key: number) => {
    if (!tableRows.length) return;
    const [header, , ...body] = tableRows;
    nodes.push(
      <div key={`tbl-${key}`} style={{ overflowX: 'auto', margin: '0.75rem 0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
          <thead>
            <tr>
              {header.map((cell, i) => (
                <th
                  key={i}
                  style={{
                    padding: '0.5rem 0.75rem',
                    borderBottom: '2px solid var(--color-border)',
                    textAlign: 'left',
                    fontWeight: 600,
                    color: 'var(--color-text)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {inlineMarkdown(cell.trim())}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, ri) => (
              <tr key={ri} style={{ borderBottom: '1px solid var(--color-border)' }}>
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    style={{
                      padding: '0.5rem 0.75rem',
                      color: 'var(--color-text-secondary)',
                      verticalAlign: 'top',
                    }}
                  >
                    {inlineMarkdown(cell.trim())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>,
    );
    tableRows = [];
    inTable = false;
  };

  lines.forEach((line, i) => {
    if (line.startsWith('|')) {
      inTable = true;
      tableRows.push(line.split('|').slice(1, -1));
      return;
    }
    if (inTable) flushTable(i);

    if (!line.trim()) {
      nodes.push(<div key={i} style={{ height: '0.5rem' }} />);
      return;
    }
    if (line.startsWith('### ')) {
      nodes.push(
        <h3 key={i} style={{ margin: '0.75rem 0 0.25rem', fontSize: '0.9375rem', fontWeight: 700 }}>
          {inlineMarkdown(line.slice(4))}
        </h3>,
      );
      return;
    }
    if (line.startsWith('## ')) {
      nodes.push(
        <h2 key={i} style={{ margin: '0.75rem 0 0.25rem', fontSize: '1rem', fontWeight: 700 }}>
          {inlineMarkdown(line.slice(3))}
        </h2>,
      );
      return;
    }
    if (line.startsWith('# ')) {
      nodes.push(
        <h1 key={i} style={{ margin: '0.75rem 0 0.25rem', fontSize: '1.0625rem', fontWeight: 700 }}>
          {inlineMarkdown(line.slice(2))}
        </h1>,
      );
      return;
    }
    if (line.match(/^[-*] /)) {
      nodes.push(
        <div
          key={i}
          style={{ display: 'flex', gap: '0.5rem', paddingLeft: '0.5rem', marginBottom: '0.125rem' }}
        >
          <span style={{ color: 'var(--color-brand-500)', flexShrink: 0 }}>•</span>
          <span style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>{inlineMarkdown(line.slice(2))}</span>
        </div>,
      );
      return;
    }
    nodes.push(
      <p key={i} style={{ margin: '0.25rem 0', fontSize: '0.875rem', lineHeight: 1.7 }}>
        {inlineMarkdown(line)}
      </p>,
    );
  });

  if (inTable) flushTable(lines.length);

  return <div style={style}>{nodes}</div>;
};
