import { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[Noticed ErrorBoundary] Uncaught runtime error:", error, errorInfo);
  }

  private handleReload = () => {
    triggerHaptic("medium");
    window.location.reload();
  };

  private handleClearTransientCache = () => {
    triggerHaptic("heavy");
    try {
      if (typeof window !== "undefined") {
        sessionStorage.clear();
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && key.startsWith("sidenotes_temp_")) {
            localStorage.removeItem(key);
          }
        }
      }
    } catch {
      // ignore
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          className="min-h-screen w-full flex items-center justify-center p-5 select-none"
          style={{
            backgroundColor: "var(--bg-base, #111113)",
            color: "var(--text-primary, #f5f5f4)",
          }}
        >
          <div className="relative w-full max-w-sm rounded-3xl p-6 dynamic-island-shell text-center space-y-4 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.5)] border border-[var(--glass-border)]">
            <div className="dynamic-island-specular-rim" />

            <div className="w-12 h-12 rounded-2xl bg-[var(--text-primary)]/10 flex items-center justify-center text-[var(--text-primary)] mx-auto shadow-xs border border-[var(--glass-border)]">
              <AlertCircle className="w-6 h-6 stroke-[1.8]" />
            </div>

            <div className="space-y-1.5">
              <h2 className="font-serif text-lg font-bold text-[var(--text-primary)] tracking-tight">
                An unexpected ripple occurred
              </h2>
              <p className="text-xs font-serif italic text-[var(--text-secondary)] leading-relaxed max-w-xs mx-auto">
                Your archival notes remain safe in local storage. Let's restore the manuscript view.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-2.5 rounded-xl bg-black/10 dark:bg-white/5 border border-[var(--glass-border)]/50 text-[10.5px] font-mono text-[var(--text-tertiary)] truncate text-left">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-2.5 rounded-full bg-[var(--text-primary)] text-[var(--accent-ink)] text-xs font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform cursor-pointer shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5 stroke-[2.2]" />
                <span>Restore & Reload</span>
              </button>

              <button
                type="button"
                onClick={this.handleClearTransientCache}
                className="w-full py-2 rounded-full inner-pseudo-glass text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 transition-transform cursor-pointer"
              >
                Clear transient cache & reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
