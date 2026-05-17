"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  fallback: ReactNode;
  /** Optional callback fired when a child throws — used for dev logging. */
  onError?: (error: Error, info: ErrorInfo) => void;
  children: ReactNode;
};

type State = { hasError: boolean };

/**
 * Minimal class-based error boundary. We use this inside the R3F scene
 * so that a failed `.glb` load (404, parse error, empty model) doesn't
 * crash the entire invite page — we just swap in a procedural fallback.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);
    if (process.env.NODE_ENV !== "production") {
      console.warn("[QuestBoard scene] using fallback:", error.message);
    }
  }

  render(): ReactNode {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}
