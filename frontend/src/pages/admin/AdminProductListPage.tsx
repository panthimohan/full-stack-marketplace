import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { productsApi } from "../../api/products";
import { FullPageSpinner } from "../../components/ui/Spinner";
import { Badge, statusTone } from "../../components/ui/Badge";
import { formatMoney } from "../../utils/format";
import { useToastStore } from "../../store/toastStore";
import { extractErrorMessage } from "../../api/client";
import { Pagination } from "../../components/ui/Pagination";

export default function AdminProductListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const qc = useQueryClient();
  const push = useToastStore((s) => s.push);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-products", page, search],
    queryFn: async () => (await productsApi.adminList({ page, search: search || undefined })).data,
  });

  const handleStatusToggle = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await productsApi.adminUpdate(id, { status: newStatus });
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      push(`Product marked ${newStatus.toLowerCase()}`, "success");
    } catch (err) {
      push(extractErrorMessage(err), "error");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold">All products</h1>
        <input className="input !w-64" placeholder="Search products..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>

      {isLoading ? <FullPageSpinner /> : (
        <>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-canvas text-ink-700/60 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Product</th>
                  <th className="text-left px-4 py-3 font-semibold">Vendor</th>
                  <th className="text-left px-4 py-3 font-semibold">Price</th>
                  <th className="text-left px-4 py-3 font-semibold">Stock</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                  <th className="text-right px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data?.results.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-ink-700/70">{p.vendor.shop_name}</td>
                    <td className="px-4 py-3">{formatMoney(p.price)}</td>
                    <td className="px-4 py-3">{p.stock}</td>
                    <td className="px-4 py-3"><Badge tone={statusTone(p.status)}>{p.status}</Badge></td>
                    <td className="px-4 py-3 text-right">
                      <button className="btn-secondary !py-1 !px-2.5 text-xs" onClick={() => handleStatusToggle(p.id, p.status)}>
                        {p.status === "ACTIVE" ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data && <Pagination currentPage={data.current_page} totalPages={data.total_pages} onPageChange={setPage} />}
        </>
      )}
    </div>
  );
}
