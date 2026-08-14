export function AdminChart({
  data,
  height = 160,
}: {
  data: { label: string; value: number }[];
  height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1" title={`${d.label}: ${d.value}`}>
          <div className="w-full max-w-[28px] rounded-t-md bg-emerald-500/80 transition-all dark:bg-emerald-600/70" style={{ height: `${Math.max(4, (d.value / max) * 100)}%` }} />
          <span className="text-[10px] text-neutral-500">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
