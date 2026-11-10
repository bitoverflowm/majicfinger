"use client";

import { Component } from "react";
import { reloadForStaleBuild } from "@/lib/retryImport";

/**
 * Keeps one broken part of a screen from taking the whole app down. `fallback` gets the error and
 * a `retry` that renders the children again. Changing `resetKey` also clears the error.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, resetKey: props.resetKey };
    this.retry = () => this.setState({ error: null });
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  static getDerivedStateFromProps(props, state) {
    if (props.resetKey !== state.resetKey) return { error: null, resetKey: props.resetKey };
    return null;
  }

  componentDidCatch(error, info) {
    if (reloadForStaleBuild(error)) return;
    console.error(`[${this.props.name || "ErrorBoundary"}]`, error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const { fallback } = this.props;
    return typeof fallback === "function" ? fallback({ error, retry: this.retry }) : fallback ?? null;
  }
}
