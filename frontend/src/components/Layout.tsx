import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../auth/useAuth";
import { OrgSwitcher } from "./OrgSwitcher";
import { Button } from "./Button";
import styles from "./Layout.module.css";

export function Layout({ children }: { children: ReactNode }) {
  const { email, persona, logout } = useAuth();

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div className={styles.brand}>aibydna</div>
        <nav className={styles.nav}>
          {persona === "aibydna_admin" && (
            <>
              <NavLink to="/admin/orgs" className={navCls}>
                Organizations
              </NavLink>
              <NavLink to="/admin/applications" className={navCls}>
                Applications
              </NavLink>
              <NavLink to="/admin/audit" className={navCls}>
                Audit log
              </NavLink>
            </>
          )}
          {persona === "customer_admin" && <OrgSwitcher />}
          {(persona === "customer_admin" || persona === "customer_user") && (
            <NavLink to="/apps" className={navCls}>
              My apps
            </NavLink>
          )}
        </nav>
        <div className={styles.user}>
          <span className={styles.email}>{email}</span>
          <span className={styles.role}>{persona}</span>
          <Button variant="ghost" onClick={logout}>
            Log out
          </Button>
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}

function navCls({ isActive }: { isActive: boolean }) {
  return [styles.link, isActive ? styles.active : ""].filter(Boolean).join(" ");
}
