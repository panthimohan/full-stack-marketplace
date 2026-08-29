export type Role = "ADMIN" | "VENDOR" | "CUSTOMER";

export interface User {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  role: Role;
  profile_image: string | null;
  is_email_verified: boolean;
  date_joined: string;
}

export type VendorStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED";

export interface VendorPublic {
  id: string;
  shop_name: string;
  slug: string;
  description: string;
  logo: string | null;
  city: string;
  country: string;
  created_at: string;
}

export interface Vendor extends VendorPublic {
  contact_email: string;
  contact_phone: string;
  address_line: string;
  status: VendorStatus;
  status_reason: string;
  approved_at: string | null;
  email: string;
  product_count?: number;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  parent: string | null;
  image: string | null;
  is_active: boolean;
  product_count?: number;
  created_at: string;
}

export type ProductStatus =
  | "DRAFT"
  | "ACTIVE"
  | "INACTIVE"
  | "OUT_OF_STOCK";

export interface ProductImage {
  id: string;
  image: string;
  alt_text: string;
  is_primary: boolean;
  sort_order: number;
  variant?: string | null;
}

export interface ProductVariant {
  id: string;

  // Variant options
  color_name: string;
  color_code: string;
  size: string;

  // Inventory / identification
  sku: string;
  stock: number;
  is_active: boolean;

  // Pricing
  price: string | null;
  effective_price: string;

  // Availability
  in_stock: boolean;

  // Images belonging specifically to this variant
  images: ProductImage[];

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface ProductListItem {
  id: string;
  name: string;
  slug: string;
  price: string;
  compare_at_price: string | null;
  stock: number;
  status: ProductStatus;
  vendor: VendorPublic;
  category: Category;
  primary_image: string | null;

  // Available because ProductListSerializer returns variants
  variants?: ProductVariant[];

  created_at: string;
}

export interface ProductDetail
  extends Omit<ProductListItem, "primary_image" | "variants"> {
  sku: string;
  description: string;

  // General product images
  images: ProductImage[];

  // Color/size variants and their images
  variants: ProductVariant[];

  updated_at: string;
}

export interface CartItem {
  id: string;
  product_id?: string;
  product_name: string;
  product_slug: string;
  unit_price: string;
  vendor_name: string;
  stock_available: number;
  quantity: number;
  line_total: string;
  image: string | null;
}

export interface Cart {
  id: string;
  items: CartItem[];
  subtotal: string;
  item_count: number;
  updated_at: string;
}

export type PaymentMethod = "COD" | "ESEWA";

export type PaymentStatus =
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "REFUNDED";

export type VendorOrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

export interface OrderItem {
  id: string;
  product: string | null;
  product_name: string;
  product_sku: string;
  vendor_name: string;
  unit_price: string;
  quantity: number;
  line_subtotal: string;
}

export interface VendorOrder {
  id: string;
  order_number: string;
  vendor_name: string;
  status: VendorOrderStatus;
  subtotal: string;
  items: OrderItem[];
  customer_name: string;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  shipping_full_name: string;
  shipping_phone: string;
  shipping_address: string;
  shipping_city: string;
  subtotal: string;
  shipping_cost: string;
  discount_total: string;
  total: string;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  overall_status: VendorOrderStatus;
  vendor_orders: VendorOrder[];
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiErrorShape {
  success: false;
  errors: Record<string, string[] | string>;
  status_code: number;
}