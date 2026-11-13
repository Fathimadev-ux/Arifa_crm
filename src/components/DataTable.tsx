"use client";

import type { ReactNode } from "react";
import { SearchX } from "lucide-react";

export interface Column<Row> {
  label: string;
  /** Main line, then an optional small grey line under it. */
  cell: (row: Row) => ReactNode;
  sub?: (row: Row) => ReactNode;
  width?: string;
  alignRight?: boolean;
}

interface DataTableProps<Row> {
  rows: Row[];
  columns: Column<Row>[];
  rowKey: (row: Row) => string;
  onRowClick?: (row: Row) => void;
  /** The row whose details are open, shown highlighted. */
  activeKey?: string | null;
  minWidth?: number;
  emptyText?: string;
}

/** The list layout every records screen shares: fixed columns, a main line and a grey line per cell. */
export function DataTable<Row>({ rows, columns, rowKey, onRowClick, activeKey, minWidth = 720, emptyText = "Nothing here" }: DataTableProps<Row>) {
  if (rows.length === 0) {
    return (
      <div className="animate-enter panel flex flex-col items-center py-16 text-center">
        <SearchX className="size-6 text-neutral-400" />
        <p className="mt-3 font-medium">{emptyText}</p>
      </div>
    );
  }
  return (
    <div className="animate-enter lift panel overflow-x-auto p-2">
      <table className="w-full table-fixed text-sm" style={{ minWidth }}>
        <colgroup>
          {columns.map((column) => (
            <col key={column.label} style={{ width: column.width }} />
          ))}
        </colgroup>
        <thead>
          <tr className="text-left text-xs text-neutral-500">
            {columns.map((column) => (
              <th key={column.label} scope="col" className={`px-4 py-3 font-medium ${column.alignRight ? "text-right" : ""}`}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-dashed divide-neutral-200">
          {rows.map((row) => {
            const key = rowKey(row);
            return (
              <tr
                key={key}
                onClick={onRowClick && (() => onRowClick(row))}
                className={`transition-colors ${onRowClick ? "cursor-pointer hover:bg-white/60" : ""} ${activeKey === key ? "bg-white/70" : ""}`}
              >
                {columns.map((column) => (
                  <td key={column.label} className={`px-4 py-3.5 align-middle ${column.alignRight ? "text-right" : ""}`}>
                    <div className="truncate text-sm font-medium">{column.cell(row)}</div>
                    {column.sub && <div className="mt-0.5 truncate text-xs text-neutral-500">{column.sub(row) ?? " "}</div>}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** A search box for list screens. */
export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <input
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className="glass h-10 w-full rounded-full px-4 text-sm shadow-sm outline-none transition-all placeholder:text-neutral-400 hover:bg-white focus:bg-white focus:shadow-md sm:w-72"
    />
  );
}
