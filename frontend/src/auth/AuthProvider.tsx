import type { ReactNode } from "react";
import { keycloak } from "./keycloak";
import { AuthContext } from "./AuthContext";
import type { AuthValue, OrganizationClaim, Persona } from "../types";

function resolvePersona(roles: string[]): Persona {
  if (roles.includes("aibydna_admin")) return "aibydna_admin";
  if (roles.includes("customer_admin")) return "customer_admin";
  if (roles.includes("customer_user")) return "customer_user";
  return "unknown";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const parsed = keycloak.tokenParsed as
    | {
        sub?: string;
        email?: string;
        realm_access?: { roles?: string[] };
        organization?: OrganizationClaim;
      }
    | undefined;

  const value: AuthValue = {
    sub: parsed?.sub ?? "",
    email: parsed?.email ?? null,
    roles: parsed?.realm_access?.roles ?? [],
    persona: resolvePersona(parsed?.realm_access?.roles ?? []),
    organizationClaim: parsed?.organization ?? {},
    logout: () => keycloak.logout({ redirectUri: window.location.origin }),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
