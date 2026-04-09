import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const MissingClerkConfig = () => (
  <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center p-6">
    <div className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl">
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-xl text-amber-300">
        !
      </div>
      <h1 className="text-2xl font-bold">Clerk is not configured yet</h1>
      <p className="mt-3 text-sm leading-6 text-slate-300">
        The app now uses Clerk for sign-in and sign-up, but the frontend is missing
        <code className="mx-1 rounded bg-slate-800 px-2 py-1 text-emerald-300">VITE_CLERK_PUBLISHABLE_KEY</code>
        in the local environment.
      </p>
      <div className="mt-6 rounded-2xl bg-slate-950/80 p-4 text-sm text-slate-300">
        <p className="font-semibold text-slate-100">Add one of these and restart Vite:</p>
        <p className="mt-3 font-mono text-xs text-emerald-300">.env.local</p>
        <p className="mt-1 font-mono text-xs text-slate-200">VITE_CLERK_PUBLISHABLE_KEY=pk_test_...</p>
      </div>
    </div>
  </div>
);

const root = ReactDOM.createRoot(rootElement);

if (!clerkPublishableKey) {
  console.error('Missing VITE_CLERK_PUBLISHABLE_KEY for Clerk authentication.');
  root.render(
    <React.StrictMode>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <MissingClerkConfig />
      </ThemeProvider>
    </React.StrictMode>
  );
} else {
  root.render(
    <React.StrictMode>
      <ClerkProvider publishableKey={clerkPublishableKey}>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <App />
        </ThemeProvider>
      </ClerkProvider>
    </React.StrictMode>
  );
}
