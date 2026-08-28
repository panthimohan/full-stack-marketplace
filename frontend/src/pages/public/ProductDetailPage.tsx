import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ImageOff, Minus, Plus, ShoppingCart, Store } from "lucide-react";
import { useProduct } from "../../features/products/hooks";
import { useAddToCart } from "../../features/cart/hooks";
import { useAuthStore } from "../../store/authStore";
import { useToastStore } from "../../store/toastStore";
import { FullPageSpinner } from "../../components/ui/Spinner";
import { Badge } from "../../components/ui/Badge";
import { formatMoney } from "../../utils/format";
import { useNavigate } from "react-router-dom";

export default function ProductDetailPage() {
  const { slug } = useParams();
  const { data: product, isLoading } = useProduct(slug);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const addToCart = useAddToCart();
  const { isAuthenticated, user } = useAuthStore();
  const push = useToastStore((s) => s.push);
  const navigate = useNavigate();

  if (isLoading) return <FullPageSpinner />;
  if (!product) return <div className="container-page py-16 text-center">Product not found.</div>;

  const outOfStock = product.stock <= 0;
  const image = product.images[activeImage];

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      push("Please log in to add items to your cart.", "info");
      navigate("/login");
      return;
    }
    if (user?.role !== "CUSTOMER") {
      push("Only customer accounts can shop.", "error");
      return;
    }
    addToCart.mutate({ productId: product.id, quantity });
  };

  return (
    <div className="container-page py-8">
      <nav className="text-sm text-ink-700/60 mb-6">
        <Link to="/products" className="hover:text-brand-500">Products</Link>
        <span className="mx-2">/</span>
        <Link to={`/products?category=${product.category.slug}`} className="hover:text-brand-500">{product.category.name}</Link>
      </nav>

      <div className="grid md:grid-cols-2 gap-10">
        <div>
          <div className="aspect-square bg-canvas rounded-card overflow-hidden border border-line">
            {image ? (
              <img src={image.image} alt={image.alt_text || product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-ink-700/20">
                <ImageOff className="w-16 h-16" />
              </div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-2 mt-3">
              {product.images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImage(i)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 ${i === activeImage ? "border-brand-500" : "border-line"}`}
                >
                  <img src={img.image} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <Link to={`/vendors/${product.vendor.slug}`} className="inline-flex items-center gap-1.5 text-sm text-brand-600 font-medium mb-2">
            <Store className="w-4 h-4" /> {product.vendor.shop_name}
          </Link>
          <h1 className="text-2xl font-bold mb-3">{product.name}</h1>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl font-display font-bold">{formatMoney(product.price)}</span>
            {product.compare_at_price && (
              <span className="text-lg text-ink-700/40 line-through">{formatMoney(product.compare_at_price)}</span>
            )}
          </div>

          <div className="mb-6">
            {outOfStock ? (
              <Badge tone="danger">Out of stock</Badge>
            ) : product.stock <= 5 ? (
              <Badge tone="warning">Only {product.stock} left in stock</Badge>
            ) : (
              <Badge tone="success">In stock</Badge>
            )}
          </div>

          <p className="text-ink-700 leading-relaxed mb-8 whitespace-pre-line">{product.description}</p>

          {!outOfStock && (
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center border border-line rounded-lg">
                <button className="p-2.5" onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-10 text-center font-medium">{quantity}</span>
                <button className="p-2.5" onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))} aria-label="Increase quantity">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <button
            className="btn-primary !py-3 !px-6 w-full sm:w-auto"
            disabled={outOfStock || addToCart.isPending}
            onClick={handleAddToCart}
          >
            <ShoppingCart className="w-4 h-4" />
            {outOfStock ? "Out of stock" : "Add to cart"}
          </button>

          <dl className="mt-8 pt-6 border-t border-line text-sm space-y-2">
            <div className="flex justify-between">
              <dt className="text-ink-700/60">SKU</dt>
              <dd className="font-medium">{product.sku}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-700/60">Category</dt>
              <dd className="font-medium">{product.category.name}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
