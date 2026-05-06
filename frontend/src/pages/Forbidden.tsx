import { Link } from "react-router-dom";
import { Banner } from "../components/Banner";

export function Forbidden({ reason }: { reason?: string }) {
  return (
    <div style={{ display: "grid", gap: "var(--space-3)", maxWidth: 520 }}>
      <Banner kind="error">
        <strong>Access denied.</strong>
        <div
          style={{
            marginTop: "var(--space-1)",
            fontSize: "0.9rem",
            color: "var(--muted)",
          }}
        >
          {reason ?? "You don't have permission to view this page."}
        </div>
      </Banner>
      <Link to="/" style={{ color: "var(--primary)" }}>
        Go home
      </Link>
    </div>
  );
}
