import { useNavigate, useParams } from "react-router-dom";
import { useMemberships } from "../hooks/useMemberships";

export function OrgSwitcher() {
  const { memberships } = useMemberships();
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();

  if (memberships.length === 0) return null;

  if (memberships.length === 1) {
    const m = memberships[0];
    return (
      <span style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
        {m.organization_name}
      </span>
    );
  }

  const current = orgId ?? memberships[0].organization_id;

  return (
    <select
      value={current}
      onChange={(e) => navigate(`/orgs/${e.target.value}/members`)}
      style={{
        padding: "var(--space-1) var(--space-2)",
        borderRadius: "var(--radius)",
        border: "1px solid var(--border)",
        background: "var(--surface)",
        color: "var(--text)",
      }}
    >
      {memberships.map((m) => (
        <option key={m.organization_id} value={m.organization_id}>
          {m.organization_name} (
          {m.role === "customer_admin" ? "admin" : "user"})
        </option>
      ))}
    </select>
  );
}
