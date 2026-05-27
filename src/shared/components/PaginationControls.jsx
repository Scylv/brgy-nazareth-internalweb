import Button from "./Button";

export default function PaginationControls({
  className = "",
  onNext,
  onPrevious,
  page,
  totalPages
}) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${className}`.trim()}>
      <p className="text-sm font-semibold text-slate-600">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        <Button disabled={page === 1} onClick={onPrevious} size="sm" variant="secondary">
          Previous
        </Button>
        <Button disabled={page === totalPages} onClick={onNext} size="sm" variant="secondary">
          Next
        </Button>
      </div>
    </div>
  );
}
