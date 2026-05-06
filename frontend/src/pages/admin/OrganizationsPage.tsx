import { use, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { getCached, invalidate, ApiError } from "../../api/client";
import {
  createOrganization,
  deleteOrganization,
  listOrganizations,
} from "../../api/endpoints";
import { Banner } from "../../components/Banner";
import { Button } from "../../components/Button";
import { Modal } from "../../components/Modal";
import { Table, type Column } from "../../components/Table";
import type { Organization } from "../../types";

export function OrganizationsPage() {
  const [version, setVersion] = useState(0);
  const orgs = use(getCached(`orgs:list:${version}`, listOrganizations));
  const [showCreate, setShowCreate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Organization | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = () => {
    invalidate("orgs:list:");
    setVersion((v) => v + 1);
  };

  const onDelete = async (org: Organization) => {
    setError(null);
    try {
      await deleteOrganization(org.id);
      setConfirmDelete(null);
      reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to delete");
    }
  };

  const columns: Column<Organization>[] = [
    {
      header: "Name",
      cell: (o) => <Link to={`/admin/orgs/${o.id}`}>{o.name}</Link>,
    },
    { header: "Status", cell: (o) => o.status },
    {
      header: "Created",
      cell: (o) => new Date(o.created_at).toLocaleDateString(),
    },
    {
      header: "",
      width: "100px",
      cell: (o) => (
        <Button variant="danger" onClick={() => setConfirmDelete(o)}>
          Delete
        </Button>
      ),
    },
  ];

  return (
    <div style={{ display: "grid", gap: "var(--space-3)" }}>
      <header style={headerStyle}>
        <h1>Organizations</h1>
        <Button onClick={() => setShowCreate(true)}>+ New organization</Button>
      </header>

      {error && <Banner kind="error">{error}</Banner>}

      <Table
        columns={columns}
        rows={orgs}
        rowKey={(o) => o.id}
        empty="No organizations yet."
      />

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            reload();
          }}
        />
      )}

      {confirmDelete && (
        <Modal
          title={`Delete "${confirmDelete.name}"?`}
          onClose={() => setConfirmDelete(null)}
          actions={
            <>
              <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => onDelete(confirmDelete)}>
                Delete
              </Button>
            </>
          }
        >
          This will remove the organization and all its memberships and
          subscriptions.
        </Modal>
      )}
    </div>
  );
}

function CreateModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await createOrganization({ name, domain });
      onCreated();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to create");
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="New organization"
      onClose={onClose}
      actions={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting || !name || !domain}>
            Create
          </Button>
        </>
      }
    >
      <form onSubmit={submit} style={formStyle}>
        {error && <Banner kind="error">{error}</Banner>}
        <label style={labelStyle}>
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
            autoFocus
          />
        </label>
        <label style={labelStyle}>
          Domain
          <input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            style={inputStyle}
          />
        </label>
      </form>
    </Modal>
  );
}

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
} as const;

const formStyle = {
  display: "grid",
  gap: "var(--space-3)",
} as const;

const labelStyle = {
  display: "grid",
  gap: "var(--space-1)",
  fontSize: "0.9rem",
  color: "var(--muted)",
} as const;

const inputStyle = {
  padding: "var(--space-2)",
  borderRadius: "var(--radius)",
  border: "1px solid var(--border)",
  background: "var(--bg)",
  color: "var(--text)",
  fontSize: "1rem",
} as const;
