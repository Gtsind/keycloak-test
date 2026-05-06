import { Navigate } from "react-router-dom";
import { useAuth } from "./useAuth";
import type { ReactNode } from "react";

export function ProtectedRoute({
  requiredRole,
  children,
}: {
  requiredRole: string;
  children: ReactNode;
}) {
  const { roles } = useAuth();
  if (!roles.includes(requiredRole))
    return <Navigate to="/forbidden" replace />;
  return <>{children}</>;
}
