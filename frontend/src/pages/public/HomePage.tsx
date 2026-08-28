import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, Truck, Store } from "lucide-react";
import { useProducts } from "../../features/products/hooks";
import { useCategories } from "../../features/products/hooks";
import { usePublicVendors } from "../../features/vendors/hooks";
import { ProductCard } from "../../features/products/ProductCard";
import { ProductCardSkeleton } from "../../components/ui/Skeleton";

export default function HomePage() {
  const { data: featured, isLoading } = useProducts({ ordering: "-created_at", page_size: 8 });
  const { data: categories } = useCategories();
  const { data: vendors } = usePublicVendors({ page_size: 4 });

  return (
    <div>
      <section className="bg-ink-900 text-white">
        <div className="container-page py-16 sm:py-20 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="badge bg-white/10 text-brand-100 mb-4">Multi-vendor marketplace</span>
            <h1 className="text-3xl sm:text-5xl font-bold leading-tight mb-4">
              One storefront. <span className="text-clay-400">Hundreds</span> of independent shops.
            </h1>
            <p className="text-white/70 text-lg mb-8 max-w-md">
              Browse products from vetted, independent vendors, check out once, and pay with
              Cash on Delivery or eSewa.
            </p>
            <div className="flex gap-3">
              <Link to="/products" className="btn-primary !px-6 !py-3">
                Start shopping <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/register?role=VENDOR" className="btn-secondary !px-6 !py-3 !bg-transparent !text-white !border-white/20 hover:!bg-white/10">
                Sell on Marketto
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: <ShieldCheck className="w-5 h-5" />, title: "Vetted vendors", desc: "Every shop is reviewed before it can sell." },
              { icon: <Truck className="w-5 h-5" />, title: "Flexible checkout", desc: "Cash on Delivery or eSewa, your choice." },
              { icon: <Store className="w-5 h-5" />, title: "One cart, many shops", desc: "Buy from several vendors in a single order." },
              { icon: <ArrowRight className="w-5 h-5" />, title: "Order tracking", desc: "Track every vendor's part of your order." },
            ].map((f) => (
              <div key={f.title} className="bg-white/5 border border-white/10 rounded-card p-4">
                <div className="text-clay-400 mb-2">{f.icon}</div>
                <div className="font-semibold text-sm mb-1">{f.title}</div>
                <div className="text-white/60 text-xs">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {categories && categories.length > 0 && (
        <section className="container-page py-12">
          <h2 className="text-xl font-bold mb-5">Shop by category</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {categories.slice(0, 5).map((cat) => (
              <Link key={cat.id} to={`/products?category=${cat.slug}`} className="card p-4 text-center hover:border-brand-400 transition-colors">
                <div className="font-medium text-sm">{cat.name}</div>
                <div className="text-xs text-ink-700/50 mt-0.5">{cat.product_count ?? 0} products</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="container-page py-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold">Newest arrivals</h2>
          <Link to="/products" className="text-sm font-medium text-brand-500 flex items-center gap-1">
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)
            : featured?.results.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {vendors && vendors.results.length > 0 && (
        <section className="container-page py-12">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold">Featured vendors</h2>
            <Link to="/vendors" className="text-sm font-medium text-brand-500 flex items-center gap-1">
              All vendors <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {vendors.results.map((v) => (
              <Link key={v.id} to={`/vendors/${v.slug}`} className="card p-4 flex flex-col items-center text-center gap-2">
                <div className="w-14 h-14 rounded-full bg-brand-50 flex items-center justify-center overflow-hidden">
                  {v.logo ? <img src={v.logo} alt={v.shop_name} className="w-full h-full object-cover" /> : <Store className="w-6 h-6 text-brand-500" />}
                </div>
                <div className="font-medium text-sm">{v.shop_name}</div>
                <div className="text-xs text-ink-700/50">{v.city}</div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
