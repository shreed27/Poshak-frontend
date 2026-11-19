import React from 'react';
import { reportError } from '../lib/errorReporter';
import { resetSignIn } from './StuckHelp';

// If a screen crashes, show a calm message instead of a blank page — and tell us about it.
export class ErrorBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error, info) { reportError(error, { source: 'react', componentStack: String(info?.componentStack || '').slice(0, 800) }); }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '1.5rem', background: '#f4f5f7', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ maxWidth: 420, background: '#fff', borderRadius: 20, padding: '1.6rem', boxShadow: '0 10px 40px rgba(0,0,0,.08)', textAlign: 'center' }}>
          <div style={{ fontSize: '2.2rem' }}>🧺</div>
          <h2 style={{ margin: '.4rem 0' }}>Something went wrong</h2>
          <p style={{ color: '#6b7280', fontSize: '.92rem', lineHeight: 1.5 }}>Sorry about that — we’ve been told and will look into it. Your orders are safe. Please reload; if it keeps happening, use “Reset sign-in”.</p>
          <div style={{ display: 'flex', gap: '.6rem', justifyContent: 'center', marginTop: '1rem' }}>
            <button onClick={() => window.location.reload()} style={{ padding: '.6rem 1.2rem', borderRadius: 12, border: 0, background: '#fa5929', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>Reload</button>
            <button onClick={resetSignIn} style={{ padding: '.6rem 1.2rem', borderRadius: 12, border: '1.5px solid #e5e7eb', background: '#fff', fontWeight: 700, cursor: 'pointer' }}>Reset sign-in</button>
          </div>
        </div>
      </div>
    );
  }
}
