export default function NavButton({ active, children, onClick }) {
  return (
    <button
      className={`rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
        active
          ? "bg-gov-700 text-white"
          : "border border-orange-100 bg-orange-50 text-gov-800 hover:border-gov-300"
      }`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
