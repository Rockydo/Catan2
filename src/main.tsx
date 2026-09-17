import { localize as tx, setLocale, getLocale } from "./i18n";
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
import "./polish.css";
import "./roll.css";
import "./military.css";
import "./workspace.css";
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: string | null }
> {
  state = { error: null as string | null };
  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }
  render() {
    return this.state.error ? (
      <main className="crash-screen">
        <h1>{tx("The interface encountered a problem.")}</h1>
        <p>
          {tx(
            "Your most recent autosave is kept in this browser. Reload to recover it.",
          )}
        </p>
        <pre>{tx(this.state.error)}</pre>
        <button onClick={() => location.reload()}>
          {tx("Reload saved campaign")}
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
setLocale(getLocale());
createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
