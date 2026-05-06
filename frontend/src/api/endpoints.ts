import type {
  Application,
  ApplicationCreate,
  ApplicationUpdate,
  AuditFilters,
  AuditLog,
  Member,
  MemberCreate,
  MemberCreateOut,
  MembershipRole,
  MyApp,
  MyMembership,
  Organization,
  OrganizationCreate,
  Subscription,
  SubscriptionStatus,
} from "../types";
import { apiFetch } from "./client";

// Organizations
export const listOrganizations = () =>
  apiFetch<Organization[]>("/organizations");
export const getOrganization = (id: string) =>
  apiFetch<Organization>(`/organizations/${id}`);
export const createOrganization = (input: OrganizationCreate) =>
  apiFetch<Organization>("/organizations", {
    method: "POST",
    body: JSON.stringify(input),
  });
export const deleteOrganization = (id: string) =>
  apiFetch<void>(`/organizations/${id}`, { method: "DELETE" });

// Members
export const listMembers = (orgId: string) =>
  apiFetch<Member[]>(`/organizations/${orgId}/users`);
export const createMember = (orgId: string, input: MemberCreate) =>
  apiFetch<MemberCreateOut>(`/organizations/${orgId}/users`, {
    method: "POST",
    body: JSON.stringify(input),
  });
export const updateMemberRole = (
  orgId: string,
  userId: string,
  role: MembershipRole,
) =>
  apiFetch<Member>(`/organizations/${orgId}/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
export const deactivateMember = (orgId: string, userId: string) =>
  apiFetch<void>(`/organizations/${orgId}/users/${userId}/deactivate`, {
    method: "POST",
  });
export const activateMember = (orgId: string, userId: string) =>
  apiFetch<void>(`/organizations/${orgId}/users/${userId}/activate`, {
    method: "POST",
  });
export const deleteMember = (orgId: string, userId: string) =>
  apiFetch<void>(`/organizations/${orgId}/users/${userId}`, {
    method: "DELETE",
  });

// Applications
export const listApplications = (enabledOnly = false) =>
  apiFetch<Application[]>(
    `/applications${enabledOnly ? "?enabled_only=true" : ""}`,
  );
export const createApplication = (input: ApplicationCreate) =>
  apiFetch<Application>("/applications", {
    method: "POST",
    body: JSON.stringify(input),
  });
export const updateApplication = (id: string, patch: ApplicationUpdate) =>
  apiFetch<Application>(`/applications/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
export const deleteApplication = (id: string) =>
  apiFetch<void>(`/applications/${id}`, { method: "DELETE" });

// Subscriptions
export const listSubscriptions = (orgId: string) =>
  apiFetch<Subscription[]>(`/organizations/${orgId}/apps`);
export const createSubscription = (orgId: string, app_code: string) =>
  apiFetch<Subscription>(`/organizations/${orgId}/apps`, {
    method: "POST",
    body: JSON.stringify({ app_code }),
  });
export const updateSubscription = (
  orgId: string,
  app_code: string,
  status: SubscriptionStatus,
) =>
  apiFetch<Subscription>(`/organizations/${orgId}/apps/${app_code}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

// Me
export const getMyApps = () => apiFetch<MyApp[]>("/me/apps");
export const getMyMemberships = () =>
  apiFetch<MyMembership[]>("/me/memberships");

// Audit
export const getAuditLog = (filters: AuditFilters = {}) => {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== null && v !== "") qs.append(k, String(v));
  }
  const tail = qs.toString();
  return apiFetch<AuditLog[]>(`/audit${tail ? `?${tail}` : ""}`);
};
