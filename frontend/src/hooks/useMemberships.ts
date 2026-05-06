import { use, useMemo } from "react";
import { getCached } from "../api/client";
import { getMyMemberships } from "../api/endpoints";
import { useAuth } from "../auth/useAuth";
import type { MyMembership, OrgValue } from "../types";

const EMPTY: MyMembership[] = [];

export function useMemberships(): OrgValue {
  const { persona } = useAuth();
  const memberships =
    persona === "aibydna_admin"
      ? EMPTY
      : use(getCached("me:memberships", getMyMemberships));

  return useMemo(() => {
    const byId: Record<string, MyMembership> = {};
    for (const m of memberships) byId[m.organization_id] = m;
    return {
      memberships,
      byId,
      roleIn: (orgId: string) => byId[orgId]?.role ?? null,
    };
  }, [memberships]);
}
