import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';
import './index.css';
import { registerServiceWorker } from './lib/push';
import { installGlobalErrorHandlers } from './lib/errorReporter';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LangProvider } from './i18n';

registerServiceWorker();
installGlobalErrorHandlers();

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '474998251635-744ai71bof86c7cpqhseakcngqgo9fn8.apps.googleusercontent.com';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <LangProvider>
        <GoogleOAuthProvider clientId={googleClientId}>
          <App />
        </GoogleOAuthProvider>
      </LangProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
