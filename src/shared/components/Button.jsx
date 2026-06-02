const variantClasses = {
  primary: "border-transparent bg-gov-700 text-white hover:bg-gov-800",
  secondary: "border-orange-200 bg-white text-gov-800 hover:border-gov-300 hover:bg-orange-50",
  quiet: "border-slate-200 bg-white text-slate-700 hover:border-gov-300 hover:text-gov-800",
  planned: "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500"
};

const sizeClasses = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-4 py-2.5 text-sm"
};

export default function Button({
  children,
  className = "",
  disabled = false,
  size = "md",
  type = "button",
  variant = "primary",
  ...props
}) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-2xl border font-semibold transition disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`.trim()}
      disabled={disabled}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
