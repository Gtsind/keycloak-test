import type { ReactNode } from "react";
import { Navigate, useParams } from "react-router-dom";
import { useMemberships } from "../hooks/useMemberships";
import type { MembershipRole } from "../types";

export function RequireOrgRole({
  role,
  children,
}: {
  role: MembershipRole;
  children: ReactNode;
}) {
  const { orgId } = useParams<{ orgId: string }>();
  const { roleIn } = useMemberships();

  if (!orgId) return <Navigate to="/forbidden" replace />;
  const actual = roleIn(orgId);
  if (actual === null) return <Navigate to="/forbidden" replace />;
  if (role === "customer_admin" && actual !== "customer_admin") {
    return <Navigate to="/apps" replace />;
  }
  return <>{children}</>;
}
