const STORES = [
  "Lulu Hypermarket",
  "Carrefour UAE",
  "Union Coop",
  "Nesto Hypermarket",
  "Choithrams",
  "Spinneys",
  "Viva",
];

export function ParticipatingStores() {
  return (
    <section id="stores" className="bg-white py-24">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-600">
            Participating Supermarkets
          </h2>
          <p className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Shop at any of these stores — or anywhere the featured product is sold
          </p>
          <p className="mt-4 text-slate-600">
            No retailer account or app required. Any UAE supermarket receipt showing the featured
            product is accepted.
          </p>
        </div>

        <div className="mt-14 flex flex-wrap items-center justify-center gap-4">
          {STORES.map((store) => (
            <span
              key={store}
              className="rounded-full border border-slate-200 bg-slate-50 px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm"
            >
              {store}
            </span>
          ))}
          <span className="rounded-full border border-dashed border-brand-300 bg-brand-50 px-6 py-3 text-sm font-semibold text-brand-700">
            + Any UAE Supermarket
          </span>
        </div>
      </div>
    </section>
  );
}
