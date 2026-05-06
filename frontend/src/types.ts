export interface OrganizationClaim {
  [orgName: string]: { id: string };
}

export interface AuthValue {
  sub: string;
  email: string | null;
  roles: string[];
  persona: Persona;
  organizationClaim: OrganizationClaim;
  logout: () => void;
}

export interface OrgValue {
  memberships: MyMembership[];
  byId: Record<string, MyMembership>;
  roleIn: (orgId: string) => MembershipRole | null;
}

export type OrgStatus = "active" | "suspended" | "deleted";
export type SubscriptionStatus = "active" | "suspended" | "cancelled";
export type MembershipRole = "customer_admin" | "customer_user";

export interface Organization {
  id: string;
  name: string;
  status: OrgStatus;
  created_at: string;
}

export interface OrganizationCreate {
  name: string;
  domain: string;
}

export interface Member {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  enabled: boolean;
  role: MembershipRole | null;
}

export interface MemberCreate {
  email: string;
  first_name: string;
  last_name: string;
  role: MembershipRole;
}

export interface MemberCreateOut extends Member {
  temporary_password: string;
}

export interface Subscription {
  id: string;
  organization_id: string;
  app_code: string;
  status: SubscriptionStatus;
  created_at: string;
}

export interface MyApp {
  organization_id: string;
  organization_name: string;
  app_code: string;
}

export interface MyMembership {
  organization_id: string;
  organization_name: string;
  role: MembershipRole;
}

export interface AuditLog {
  id: string;
  actor_user_id: string;
  action: string;
  target_type: string;
  target_id: string;
  created_at: string;
}

export interface AuditFilters {
  actor_user_id?: string;
  action?: string;
  target_type?: string;
  target_id?: string;
  since?: string;
  until?: string;
  limit?: number;
  offset?: number;
}

export type Persona =
  | "aibydna_admin"
  | "customer_admin"
  | "customer_user"
  | "unknown";
