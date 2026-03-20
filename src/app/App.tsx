import { Component, type ReactNode } from "react";
import { RouterProvider } from "react-router";
import { router } from "./routes";

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white font-['Inter'] p-8">
          <div className="max-w-md text-center space-y-4">
            <div className="text-4xl">⚠️</div>
            <h1 className="text-xl font-bold text-[#e11d48]">Une erreur est survenue</h1>
            <p className="text-[#888] text-sm">{(this.state.error as Error).message}</p>
            <button
              className="mt-4 px-4 py-2 bg-[#e11d48] rounded text-sm font-bold"
              onClick={() => { this.setState({ error: null }); window.location.reload(); }}
            >
              Recharger la page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  );
}
