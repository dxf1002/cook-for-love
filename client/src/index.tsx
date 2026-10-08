import React from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';

import RoutesComponent from './app.tsx';
import './index.css';
import { createPortal } from 'react-dom';
import { Toaster } from '@client/src/components/ui/sonner';

function ErrorFallback({ error }: FallbackProps) {
  return (
    <div style={{ padding: 24, color: '#c0392b', fontFamily: 'system-ui, sans-serif' }}>
      <h2 style={{ marginBottom: 8 }}>应用运行出错</h2>
      <pre
        style={{
          background: '#fdf0ed',
          padding: 12,
          borderRadius: 6,
          whiteSpace: 'pre-wrap',
        }}
      >
        {error instanceof Error ? error.message : String(error)}
      </pre>
    </div>
  );
}

const MainApp = () => {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <RoutesComponent />
      {createPortal(<Toaster />, document.body)}
    </ErrorBoundary>
  );
};

createRoot(document.getElementById('root')!).render(<MainApp />);
