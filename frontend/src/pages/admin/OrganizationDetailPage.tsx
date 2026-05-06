import { use, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { getCached, invalidate, ApiError } from "../../api/client";
import {
  createSubscription,
  getOrganization,
  listApplications,
  listSubscriptions,
  updateSubscription,
} from "../../api/endpoints";
import { Banner } from "../../components/Banner";
import { Button } from "../../components/Button";
import { MembersManager } from "../../components/MembersManager";
import { Table, type Column } from "../../components/Table";
import type { Subscription, SubscriptionStatus } from "../../types";

export function OrganizationDetailPage() {
  const { orgId } = useParams<{ orgId: string }>();
  if (!orgId) return null;
  return <Detail orgId={orgId} />;
}

function Detail({ orgId }: { orgId: string }) {
  const [version, setVersion] = useState(0);
  const org = use(
    getCached(`org:${orgId}:${version}`, () => getOrganization(orgId)),
  );
  const subs = use(
    getCached(`subs:${orgId}:${version}`, () => listSubscriptions(orgId)),
  );

  const reload = () => {
    invalidate(`org:${orgId}:`);
    invalidate(`subs:${orgId}:`);
    setVersion((v) => v + 1);
  };

  return (
    <div style={{ display: "grid", gap: "var(--space-4)" }}>
      <div>
        <Link
          to="/admin/orgs"
          style={{ color: "var(--muted)", fontSize: "0.9rem" }}
        >
          ← All organizations
        </Link>
        <h1 style={{ marginTop: "var(--space-2)" }}>{org.name}</h1>
        <div style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
          {org.status} · created {new Date(org.created_at).toLocaleDateString()}
        </div>
      </div>

      <section style={{ display: "grid", gap: "var(--space-2)" }}>
        <h2>Members</h2>
        <MembersManager orgId={orgId} />
      </section>

      <section style={{ display: "grid", gap: "var(--space-2)" }}>
        <h2>Subscriptions</h2>
        <SubscriptionsManager orgId={orgId} subs={subs} onChange={reload} />
      </section>
    </div>
  );
}

function SubscriptionsManager({
  orgId,
  subs,
  onChange,
}: {
  orgId: string;
  subs: Subscription[];
  onChange: () => void;
}) {
  const apps = use(getCached("apps:enabled", () => listApplications(true)));
  const available = apps.filter(
    (a) => a.enabled && !subs.some((s) => s.application_id === a.id),
  );
  const [selected, setSelected] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const code = selected || available[0]?.code || "";

  const onAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!code) return;
    setSubmitting(true);
    setError(null);
    try {
      await createSubscription(orgId, code);
      setSelected("");
      onChange();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  const onStatusChange = async (
    sub: Subscription,
    status: SubscriptionStatus,
  ) => {
    setError(null);
    try {
      await updateSubscription(orgId, sub.application.code, status);
      onChange();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed");
    }
  };

  const columns: Column<Subscription>[] = [
    {
      header: "App",
      cell: (s) => `${s.application.name} (${s.application.code})`,
    },
    {
      header: "Status",
      cell: (s) => (
        <select
          value={s.status}
          onChange={(e) =>
            onStatusChange(s, e.target.value as SubscriptionStatus)
          }
          style={selectStyle}
        >
          <option value="active">active</option>
          <option value="suspended">suspended</option>
          <option value="cancelled">cancelled</option>
        </select>
      ),
    },
    {
      header: "Created",
      cell: (s) => new Date(s.created_at).toLocaleDateString(),
    },
  ];

  return (
    <div style={{ display: "grid", gap: "var(--space-3)" }}>
      {error && <Banner kind="error">{error}</Banner>}
      {available.length === 0 ? (
        <div style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
          {apps.length === 0
            ? "No applications exist yet."
            : "All available applications are already subscribed."}
        </div>
      ) : (
        <form
          onSubmit={onAdd}
          style={{ display: "flex", gap: "var(--space-2)" }}
        >
          <select
            value={code}
            onChange={(e) => setSelected(e.target.value)}
            style={{ ...selectStyle, flex: 1 }}
          >
            {available.map((a) => (
              <option key={a.id} value={a.code}>
                {a.name} ({a.code})
              </option>
            ))}
          </select>
          <Button disabled={submitting || !code}>Add</Button>
        </form>
      )}
      <Table
        columns={columns}
        rows={subs}
        rowKey={(s) => s.id}
        empty="No subscriptions yet."
      />
    </div>
  );
}

const selectStyle = {
  padding: "var(--space-1) var(--space-2)",
  borderRadius: "var(--radius)",
  border: "1px solid var(--border)",
  background: "var(--bg)",
  color: "var(--text)",
} as const;
