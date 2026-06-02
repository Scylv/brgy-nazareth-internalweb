const variantClasses = {
  default: "border-orange-100 bg-white",
  tinted: "border-orange-100 bg-orange-50",
  hero: "border-orange-100 bg-gradient-to-r from-orange-50 to-white"
};

const paddingClasses = {
  none: "",
  compact: "p-4",
  default: "p-5",
  spacious: "p-6"
};

export default function SectionCard({
  as: Component = "section",
  children,
  className = "",
  padding = "default",
  variant = "default"
}) {
  return (
    <Component
      className={`rounded-2xl border ${variantClasses[variant]} ${paddingClasses[padding]} ${className}`.trim()}
    >
      {children}
    </Component>
  );
}
