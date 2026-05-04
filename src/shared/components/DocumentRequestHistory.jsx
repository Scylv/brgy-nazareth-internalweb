function formatDate(date) {
  if (!date) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(date));
}

export default function DocumentRequestHistory({ requests, title = "Document History" }) {
  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-orange-100 bg-white">
      <div className="border-b border-orange-100 bg-orange-50 px-5 py-4">
        <h3 className="text-lg font-black text-slate-900">{title}</h3>
        <p className="mt-1 text-sm text-slate-600">Linked through resident ID</p>
      </div>

      {requests.length > 0 ? (
        <div className="grid gap-px bg-orange-100">
          <div className="grid grid-cols-1 gap-3 bg-orange-50 px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-gov-700 lg:grid-cols-[1fr_0.75fr_0.75fr_0.75fr_0.8fr_0.7fr]">
            <span>Document</span>
            <span>Requested</span>
            <span>Released</span>
            <span>Expiry</span>
            <span>Processed By</span>
            <span>Status</span>
          </div>

          {requests.map((request) => (
            <div
              className="grid grid-cols-1 gap-3 bg-white px-5 py-4 text-sm lg:grid-cols-[1fr_0.75fr_0.75fr_0.75fr_0.8fr_0.7fr]"
              key={request.id}
            >
              <div>
                <p className="font-semibold text-slate-900">{request.documentType}</p>
                <p className="text-slate-500">{request.purpose}</p>
              </div>
              <span className="text-slate-600">{formatDate(request.requestDate)}</span>
              <span className="text-slate-600">{formatDate(request.releaseDate)}</span>
              <span className="text-slate-600">{formatDate(request.expiryDate)}</span>
              <span className="text-slate-600">{request.processedBy || "Unassigned"}</span>
              <span className="font-semibold text-slate-700">{request.status}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-5 py-8 text-center text-sm text-slate-500">
          No document requests are linked to this resident yet.
        </div>
      )}
    </section>
  );
}
