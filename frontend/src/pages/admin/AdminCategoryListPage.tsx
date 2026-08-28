import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { categoriesApi } from "../../api/categories";
import { FullPageSpinner } from "../../components/ui/Spinner";
import { useToastStore } from "../../store/toastStore";
import { extractErrorMessage } from "../../api/client";

export default function AdminCategoryListPage() {
  const qc = useQueryClient();
  const push = useToastStore((s) => s.push);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => (await categoriesApi.list({ page_size: 100 })).data,
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await categoriesApi.create({ name: newName });
      setNewName("");
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
      push("Category created", "success");
    } catch (err) {
      push(extractErrorMessage(err), "error");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (slug: string, is_active: boolean) => {
    try {
      await categoriesApi.update(slug, { is_active: !is_active });
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
    } catch (err) {
      push(extractErrorMessage(err), "error");
    }
  };

  const handleDelete = async (slug: string) => {
    if (!confirm("Delete this category?")) return;
    try {
      await categoriesApi.remove(slug);
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
      push("Category deleted", "success");
    } catch (err) {
      push(extractErrorMessage(err), "error");
    }
  };

  return (
    <div>
      <h1 className="text-xl font-bold mb-5">Categories</h1>

      <form onSubmit={handleCreate} className="flex gap-2 mb-6 max-w-md">
        <input className="input" placeholder="New category name" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <button className="btn-primary shrink-0" disabled={creating}><Plus className="w-4 h-4" /> Add</button>
      </form>

      {isLoading ? <FullPageSpinner /> : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-canvas text-ink-700/60 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Name</th>
                <th className="text-left px-4 py-3 font-semibold">Products</th>
                <th className="text-left px-4 py-3 font-semibold">Active</th>
                <th className="text-right px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data?.results.map((cat) => (
                <tr key={cat.id}>
                  <td className="px-4 py-3 font-medium">{cat.name}</td>
                  <td className="px-4 py-3">{cat.product_count ?? 0}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleActive(cat.slug, cat.is_active)}
                      className={`badge ${cat.is_active ? "bg-brand-50 text-brand-600" : "bg-ink-900/6 text-ink-800"}`}
                    >
                      {cat.is_active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(cat.slug)} className="btn-secondary !py-1 !px-2.5 !text-red-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
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
