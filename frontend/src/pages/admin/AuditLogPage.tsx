import { use, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { getCached, invalidate } from "../../api/client";
import { getAuditLog } from "../../api/endpoints";
import { Button } from "../../components/Button";
import { Table, type Column } from "../../components/Table";
import type { AuditFilters, AuditLog } from "../../types";

export function AuditLogPage() {
  const [search, setSearch] = useSearchParams();
  const [version, setVersion] = useState(0);

  const filters: AuditFilters = {
    actor_user_id: search.get("actor_user_id") || undefined,
    action: search.get("action") || undefined,
    target_type: search.get("target_type") || undefined,
    since: search.get("since") || undefined,
    until: search.get("until") || undefined,
    limit: 50,
  };

  const key = `audit:${JSON.stringify(filters)}:${version}`;
  const rows = use(getCached(key, () => getAuditLog(filters)));

  const reload = () => {
    invalidate("audit:");
    setVersion((v) => v + 1);
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const next = new URLSearchParams();
    for (const f of [
      "actor_user_id",
      "action",
      "target_type",
      "since",
      "until",
    ]) {
      const value = (form.elements.namedItem(f) as HTMLInputElement)?.value;
      if (value) next.set(f, value);
    }
    setSearch(next);
  };

  const columns: Column<AuditLog>[] = [
    { header: "When", cell: (r) => new Date(r.created_at).toLocaleString() },
    { header: "Actor", cell: (r) => r.actor_user_id },
    { header: "Action", cell: (r) => r.action },
    { header: "Target", cell: (r) => `${r.target_type}:${r.target_id}` },
  ];

  return (
    <div style={{ display: "grid", gap: "var(--space-3)" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1>Audit log</h1>
        <Button variant="ghost" onClick={reload}>
          ↻ Refresh
        </Button>
      </header>

      <form onSubmit={onSubmit} style={filterFormStyle}>
        <input
          name="action"
          defaultValue={filters.action ?? ""}
          placeholder="action (e.g. organization.create)"
          style={inputStyle}
        />
        <input
          name="target_type"
          defaultValue={filters.target_type ?? ""}
          placeholder="target_type"
          style={inputStyle}
        />
        <input
          name="actor_user_id"
          defaultValue={filters.actor_user_id ?? ""}
          placeholder="actor user id"
          style={inputStyle}
        />
        <input
          name="since"
          defaultValue={filters.since ?? ""}
          placeholder="since (ISO)"
          style={inputStyle}
        />
        <input
          name="until"
          defaultValue={filters.until ?? ""}
          placeholder="until (ISO)"
          style={inputStyle}
        />
        <Button>Apply</Button>
      </form>

      <Table
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        empty="No audit entries."
      />
    </div>
  );
}

const filterFormStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "var(--space-2)",
} as const;

const inputStyle = {
  padding: "var(--space-2)",
  borderRadius: "var(--radius)",
  border: "1px solid var(--border)",
  background: "var(--bg)",
  color: "var(--text)",
  fontSize: "0.9rem",
} as const;
