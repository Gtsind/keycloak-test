import type { ReactNode } from "react";
import styles from "./Table.module.css";

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  width?: string;
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  empty?: ReactNode;
}

export function Table<T>({ columns, rows, rowKey, empty }: Props<T>) {
  if (rows.length === 0) {
    return <div className={styles.empty}>{empty ?? "No data."}</div>;
  }
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          {columns.map((c, i) => (
            <th key={i} style={c.width ? { width: c.width } : undefined}>
              {c.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={rowKey(row)}>
            {columns.map((c, i) => (
              <td key={i}>{c.cell(row)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
