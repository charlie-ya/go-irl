import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="h-screen w-screen bg-red-900 text-white p-4 overflow-auto flex flex-col gap-4 z-[9999] relative">
                    <h1 className="text-2xl font-bold">Something went wrong.</h1>
                    <div className="bg-black/50 p-4 rounded text-sm font-mono whitespace-pre-wrap">
                        {this.state.error?.toString()}
                    </div>
                    <details className="bg-black/50 p-4 rounded text-xs font-mono whitespace-pre-wrap">
                        <summary>Stack Trace</summary>
                        {this.state.errorInfo?.componentStack}
                    </details>
                    <button
                        className="bg-white text-black px-4 py-2 rounded font-bold"
                        onClick={() => window.location.reload()}
                    >
                        Reload Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
