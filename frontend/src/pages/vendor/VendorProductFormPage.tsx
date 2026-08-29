import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Upload, X, Trash2 } from "lucide-react";

import { productsApi } from "../../api/products";
import { useCategories } from "../../features/products/hooks";
import { extractErrorMessage } from "../../api/client";
import { useToastStore } from "../../store/toastStore";
import { Spinner, FullPageSpinner } from "../../components/ui/Spinner";

import type {
  ProductDetail,
  ProductImage,
  ProductVariant,
} from "../../types";

interface ProductForm {
  name: string;
  sku: string;
  description: string;
  price: string;
  compare_at_price: string;
  stock: number;
  category: string;
  status: "DRAFT" | "ACTIVE" | "INACTIVE";
}

interface VariantForm {
  color_name: string;
  color_code: string;
  size: string;
  sku: string;
  price: string;
  stock: number;
  is_active: boolean;
}

const emptyVariant: VariantForm = {
  color_name: "",
  color_code: "#000000",
  size: "",
  sku: "",
  price: "",
  stock: 0,
  is_active: true,
};

export default function VendorProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const push = useToastStore((state) => state.push);
  const { data: categories } = useCategories();

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<ProductForm>({
    defaultValues: {
      name: "",
      sku: "",
      description: "",
      price: "",
      compare_at_price: "",
      stock: 0,
      category: "",
      status: "ACTIVE",
    },
  });

  const [existing, setExisting] =
    useState<ProductDetail | null>(null);

  const [uploading, setUploading] =
    useState(false);

  const [uploadingVariantImage, setUploadingVariantImage] =
    useState<string | null>(null);

  const [creatingVariant, setCreatingVariant] =
    useState(false);

  const [variantForm, setVariantForm] =
    useState<VariantForm>(emptyVariant);

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  const variantFileInputRefs =
    useRef<Record<string, HTMLInputElement | null>>({});

  // =========================================================
  // LOAD PRODUCT
  // =========================================================

  const loadProduct = async () => {
    if (!id) return;

    try {
      const response = await productsApi.vendorList({
        page_size: 100,
      });

      const product = response.data.results.find(
        (item) => item.id === id
      );

      if (!product) {
        throw new Error("Product not found.");
      }

      setExisting(product);

      reset({
        name: product.name,
        sku: product.sku,
        description: product.description,
        price: String(product.price),
        compare_at_price: product.compare_at_price
          ? String(product.compare_at_price)
          : "",
        stock: product.stock,
        category: product.category.id,
        status:
          product.status === "OUT_OF_STOCK"
            ? "INACTIVE"
            : product.status,
      });
    } catch (error) {
      push(
        extractErrorMessage(error),
        "error"
      );
    }
  };

  useEffect(() => {
    if (isEdit) {
      loadProduct();
    }
  }, [id, isEdit]);

  // =========================================================
  // CREATE / UPDATE PRODUCT
  // =========================================================

  const onSubmit = async (data: ProductForm) => {
    try {
      const payload = {
        ...data,
        compare_at_price:
          data.compare_at_price.trim() || null,
      };

      if (isEdit && id) {
        await productsApi.vendorUpdate(
          id,
          payload
        );

        await loadProduct();

        queryClient.invalidateQueries({
          queryKey: ["vendor-products"],
        });

        push(
          "Product updated successfully.",
          "success"
        );

        return;
      }

      const response =
        await productsApi.vendorCreate(
          payload
        );

      queryClient.invalidateQueries({
        queryKey: ["vendor-products"],
      });

      push(
        "Product created successfully. You can now upload images and add variants.",
        "success"
      );

      /*
       * IMPORTANT:
       * After creating the product, go directly to its
       * edit page instead of going back to the product list.
       *
       * This is what makes the image/variant sections
       * appear immediately after saving.
       */
      navigate(
        `/vendor/products/${response.data.id}/edit`
      );
    } catch (error) {
      push(
        extractErrorMessage(error),
        "error"
      );
    }
  };

  // =========================================================
  // PRODUCT IMAGES
  // =========================================================

  const handleMultipleImageUpload = async (
    files: FileList
  ) => {
    if (!id || files.length === 0) {
      return;
    }

    setUploading(true);

    try {
      const selectedFiles = Array.from(files);

      for (const file of selectedFiles) {
        await productsApi.vendorUploadImage(
          id,
          file
        );
      }

      await loadProduct();

      push(
        `${selectedFiles.length} product image${
          selectedFiles.length === 1 ? "" : "s"
        } uploaded successfully.`,
        "success"
      );
    } catch (error) {
      push(
        extractErrorMessage(error),
        "error"
      );
    } finally {
      setUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeleteImage = async (
    imageId: string
  ) => {
    if (!id) return;

    try {
      await productsApi.vendorDeleteImage(
        id,
        imageId
      );

      await loadProduct();

      push(
        "Product image deleted.",
        "success"
      );
    } catch (error) {
      push(
        extractErrorMessage(error),
        "error"
      );
    }
  };

  // =========================================================
  // VARIANT FORM
  // =========================================================

  const handleVariantFieldChange = (
    field: keyof VariantForm,
    value: string | number | boolean
  ) => {
    setVariantForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  // =========================================================
  // CREATE VARIANT
  // =========================================================

  const handleCreateVariant = async () => {
    if (!id) {
      return;
    }

    const hasColor =
      variantForm.color_name.trim().length > 0;

    const hasSize =
      variantForm.size.trim().length > 0;

    if (!hasColor && !hasSize) {
      push(
        "Enter a color or size for the variant.",
        "error"
      );
      return;
    }

    if (!variantForm.sku.trim()) {
      push(
        "Variant SKU is required.",
        "error"
      );
      return;
    }

    if (
      variantForm.stock < 0 ||
      Number.isNaN(variantForm.stock)
    ) {
      push(
        "Variant stock cannot be negative.",
        "error"
      );
      return;
    }

    setCreatingVariant(true);

    try {
      await productsApi.vendorCreateVariant(
        id,
        {
          color_name:
            variantForm.color_name.trim(),

          color_code:
            variantForm.color_code.trim(),

          size:
            variantForm.size.trim(),

          sku:
            variantForm.sku.trim(),

          price:
            variantForm.price.trim()
              ? variantForm.price.trim()
              : null,

          stock:
            Number(variantForm.stock),

          is_active:
            variantForm.is_active,
        }
      );

      setVariantForm({
        ...emptyVariant,
      });

      await loadProduct();

      push(
        "Variant created successfully.",
        "success"
      );
    } catch (error) {
      push(
        extractErrorMessage(error),
        "error"
      );
    } finally {
      setCreatingVariant(false);
    }
  };

  // =========================================================
  // DELETE VARIANT
  // =========================================================

  const handleDeleteVariant = async (
    variantId: string
  ) => {
    if (!id) {
      return;
    }

    const confirmed = window.confirm(
      "Delete this variant and its images?"
    );

    if (!confirmed) {
      return;
    }

    try {
      await productsApi.vendorDeleteVariant(
        id,
        variantId
      );

      await loadProduct();

      push(
        "Variant deleted successfully.",
        "success"
      );
    } catch (error) {
      push(
        extractErrorMessage(error),
        "error"
      );
    }
  };

  // =========================================================
  // VARIANT IMAGES
  // =========================================================

  const handleVariantImageUpload = async (
    variantId: string,
    files: FileList
  ) => {
    if (!id || files.length === 0) {
      return;
    }

    setUploadingVariantImage(
      variantId
    );

    try {
      const selectedFiles =
        Array.from(files);

      for (const file of selectedFiles) {
        await productsApi.vendorUploadVariantImage(
          id,
          variantId,
          file
        );
      }

      await loadProduct();

      push(
        `${selectedFiles.length} variant image${
          selectedFiles.length === 1
            ? ""
            : "s"
        } uploaded successfully.`,
        "success"
      );
    } catch (error) {
      push(
        extractErrorMessage(error),
        "error"
      );
    } finally {
      setUploadingVariantImage(null);

      const input =
        variantFileInputRefs.current[
          variantId
        ];

      if (input) {
        input.value = "";
      }
    }
  };

  const handleDeleteVariantImage = async (
    variantId: string,
    imageId: string
  ) => {
    if (!id) {
      return;
    }

    try {
      await productsApi.vendorDeleteVariantImage(
        id,
        variantId,
        imageId
      );

      await loadProduct();

      push(
        "Variant image deleted.",
        "success"
      );
    } catch (error) {
      push(
        extractErrorMessage(error),
        "error"
      );
    }
  };

  // =========================================================
  // IMAGE DISPLAY
  // =========================================================

  const renderImage = (
    image: ProductImage,
    onDelete: () => void
  ) => {
    return (
      <div
        key={image.id}
        className="relative w-24 h-24 rounded-lg overflow-hidden border border-line group"
      >
        <img
          src={image.image}
          alt={image.alt_text || ""}
          className="w-full h-full object-cover"
        />

        {image.is_primary && (
          <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center py-1">
            Primary
          </span>
        )}

        <button
          type="button"
          onClick={onDelete}
          className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Delete image"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (isEdit && !existing) {
    return <FullPageSpinner />;
  }

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="max-w-4xl pb-10">

      <h1 className="text-xl font-bold mb-6">
        {isEdit
          ? "Edit product"
          : "Add product"}
      </h1>

      {/* =====================================================
          PRODUCT DETAILS
      ====================================================== */}

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="card p-5 space-y-4"
      >
        <div>
          <label className="label">
            Product name
          </label>

          <input
            className="input"
            {...register("name", {
              required: true,
            })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">

          <div>
            <label className="label">
              SKU
            </label>

            <input
              className="input"
              {...register("sku", {
                required: true,
              })}
            />
          </div>

          <div>
            <label className="label">
              Category
            </label>

            <select
              className="input"
              {...register("category", {
                required: true,
              })}
            >
              <option value="">
                Select category
              </option>

              {categories?.map(
                (category) => (
                  <option
                    key={category.id}
                    value={category.id}
                  >
                    {category.name}
                  </option>
                )
              )}
            </select>
          </div>

        </div>

        <div>
          <label className="label">
            Description
          </label>

          <textarea
            className="input"
            rows={4}
            {...register("description")}
          />
        </div>

        <div className="grid grid-cols-3 gap-3">

          <div>
            <label className="label">
              Price
            </label>

            <input
              className="input"
              type="number"
              step="0.01"
              min="0"
              {...register("price", {
                required: true,
              })}
            />
          </div>

          <div>
            <label className="label">
              Compare-at price
            </label>

            <input
              className="input"
              type="number"
              step="0.01"
              min="0"
              {...register(
                "compare_at_price"
              )}
            />
          </div>

          <div>
            <label className="label">
              Stock
            </label>

            <input
              className="input"
              type="number"
              min="0"
              {...register("stock", {
                required: true,
                valueAsNumber: true,
              })}
            />
          </div>

        </div>

        <div>
          <label className="label">
            Status
          </label>

          <select
            className="input"
            {...register("status")}
          >
            <option value="DRAFT">
              Draft
            </option>

            <option value="ACTIVE">
              Active
            </option>

            <option value="INACTIVE">
              Inactive
            </option>
          </select>
        </div>

        <button
          type="submit"
          className="btn-primary"
          disabled={isSubmitting}
        >
          {isSubmitting && (
            <Spinner className="w-4 h-4" />
          )}

          {isEdit
            ? "Save changes"
            : "Create product"}
        </button>
      </form>

      {/* =====================================================
          EDIT-ONLY FEATURES
      ====================================================== */}

      {isEdit && existing && (
        <>
          {/* =================================================
              PRODUCT IMAGES
          ================================================== */}

          <div className="card p-5 mt-5">

            <div className="flex items-center justify-between mb-4">

              <div>
                <h2 className="font-semibold">
                  Product images
                </h2>

                <p className="text-xs text-ink-700/50 mt-1">
                  General images for the product.
                </p>
              </div>

              <span className="text-xs text-ink-700/50">
                {existing.images.length} image
                {existing.images.length === 1
                  ? ""
                  : "s"}
              </span>

            </div>

            {existing.images.length > 0 && (
              <div className="flex flex-wrap gap-3 mb-4">
                {existing.images.map(
                  (image) =>
                    renderImage(
                      image,
                      () =>
                        handleDeleteImage(
                          image.id
                        )
                    )
                )}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(event) => {
                if (event.target.files) {
                  handleMultipleImageUpload(
                    event.target.files
                  );
                }
              }}
            />

            <button
              type="button"
              className="btn-secondary"
              onClick={() =>
                fileInputRef.current?.click()
              }
              disabled={uploading}
            >
              {uploading ? (
                <Spinner className="w-4 h-4" />
              ) : (
                <Upload className="w-4 h-4" />
              )}

              {uploading
                ? "Uploading..."
                : "Upload images"}
            </button>

            <p className="text-xs text-ink-700/50 mt-2">
              Select multiple JPEG, PNG, or WEBP
              images. Maximum 5MB per image.
            </p>

          </div>

          {/* =================================================
              PRODUCT VARIANTS
          ================================================== */}

          <div className="card p-5 mt-5">

            <div className="flex items-center justify-between mb-4">

              <div>
                <h2 className="font-semibold">
                  Product variants
                </h2>

                <p className="text-xs text-ink-700/50 mt-1">
                  Add colors, sizes, SKUs,
                  prices and separate stock.
                </p>
              </div>

              <span className="text-xs text-ink-700/50">
                {existing.variants?.length || 0} variant
                {(existing.variants?.length || 0) === 1
                  ? ""
                  : "s"}
              </span>

            </div>

            {/* =================================================
                EXISTING VARIANTS
            ================================================== */}

            {existing.variants &&
              existing.variants.length > 0 && (

                <div className="space-y-5 mb-6">

                  {existing.variants.map(
                    (
                      variant: ProductVariant
                    ) => (

                      <div
                        key={variant.id}
                        className="border border-line rounded-lg p-4"
                      >

                        <div className="flex items-start justify-between gap-4">

                          <div>

                            <div className="flex items-center gap-2">

                              {variant.color_code && (
                                <span
                                  className="w-5 h-5 rounded-full border border-line"
                                  style={{
                                    backgroundColor:
                                      variant.color_code,
                                  }}
                                />
                              )}

                              <span className="font-medium">
                                {[
                                  variant.color_name,
                                  variant.size,
                                ]
                                  .filter(Boolean)
                                  .join(" / ") ||
                                  variant.sku}
                              </span>

                            </div>

                            <div className="text-xs text-ink-700/50 mt-1">
                              SKU: {variant.sku}
                            </div>

                            <div className="text-xs text-ink-700/50">
                              Stock: {variant.stock}
                            </div>

                            <div className="text-xs text-ink-700/50">
                              Price: $
                              {variant.effective_price}
                            </div>

                            <div className="text-xs mt-1">
                              {variant.is_active ? (
                                <span className="text-green-600">
                                  Active
                                </span>
                              ) : (
                                <span className="text-red-600">
                                  Inactive
                                </span>
                              )}
                            </div>

                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteVariant(
                                variant.id
                              )
                            }
                            className="text-red-600 hover:text-red-700"
                            title="Delete variant"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                        </div>

                        {/* =====================================
                            VARIANT IMAGES
                        ====================================== */}

                        <div className="mt-4">

                          <div className="flex flex-wrap gap-3 mb-3">

                            {variant.images.map(
                              (image) =>
                                renderImage(
                                  image,
                                  () =>
                                    handleDeleteVariantImage(
                                      variant.id,
                                      image.id
                                    )
                                )
                            )}

                          </div>

                          <input
                            ref={(element) => {
                              variantFileInputRefs.current[
                                variant.id
                              ] = element;
                            }}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            multiple
                            className="hidden"
                            onChange={(event) => {
                              if (
                                event.target.files
                              ) {
                                handleVariantImageUpload(
                                  variant.id,
                                  event.target.files
                                );
                              }
                            }}
                          />

                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() =>
                              variantFileInputRefs.current[
                                variant.id
                              ]?.click()
                            }
                            disabled={
                              uploadingVariantImage ===
                              variant.id
                            }
                          >
                            {uploadingVariantImage ===
                            variant.id ? (
                              <Spinner className="w-4 h-4" />
                            ) : (
                              <Upload className="w-4 h-4" />
                            )}

                            {uploadingVariantImage ===
                            variant.id
                              ? "Uploading..."
                              : "Upload color images"}
                          </button>

                          <p className="text-xs text-ink-700/50 mt-2">
                            Select multiple images
                            for this variant.
                          </p>

                        </div>

                      </div>
                    )
                  )}

                </div>
              )}

            {/* =================================================
                ADD VARIANT
            ================================================== */}

            <div className="border-t border-line pt-5">

              <h3 className="font-medium mb-4">
                Add variant
              </h3>

              <div className="grid grid-cols-2 gap-3">

                <div>
                  <label className="label">
                    Color name
                  </label>

                  <input
                    className="input"
                    placeholder="Red"
                    value={
                      variantForm.color_name
                    }
                    onChange={(event) =>
                      handleVariantFieldChange(
                        "color_name",
                        event.target.value
                      )
                    }
                  />
                </div>

                <div>
                  <label className="label">
                    Color
                  </label>

                  <div className="flex gap-2">

                    <input
                      type="color"
                      className="h-10 w-14"
                      value={
                        variantForm.color_code
                      }
                      onChange={(event) =>
                        handleVariantFieldChange(
                          "color_code",
                          event.target.value
                        )
                      }
                    />

                    <input
                      className="input"
                      placeholder="#FF0000"
                      value={
                        variantForm.color_code
                      }
                      onChange={(event) =>
                        handleVariantFieldChange(
                          "color_code",
                          event.target.value
                        )
                      }
                    />

                  </div>
                </div>

                <div>
                  <label className="label">
                    Size
                  </label>

                  <input
                    className="input"
                    placeholder="M"
                    value={
                      variantForm.size
                    }
                    onChange={(event) =>
                      handleVariantFieldChange(
                        "size",
                        event.target.value
                      )
                    }
                  />
                </div>

                <div>
                  <label className="label">
                    Variant SKU
                  </label>

                  <input
                    className="input"
                    placeholder="SHIRT-RED-M"
                    value={
                      variantForm.sku
                    }
                    onChange={(event) =>
                      handleVariantFieldChange(
                        "sku",
                        event.target.value
                      )
                    }
                  />
                </div>

                <div>
                  <label className="label">
                    Variant price
                  </label>

                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="29.99"
                    value={
                      variantForm.price
                    }
                    onChange={(event) =>
                      handleVariantFieldChange(
                        "price",
                        event.target.value
                      )
                    }
                  />
                </div>

                <div>
                  <label className="label">
                    Variant stock
                  </label>

                  <input
                    className="input"
                    type="number"
                    min="0"
                    value={
                      variantForm.stock
                    }
                    onChange={(event) =>
                      handleVariantFieldChange(
                        "stock",
                        Number(
                          event.target.value
                        )
                      )
                    }
                  />
                </div>

              </div>

              <label className="flex items-center gap-2 mt-4 text-sm">

                <input
                  type="checkbox"
                  checked={
                    variantForm.is_active
                  }
                  onChange={(event) =>
                    handleVariantFieldChange(
                      "is_active",
                      event.target.checked
                    )
                  }
                />

                Active variant

              </label>

              <button
                type="button"
                className="btn-primary mt-4"
                onClick={
                  handleCreateVariant
                }
                disabled={
                  creatingVariant
                }
              >
                {creatingVariant ? (
                  <Spinner className="w-4 h-4" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}

                {creatingVariant
                  ? "Creating..."
                  : "Add variant"}
              </button>

            </div>

          </div>
        </>
      )}
    </div>
  );
}