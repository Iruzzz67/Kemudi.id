export function AdminTable<T>({
  columns,
  rows,
  renderRow,
  empty = "Tidak ada data.",
}: {
  columns: { key: string; label: React.ReactNode; className?: string }[];
  rows: T[];
  renderRow: (row: T) => React.ReactNode;
  empty?: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={`px-4 py-3 font-semibold ${c.className ?? ""}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-10 text-center text-neutral-400"
              >
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => <tr key={i}>{renderRow(row)}</tr>)
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Td({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-middle ${className}`}>{children}</td>;
}
