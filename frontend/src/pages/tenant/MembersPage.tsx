import { useParams } from "react-router-dom";
import { MembersManager } from "../../components/MembersManager";
import { useMemberships } from "../../hooks/useMemberships";

export function MembersPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const { byId } = useMemberships();
  if (!orgId) return null;
  const orgName = byId[orgId]?.organization_name ?? "Organization";

  return (
    <div style={{ display: "grid", gap: "var(--space-3)" }}>
      <h1>{orgName} · Members</h1>
      <MembersManager orgId={orgId} />
    </div>
  );
}
