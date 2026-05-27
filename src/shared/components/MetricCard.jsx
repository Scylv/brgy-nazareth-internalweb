const toneClasses = {
  orange: "border-orange-100 bg-orange-50 text-gov-700",
  sky: "border-sky-100 bg-sky-50 text-sky-700",
  emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
  amber: "border-amber-100 bg-amber-50 text-amber-700",
  rose: "border-rose-200 bg-rose-50 text-rose-700"
};

export default function MetricCard({ description, label, tone = "orange", value }) {
  return (
    <div className={`rounded-2xl border p-4 ${toneClasses[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em]">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
      {description ? <p className="mt-2 text-sm leading-5">{description}</p> : null}
    </div>
  );
}
