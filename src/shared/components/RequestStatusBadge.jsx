const REQUEST_STATUS_STYLES = {
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  processing: "border-sky-200 bg-sky-50 text-sky-800",
  released: "border-emerald-200 bg-emerald-50 text-emerald-800",
  expired: "border-rose-200 bg-rose-50 text-rose-800"
};

function formatStatus(status) {
  return String(status || "pending")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function RequestStatusBadge({ status }) {
  const normalizedStatus = String(status || "pending").toLowerCase();
  const className =
    REQUEST_STATUS_STYLES[normalizedStatus] ?? "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>
      {formatStatus(status)}
    </span>
  );
}
