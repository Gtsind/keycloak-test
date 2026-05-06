import { use } from "react";
import { getCached } from "../../api/client";
import { getMyApps } from "../../api/endpoints";

export function MyAppsPage() {
  const apps = use(getCached("me:apps", getMyApps));

  if (apps.length === 0) {
    return (
      <div style={{ color: "var(--muted)" }}>
        You don't have access to any applications yet.
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: "var(--space-3)" }}>
      <h1>My applications</h1>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: "var(--space-3)",
        }}
      >
        {apps.map((a) => (
          <div
            key={`${a.organization_id}:${a.app_code}`}
            style={{
              padding: "var(--space-3)",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
            }}
          >
            <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
              {a.organization_name}
            </div>
            <div style={{ fontSize: "1.1rem", fontWeight: 600, marginTop: 4 }}>
              {a.app_code}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
