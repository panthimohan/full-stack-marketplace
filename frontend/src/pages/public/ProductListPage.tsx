import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SlidersHorizontal, PackageSearch } from "lucide-react";
import { useProducts, useCategories } from "../../features/products/hooks";
import { ProductCard } from "../../features/products/ProductCard";
import { ProductCardSkeleton } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { Pagination } from "../../components/ui/Pagination";

export default function ProductListPage() {
  const [params, setParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);

  const page = parseInt(params.get("page") || "1", 10);
  const search = params.get("search") || "";
  const category = params.get("category") || "";
  const ordering = params.get("ordering") || "-created_at";
  const minPrice = params.get("min_price") || "";
  const maxPrice = params.get("max_price") || "";
  const inStock = params.get("in_stock") === "true";

  const { data, isLoading, isFetching } = useProducts({
    search: search || undefined,
    category: category || undefined,
    ordering,
    min_price: minPrice ? Number(minPrice) : undefined,
    max_price: maxPrice ? Number(maxPrice) : undefined,
    in_stock: inStock || undefined,
    page,
  });
  const { data: categories } = useCategories();

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    setParams(next);
  };

  return (
    <div className="container-page py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">All products</h1>
          {data && <p className="text-sm text-ink-700/60 mt-1">{data.count} results{search && ` for "${search}"`}</p>}
        </div>
        <button className="btn-secondary lg:hidden" onClick={() => setShowFilters(!showFilters)}>
          <SlidersHorizontal className="w-4 h-4" /> Filters
        </button>
      </div>

      <div className="grid lg:grid-cols-[240px_1fr] gap-8">
        <aside className={`${showFilters ? "block" : "hidden"} lg:block space-y-6`}>
          <div>
            <h3 className="font-semibold text-sm mb-2.5">Category</h3>
            <div className="space-y-1">
              <button
                onClick={() => updateParam("category", "")}
                className={`block w-full text-left text-sm px-2 py-1.5 rounded-md ${!category ? "bg-brand-50 text-brand-600 font-medium" : "text-ink-700 hover:bg-black/5"}`}
              >
                All categories
              </button>
              {categories?.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => updateParam("category", cat.slug)}
                  className={`block w-full text-left text-sm px-2 py-1.5 rounded-md ${category === cat.slug ? "bg-brand-50 text-brand-600 font-medium" : "text-ink-700 hover:bg-black/5"}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-sm mb-2.5">Price range</h3>
            <div className="flex items-center gap-2">
              <input
                type="number" placeholder="Min" className="input !py-1.5"
                defaultValue={minPrice}
                onBlur={(e) => updateParam("min_price", e.target.value)}
              />
              <span className="text-ink-700/40">–</span>
              <input
                type="number" placeholder="Max" className="input !py-1.5"
                defaultValue={maxPrice}
                onBlur={(e) => updateParam("max_price", e.target.value)}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={inStock} onChange={(e) => updateParam("in_stock", e.target.checked ? "true" : "")} />
            In stock only
          </label>
        </aside>

        <div>
          <div className="flex justify-end mb-4">
            <select className="input !w-auto !py-1.5 text-sm" value={ordering} onChange={(e) => updateParam("ordering", e.target.value)}>
              <option value="-created_at">Newest</option>
              <option value="price">Price: low to high</option>
              <option value="-price">Price: high to low</option>
              <option value="name">Name: A-Z</option>
            </select>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {Array.from({ length: 9 }).map((_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          ) : data && data.results.length > 0 ? (
            <>
              <div className={`grid grid-cols-2 sm:grid-cols-3 gap-4 ${isFetching ? "opacity-60" : ""}`}>
                {data.results.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
              <Pagination
                currentPage={data.current_page}
                totalPages={data.total_pages}
                onPageChange={(p) => updateParam("page", String(p))}
              />
            </>
          ) : (
            <EmptyState
              icon={<PackageSearch className="w-12 h-12" />}
              title="No products found"
              description="Try adjusting your filters or search terms."
            />
          )}
        </div>
      </div>
    </div>
  );
}
