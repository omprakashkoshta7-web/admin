import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Admin Panel Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow-lg text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} className="text-red-600" />
            </div>
            
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              Admin Panel Error
            </h1>
            
            <p className="text-gray-600 mb-6">
              Something went wrong. This might be due to:
            </p>
            
            <div className="text-left bg-gray-50 rounded-lg p-4 mb-6">
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Backend services not running</li>
                <li>• API connection issues</li>
                <li>• Authentication problems</li>
                <li>• Network connectivity</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white px-4 py-3 rounded-xl font-semibold hover:bg-gray-800 transition"
              >
                <RefreshCw size={16} />
                Reload Admin Panel
              </button>
              
              <button
                onClick={() => this.setState({ hasError: false })}
                className="w-full bg-gray-100 text-gray-700 px-4 py-3 rounded-xl font-semibold hover:bg-gray-200 transition"
              >
                Try Again
              </button>
            </div>
            
            {this.state.error && (
              <details className="mt-4 text-left">
                <summary className="text-sm text-gray-500 cursor-pointer">
                  Technical Details
                </summary>
                <pre className="text-xs text-red-600 mt-2 bg-red-50 p-2 rounded overflow-auto">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;