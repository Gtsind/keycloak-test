import { use, useState, type FormEvent } from "react";
import { ApiError, getCached, invalidate } from "../api/client";
import {
  activateMember,
  createMember,
  deactivateMember,
  deleteMember,
  listMembers,
  updateMemberRole,
} from "../api/endpoints";
import { Banner } from "./Banner";
import { Button } from "./Button";
import { Modal } from "./Modal";
import { Table, type Column } from "./Table";
import type { Member, MemberCreateOut, MembershipRole } from "../types";

export function MembersManager({ orgId }: { orgId: string }) {
  const [version, setVersion] = useState(0);
  const members = use(
    getCached(`members:${orgId}:${version}`, () => listMembers(orgId)),
  );

  const [showCreate, setShowCreate] = useState(false);
  const [created, setCreated] = useState<MemberCreateOut | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Member | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = () => {
    invalidate(`members:${orgId}:`);
    setVersion((v) => v + 1);
  };

  const wrap = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
      reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed");
    }
  };

  const onRoleChange = (m: Member, role: MembershipRole) =>
    wrap(() => updateMemberRole(orgId, m.id, role));
  const onToggleEnabled = (m: Member) =>
    wrap(() => (m.enabled ? deactivateMember : activateMember)(orgId, m.id));
  const onDelete = (m: Member) => wrap(() => deleteMember(orgId, m.id));

  const columns: Column<Member>[] = [
    { header: "Email", cell: (m) => m.email ?? "—" },
    {
      header: "Name",
      cell: (m) => `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim() || "—",
    },
    {
      header: "Role",
      cell: (m) => (
        <select
          value={m.role ?? "customer_user"}
          onChange={(e) => onRoleChange(m, e.target.value as MembershipRole)}
          style={selectStyle}
        >
          <option value="customer_user">customer_user</option>
          <option value="customer_admin">customer_admin</option>
        </select>
      ),
    },
    { header: "Status", cell: (m) => (m.enabled ? "active" : "disabled") },
    {
      header: "",
      cell: (m) => (
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          <Button variant="ghost" onClick={() => onToggleEnabled(m)}>
            {m.enabled ? "Deactivate" : "Activate"}
          </Button>
          <Button variant="danger" onClick={() => setConfirmDelete(m)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: "grid", gap: "var(--space-3)" }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Button onClick={() => setShowCreate(true)}>+ Add user</Button>
      </div>

      {error && <Banner kind="error">{error}</Banner>}

      <Table
        columns={columns}
        rows={members}
        rowKey={(m) => m.id}
        empty="No members yet."
      />

      {showCreate && (
        <CreateMemberModal
          orgId={orgId}
          onClose={() => setShowCreate(false)}
          onCreated={(m) => {
            setShowCreate(false);
            setCreated(m);
            reload();
          }}
        />
      )}

      {created && (
        <TempPasswordModal member={created} onClose={() => setCreated(null)} />
      )}

      {confirmDelete && (
        <Modal
          title={`Remove ${confirmDelete.email}?`}
          onClose={() => setConfirmDelete(null)}
          actions={
            <>
              <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  const m = confirmDelete;
                  setConfirmDelete(null);
                  onDelete(m);
                }}
              >
                Remove
              </Button>
            </>
          }
        >
          This deletes the user from Keycloak and removes their membership.
        </Modal>
      )}
    </div>
  );
}

function CreateMemberModal({
  orgId,
  onClose,
  onCreated,
}: {
  orgId: string;
  onClose: () => void;
  onCreated: (m: MemberCreateOut) => void;
}) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<MembershipRole>("customer_user");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const m = await createMember(orgId, {
        email,
        first_name: firstName,
        last_name: lastName,
        role,
      });
      onCreated(m);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed");
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Add user"
      onClose={onClose}
      actions={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={submitting || !email || !firstName || !lastName}
          >
            Create
          </Button>
        </>
      }
    >
      <form
        onSubmit={submit}
        style={{ display: "grid", gap: "var(--space-3)" }}
      >
        {error && <Banner kind="error">{error}</Banner>}
        <label style={labelStyle}>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
            autoFocus
          />
        </label>
        <label style={labelStyle}>
          First name
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          Last name
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          Role
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as MembershipRole)}
            style={inputStyle}
          >
            <option value="customer_user">customer_user</option>
            <option value="customer_admin">customer_admin</option>
          </select>
        </label>
      </form>
    </Modal>
  );
}

function TempPasswordModal({
  member,
  onClose,
}: {
  member: MemberCreateOut;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard
      .writeText(member.temporary_password)
      .then(() => setCopied(true))
      .catch(() => setCopied(false));
  };

  return (
    <Modal
      title="User created"
      onClose={onClose}
      actions={<Button onClick={onClose}>I have saved this password</Button>}
    >
      <div style={{ display: "grid", gap: "var(--space-3)" }}>
        <Banner kind="info">
          This password is shown <strong>only once</strong>. Copy it now and
          share it securely with the user.
        </Banner>
        <div style={{ fontSize: "0.9rem", color: "var(--muted)" }}>
          {member.email}
        </div>
        <div
          style={{
            display: "flex",
            gap: "var(--space-2)",
            alignItems: "center",
          }}
        >
          <code style={pwStyle}>{member.temporary_password}</code>
          <Button variant="ghost" onClick={copy}>
            {copied ? "✓ Copied" : "Copy"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

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

const selectStyle = {
  padding: "var(--space-1) var(--space-2)",
  borderRadius: "var(--radius)",
  border: "1px solid var(--border)",
  background: "var(--bg)",
  color: "var(--text)",
} as const;

const pwStyle = {
  flex: 1,
  padding: "var(--space-2)",
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  fontFamily: "ui-monospace, SFMono-Regular, monospace",
  fontSize: "0.95rem",
  wordBreak: "break-all" as const,
} as const;
