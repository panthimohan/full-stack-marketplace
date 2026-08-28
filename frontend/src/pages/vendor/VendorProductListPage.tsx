import { Link } from "react-router-dom";
import { Plus, Package, Pencil, Trash2 } from "lucide-react";
import { useVendorProducts } from "../../features/products/hooks";
import { productsApi } from "../../api/products";
import { useQueryClient } from "@tanstack/react-query";
import { FullPageSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { Badge, statusTone } from "../../components/ui/Badge";
import { formatMoney } from "../../utils/format";
import { useToastStore } from "../../store/toastStore";
import { extractErrorMessage } from "../../api/client";

export default function VendorProductListPage() {
  const { data, isLoading } = useVendorProducts();
  const qc = useQueryClient();
  const push = useToastStore((s) => s.push);

  const handleDelete = async (id: string) => {
    if (!confirm("Archive this product? It will no longer be visible to customers.")) return;
    try {
      await productsApi.vendorDelete(id);
      qc.invalidateQueries({ queryKey: ["vendor-products"] });
      push("Product archived", "success");
    } catch (err) {
      push(extractErrorMessage(err), "error");
    }
  };

  if (isLoading) return <FullPageSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">My products</h1>
        <Link to="/vendor/products/new" className="btn-primary">
          <Plus className="w-4 h-4" /> Add product
        </Link>
      </div>

      {!data || data.results.length === 0 ? (
        <EmptyState
          icon={<Package className="w-12 h-12" />}
          title="No products yet"
          description="Add your first product to start selling."
          action={<Link to="/vendor/products/new" className="btn-primary">Add product</Link>}
        />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-canvas text-ink-700/60 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Product</th>
                <th className="text-left px-4 py-3 font-semibold">Price</th>
                <th className="text-left px-4 py-3 font-semibold">Stock</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-right px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.results.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3">{formatMoney(p.price)}</td>
                  <td className="px-4 py-3">{p.stock}</td>
                  <td className="px-4 py-3"><Badge tone={statusTone(p.status)}>{p.status}</Badge></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Link to={`/vendor/products/${p.id}/edit`} className="btn-secondary !px-2.5 !py-1.5">
                        <Pencil className="w-3.5 h-3.5" />
                      </Link>
                      <button onClick={() => handleDelete(p.id)} className="btn-secondary !px-2.5 !py-1.5 !text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
