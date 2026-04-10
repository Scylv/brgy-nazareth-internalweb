import { getStatusMeta } from "../lib/status";

export default function StatusBadge({ status }) {
  const meta = getStatusMeta(status);

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${meta.badgeClass}`}>
      {meta.label} · {meta.summary}
    </span>
  );
}
