"use client";

import { Component, ReactNode } from "react";
import ErrorState from "@/components/ui/ErrorState";
import Button from "@/components/ui/Button";
import { logger } from "@/lib/logger";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: unknown) {
    logger.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <ErrorState
            title="Đã xảy ra lỗi"
            description={this.state.error?.message || "Vui lòng thử lại sau"}
            action={{
              label: "Tải lại trang",
              onClick: () => {
                window.location.reload();
              },
            }}
          />
        </div>
      );
    }

    return this.props.children;
  }
}

