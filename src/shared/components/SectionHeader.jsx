export default function SectionHeader({
  actions,
  className = "",
  description,
  eyebrow,
  title
}) {
  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between ${className}`.trim()}>
      <div>
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gov-700">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-1 text-xl font-black text-slate-900 sm:text-2xl">{title}</h2>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
