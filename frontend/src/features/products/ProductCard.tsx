import { Link } from "react-router-dom";
import { ImageOff } from "lucide-react";
import type { ProductListItem } from "../../types";
import { formatMoney } from "../../utils/format";
import { Badge } from "../../components/ui/Badge";

export function ProductCard({ product }: { product: ProductListItem }) {
  const outOfStock = product.stock <= 0;
  return (
    <Link to={`/products/${product.slug}`} className="card overflow-hidden group flex flex-col">
      <div className="aspect-square w-full bg-canvas relative overflow-hidden">
        {product.primary_image ? (
          <img
            src={product.primary_image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ink-700/20">
            <ImageOff className="w-10 h-10" />
          </div>
        )}
        {outOfStock && (
          <span className="absolute top-2 right-2">
            <Badge tone="danger">Out of stock</Badge>
          </span>
        )}
      </div>
      <div className="p-3.5 flex flex-col gap-1 flex-1">
        <span className="text-xs text-ink-700/60 truncate">{product.vendor.shop_name}</span>
        <h3 className="text-sm font-medium text-ink-900 line-clamp-2 leading-snug">{product.name}</h3>
        <div className="mt-auto pt-1.5 flex items-baseline gap-2">
          <span className="font-display font-bold text-ink-900">{formatMoney(product.price)}</span>
          {product.compare_at_price && (
            <span className="text-xs text-ink-700/40 line-through">{formatMoney(product.compare_at_price)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
