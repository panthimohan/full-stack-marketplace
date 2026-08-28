import { Link, useSearchParams } from "react-router-dom";
import { Store, Search } from "lucide-react";
import { usePublicVendors } from "../../features/vendors/hooks";
import { EmptyState } from "../../components/ui/EmptyState";
import { FullPageSpinner } from "../../components/ui/Spinner";

export default function VendorListPage() {
  const [params, setParams] = useSearchParams();
  const search = params.get("search") || "";
  const { data, isLoading } = usePublicVendors({ search: search || undefined });

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold mb-2">Vendors</h1>
      <p className="text-ink-700/60 mb-6">Browse independent shops selling on Marketto.</p>

      <div className="relative max-w-md mb-8">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-700/40" />
        <input
          className="input !pl-9"
          placeholder="Search vendors..."
          defaultValue={search}
          onChange={(e) => {
            const next = new URLSearchParams(params);
            if (e.target.value) next.set("search", e.target.value);
            else next.delete("search");
            setParams(next);
          }}
        />
      </div>

      {isLoading ? (
        <FullPageSpinner />
      ) : data && data.results.length > 0 ? (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {data.results.map((v) => (
            <Link key={v.id} to={`/vendors/${v.slug}`} className="card p-5 flex gap-4 items-start">
              <div className="w-14 h-14 rounded-full bg-brand-50 flex items-center justify-center overflow-hidden shrink-0">
                {v.logo ? <img src={v.logo} alt={v.shop_name} className="w-full h-full object-cover" /> : <Store className="w-6 h-6 text-brand-500" />}
              </div>
              <div>
                <div className="font-semibold">{v.shop_name}</div>
                <div className="text-xs text-ink-700/50 mb-1.5">{v.city}, {v.country}</div>
                <p className="text-sm text-ink-700/70 line-clamp-2">{v.description}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState icon={<Store className="w-12 h-12" />} title="No vendors found" />
      )}
    </div>
  );
}
