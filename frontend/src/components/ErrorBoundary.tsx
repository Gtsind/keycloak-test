import { Component, type ErrorInfo, type ReactNode } from "react";
import { Banner } from "./Banner";
import { Button } from "./Button";
import { invalidate } from "../api/client";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  retry = () => {
    invalidate("");
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            padding: "var(--space-4)",
            display: "grid",
            gap: "var(--space-3)",
          }}
        >
          <Banner kind="error">
            <strong>Something went wrong.</strong>
            <div
              style={{
                marginTop: "var(--space-1)",
                fontSize: "0.9rem",
                color: "var(--muted)",
              }}
            >
              {this.state.error.message}
            </div>
          </Banner>
          <div>
            <Button variant="ghost" onClick={this.retry}>
              Retry
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
