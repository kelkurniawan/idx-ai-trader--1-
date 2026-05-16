import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  message: string;
};

export default class AppErrorBoundary extends React.Component<Props, State> {
  state: State = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error.message || 'The app could not finish loading this screen.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Frontend render failure', { error, info });
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
          <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/15 text-rose-300">
            <AlertTriangle size={24} />
          </div>
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            The screen failed to render. Refreshing usually restores the session without changing your data.
          </p>
          <p className="mt-4 break-words rounded-xl bg-slate-950 px-4 py-3 font-mono text-xs text-amber-300">
            {this.state.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
          >
            <RotateCcw size={16} />
            Refresh
          </button>
        </div>
      </div>
    );
  }
}
