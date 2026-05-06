import { Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Layout } from "./components/Layout";
import { RequireOrgRole } from "./auth/RequireOrgRole";
import { Forbidden } from "./pages/Forbidden";
import { HomeRouter } from "./pages/HomeRouter";
import { ApplicationsPage } from "./pages/admin/ApplicationsPage";
import { AuditLogPage } from "./pages/admin/AuditLogPage";
import { OrganizationDetailPage } from "./pages/admin/OrganizationDetailPage";
import { OrganizationsPage } from "./pages/admin/OrganizationsPage";
import { MembersPage } from "./pages/tenant/MembersPage";
import { SubscriptionsReadOnlyPage } from "./pages/tenant/SubscriptionsReadOnlyPage";
import { MyAppsPage } from "./pages/user/MyAppsPage";

function Loader() {
  return (
    <div
      style={{
        padding: "var(--space-4)",
        color: "var(--muted)",
        textAlign: "center",
      }}
    >
      Loading…
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ErrorBoundary>
          <Suspense fallback={<Loader />}>
            <Layout>
                <ErrorBoundary>
                  <Suspense fallback={<Loader />}>
                    <Routes>
                      <Route path="/" element={<HomeRouter />} />
                      <Route path="/forbidden" element={<Forbidden />} />
                      <Route path="/apps" element={<MyAppsPage />} />

                      <Route
                        path="/admin/orgs"
                        element={
                          <ProtectedRoute requiredRole="aibydna_admin">
                            <OrganizationsPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/orgs/:orgId"
                        element={
                          <ProtectedRoute requiredRole="aibydna_admin">
                            <OrganizationDetailPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/applications"
                        element={
                          <ProtectedRoute requiredRole="aibydna_admin">
                            <ApplicationsPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/audit"
                        element={
                          <ProtectedRoute requiredRole="aibydna_admin">
                            <AuditLogPage />
                          </ProtectedRoute>
                        }
                      />

                      <Route
                        path="/orgs/:orgId/members"
                        element={
                          <RequireOrgRole role="customer_admin">
                            <MembersPage />
                          </RequireOrgRole>
                        }
                      />
                      <Route
                        path="/orgs/:orgId/subscriptions"
                        element={
                          <RequireOrgRole role="customer_admin">
                            <SubscriptionsReadOnlyPage />
                          </RequireOrgRole>
                        }
                      />

                      <Route
                        path="*"
                        element={<Navigate to="/forbidden" replace />}
                      />
                    </Routes>
                  </Suspense>
                </ErrorBoundary>
            </Layout>
          </Suspense>
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  );
}
