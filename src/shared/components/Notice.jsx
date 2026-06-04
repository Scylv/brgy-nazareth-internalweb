const toneClasses = {
  info: "border-orange-200 bg-white text-gov-800",
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  danger: "border-rose-200 bg-rose-50 text-rose-700"
};

export default function Notice({ children, className = "", role, tone = "info" }) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${toneClasses[tone]} ${className}`.trim()}
      role={role}
    >
      {children}
    </div>
  );
}
