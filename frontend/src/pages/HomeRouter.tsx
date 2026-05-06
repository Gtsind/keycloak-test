import { use } from "react";
import { Navigate } from "react-router-dom";
import { getCached } from "../api/client";
import { getMyMemberships } from "../api/endpoints";
import { useAuth } from "../auth/useAuth";
import { Forbidden } from "./Forbidden";

export function HomeRouter() {
  const { persona } = useAuth();

  if (persona === "aibydna_admin") return <Navigate to="/admin/orgs" replace />;
  if (persona === "customer_user") return <Navigate to="/apps" replace />;
  if (persona === "customer_admin") return <CustomerAdminLanding />;

  return (
    <Forbidden reason="No role assigned to this account. Contact your administrator." />
  );
}

function CustomerAdminLanding() {
  const memberships = use(getCached("me:memberships", getMyMemberships));
  const adminOrgs = memberships.filter((m) => m.role === "customer_admin");
  if (adminOrgs.length > 0) {
    return (
      <Navigate to={`/orgs/${adminOrgs[0].organization_id}/members`} replace />
    );
  }
  return <Navigate to="/apps" replace />;
}
