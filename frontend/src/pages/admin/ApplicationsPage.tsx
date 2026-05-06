import { use, useState, type FormEvent } from "react";
import { ApiError, getCached, invalidate } from "../../api/client";
import {
  createApplication,
  deleteApplication,
  listApplications,
  updateApplication,
} from "../../api/endpoints";
import { Banner } from "../../components/Banner";
import { Button } from "../../components/Button";
import { Modal } from "../../components/Modal";
import { Table, type Column } from "../../components/Table";
import type { Application } from "../../types";

const CACHE_PREFIX = "apps:list:";

export function ApplicationsPage() {
  const [version, setVersion] = useState(0);
  const apps = use(
    getCached(`${CACHE_PREFIX}${version}`, () => listApplications()),
  );
  const [showCreate, setShowCreate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Application | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = () => {
    invalidate(CACHE_PREFIX);
    invalidate("apps:enabled");
    setVersion((v) => v + 1);
  };

  const onToggle = async (app: Application) => {
    setError(null);
    try {
      await updateApplication(app.id, { enabled: !app.enabled });
      reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed");
    }
  };

  const onDelete = async (app: Application) => {
    setError(null);
    try {
      await deleteApplication(app.id);
      setConfirmDelete(null);
      reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to delete");
    }
  };

  const columns: Column<Application>[] = [
    { header: "Code", cell: (a) => a.code },
    { header: "Name", cell: (a) => a.name },
    {
      header: "Description",
      cell: (a) => a.description ?? "—",
    },
    {
      header: "Enabled",
      cell: (a) => (
        <Button variant="ghost" onClick={() => onToggle(a)}>
          {a.enabled ? "yes" : "no"}
        </Button>
      ),
    },
    {
      header: "",
      width: "100px",
      cell: (a) => (
        <Button variant="danger" onClick={() => setConfirmDelete(a)}>
          Delete
        </Button>
      ),
    },
  ];

  return (
    <div style={{ display: "grid", gap: "var(--space-3)" }}>
      <header style={headerStyle}>
        <h1>Applications</h1>
        <Button onClick={() => setShowCreate(true)}>+ New application</Button>
      </header>

      {error && <Banner kind="error">{error}</Banner>}

      <Table
        columns={columns}
        rows={apps}
        rowKey={(a) => a.id}
        empty="No applications yet."
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
          title={`Delete "${confirmDelete.code}"?`}
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
          This will fail if any organization is currently subscribed to this
          application.
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
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await createApplication({
        code: code.trim().toLowerCase(),
        name: name.trim(),
        description: description.trim() || null,
      });
      onCreated();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to create");
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="New application"
      onClose={onClose}
      actions={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting || !code || !name}>
            Create
          </Button>
        </>
      }
    >
      <form onSubmit={submit} style={formStyle}>
        {error && <Banner kind="error">{error}</Banner>}
        <label style={labelStyle}>
          Code (e.g. crm)
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            style={inputStyle}
            autoFocus
          />
        </label>
        <label style={labelStyle}>
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          Description
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
