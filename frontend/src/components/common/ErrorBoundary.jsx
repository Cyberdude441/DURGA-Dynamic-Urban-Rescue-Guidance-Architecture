import React from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('DURGA Application Error Boundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-slate-800">
          <div className="max-w-md w-full bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 border border-rose-200 text-rose-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Module Rendering Interrupted</h2>
            <p className="text-xs text-slate-500 font-mono">
              {this.state.error?.message || 'An unexpected rendering error occurred in this view.'}
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 font-mono text-xs font-bold text-white hover:bg-emerald-800 transition-colors shadow-xs cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reload Page</span>
              </button>
              <a
                href="/"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 font-mono text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <Home className="h-3.5 w-3.5" />
                <span>Return to Dashboard</span>
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
