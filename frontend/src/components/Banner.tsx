import type { ReactNode } from "react";
import styles from "./Banner.module.css";

type Kind = "error" | "info" | "success";

export function Banner({
  kind = "info",
  children,
}: {
  kind?: Kind;
  children: ReactNode;
}) {
  return <div className={`${styles.banner} ${styles[kind]}`}>{children}</div>;
}
