import { use } from "react";
import { useParams } from "react-router-dom";
import { getCached } from "../../api/client";
import { listSubscriptions } from "../../api/endpoints";
import { Table, type Column } from "../../components/Table";
import { useMemberships } from "../../hooks/useMemberships";
import type { Subscription } from "../../types";

export function SubscriptionsReadOnlyPage() {
  const { orgId } = useParams<{ orgId: string }>();
  if (!orgId) return null;
  return <Page orgId={orgId} />;
}

function Page({ orgId }: { orgId: string }) {
  const { byId } = useMemberships();
  const orgName = byId[orgId]?.organization_name ?? "Organization";
  const subs = use(
    getCached(`subs:${orgId}:0`, () => listSubscriptions(orgId)),
  );

  const columns: Column<Subscription>[] = [
    { header: "App", cell: (s) => `${s.application.name} (${s.application.code})` },
    { header: "Status", cell: (s) => s.status },
    {
      header: "Created",
      cell: (s) => new Date(s.created_at).toLocaleDateString(),
    },
  ];

  return (
    <div style={{ display: "grid", gap: "var(--space-3)" }}>
      <h1>{orgName} · Subscriptions</h1>
      <Table
        columns={columns}
        rows={subs}
        rowKey={(s) => s.id}
        empty="No subscriptions yet."
      />
    </div>
  );
}
