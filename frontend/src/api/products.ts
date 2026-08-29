import { api } from "./client";
import type {
  PaginatedResponse,
  ProductListItem,
  ProductDetail,
  Category,
} from "../types";

export interface ProductQueryParams {
  search?: string;
  category?: string;
  vendor?: string;
  min_price?: number;
  max_price?: number;
  in_stock?: boolean;
  ordering?: string;
  page?: number;
  page_size?: number;
}

export interface ProductVariantPayload {
  color_name: string;
  color_code: string;
  size: string;
  sku: string;
  price: string | null;
  stock: number;
  is_active: boolean;
}

export const productsApi = {
  list: (params: ProductQueryParams) =>
    api.get<PaginatedResponse<ProductListItem>>(
      "/products/",
      { params }
    ),

  detail: (slug: string) =>
    api.get<ProductDetail>(
      `/products/${slug}/`
    ),

  categories: () =>
    api.get<PaginatedResponse<Category>>(
      "/categories/",
      {
        params: {
          page_size: 50,
        },
      }
    ),

  // -------------------------------------------------------
  // VENDOR PRODUCTS
  // -------------------------------------------------------

  vendorList: (
    params: Record<string, unknown> = {}
  ) =>
    api.get<PaginatedResponse<ProductDetail>>(
      "/vendor/products/",
      { params }
    ),

  vendorCreate: (
    payload: Record<string, unknown>
  ) =>
    api.post<ProductDetail>(
      "/vendor/products/",
      payload
    ),

  vendorUpdate: (
    id: string,
    payload: Record<string, unknown>
  ) =>
    api.patch<ProductDetail>(
      `/vendor/products/${id}/`,
      payload
    ),

  vendorDelete: (id: string) =>
    api.delete(
      `/vendor/products/${id}/`
    ),

  // -------------------------------------------------------
  // GENERAL PRODUCT IMAGES
  // -------------------------------------------------------

  vendorUploadImage: (
    id: string,
    file: File
  ) => {
    const form = new FormData();

    form.append("image", file);

    return api.post(
      `/vendor/products/${id}/images/`,
      form,
      {
        headers: {
          "Content-Type":
            "multipart/form-data",
        },
      }
    );
  },

  vendorDeleteImage: (
    productId: string,
    imageId: string
  ) =>
    api.delete(
      `/vendor/products/${productId}/images/${imageId}/`
    ),

  // -------------------------------------------------------
  // PRODUCT VARIANTS
  // -------------------------------------------------------

  vendorCreateVariant: (
    productId: string,
    payload: ProductVariantPayload
  ) =>
    api.post(
      `/vendor/products/${productId}/variants/`,
      payload
    ),

  vendorGetVariants: (
    productId: string
  ) =>
    api.get(
      `/vendor/products/${productId}/variants/`
    ),

  vendorUpdateVariant: (
    productId: string,
    variantId: string,
    payload: Partial<ProductVariantPayload>
  ) =>
    api.patch(
      `/vendor/products/${productId}/variants/${variantId}/`,
      payload
    ),

  vendorDeleteVariant: (
    productId: string,
    variantId: string
  ) =>
    api.delete(
      `/vendor/products/${productId}/variants/${variantId}/`
    ),

  // -------------------------------------------------------
  // VARIANT IMAGES
  // -------------------------------------------------------

  vendorUploadVariantImage: (
    productId: string,
    variantId: string,
    file: File
  ) => {
    const form = new FormData();

    form.append("image", file);

    return api.post(
      `/vendor/products/${productId}/variants/${variantId}/images/`,
      form,
      {
        headers: {
          "Content-Type":
            "multipart/form-data",
        },
      }
    );
  },

  vendorDeleteVariantImage: (
    productId: string,
    variantId: string,
    imageId: string
  ) =>
    api.delete(
      `/vendor/products/${productId}/variants/${variantId}/images/${imageId}/`
    ),

  // -------------------------------------------------------
  // ADMIN
  // -------------------------------------------------------

  adminList: (
    params: Record<string, unknown> = {}
  ) =>
    api.get<PaginatedResponse<ProductDetail>>(
      "/admin/products/",
      { params }
    ),

  adminUpdate: (
    id: string,
    payload: Record<string, unknown>
  ) =>
    api.patch<ProductDetail>(
      `/admin/products/${id}/`,
      payload
    ),
};