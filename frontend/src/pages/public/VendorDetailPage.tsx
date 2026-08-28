import { useParams } from "react-router-dom";
import { Store } from "lucide-react";
import { usePublicVendor } from "../../features/vendors/hooks";
import { useProducts } from "../../features/products/hooks";
import { ProductCard } from "../../features/products/ProductCard";
import { ProductCardSkeleton } from "../../components/ui/Skeleton";
import { FullPageSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";

export default function VendorDetailPage() {
  const { slug } = useParams();
  const { data: vendor, isLoading } = usePublicVendor(slug);
  const { data: products, isLoading: productsLoading } = useProducts({ vendor: slug, page_size: 24 });

  if (isLoading) return <FullPageSpinner />;
  if (!vendor) return <div className="container-page py-16 text-center">Vendor not found.</div>;

  return (
    <div>
      <div className="bg-surface border-b border-line">
        <div className="container-page py-10 flex items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-brand-50 flex items-center justify-center overflow-hidden shrink-0">
            {vendor.logo ? <img src={vendor.logo} alt={vendor.shop_name} className="w-full h-full object-cover" /> : <Store className="w-8 h-8 text-brand-500" />}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{vendor.shop_name}</h1>
            <p className="text-ink-700/60 text-sm mt-1">{vendor.city}, {vendor.country}</p>
            {vendor.description && <p className="text-ink-700 mt-2 max-w-xl">{vendor.description}</p>}
          </div>
        </div>
      </div>

      <div className="container-page py-8">
        <h2 className="text-lg font-bold mb-5">Products from {vendor.shop_name}</h2>
        {productsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        ) : products && products.results.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {products.results.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        ) : (
          <EmptyState title="No products yet" description="This vendor hasn't listed any products." />
        )}
      </div>
    </div>
  );
}
