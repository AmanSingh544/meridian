import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{
          padding: '2rem', textAlign: 'center',
          background: '#fee2e2', borderRadius: '0.5rem',
          border: '1px solid #ef4444', margin: '1rem',
        }}>
          <h3 style={{ color: '#b91c1c', margin: '0 0 0.5rem' }}>Something went wrong</h3>
          <p style={{ color: '#7f1d1d', fontSize: '0.875rem', margin: 0 }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            style={{
              marginTop: '1rem', padding: '0.375rem 1rem',
              background: '#b91c1c', color: '#fff',
              border: 'none', borderRadius: '0.375rem', cursor: 'pointer',
            }}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
