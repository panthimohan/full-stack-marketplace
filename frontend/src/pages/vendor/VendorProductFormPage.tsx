import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, X } from "lucide-react";
import { productsApi } from "../../api/products";
import { useCategories } from "../../features/products/hooks";
import { extractErrorMessage } from "../../api/client";
import { useToastStore } from "../../store/toastStore";
import { Spinner, FullPageSpinner } from "../../components/ui/Spinner";
import type { ProductDetail } from "../../types";

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

export default function VendorProductFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const push = useToastStore((s) => s.push);
  const { data: categories } = useCategories();
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<ProductForm>({
    defaultValues: { status: "ACTIVE" },
  });
  const [existing, setExisting] = useState<ProductDetail | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEdit && id) {
      import("../../api/client").then(({ api }) => {
        api.get(`/vendor/products/${id}/`).then((res) => {
          setExisting(res.data);
          reset({
            name: res.data.name, sku: res.data.sku, description: res.data.description,
            price: res.data.price, compare_at_price: res.data.compare_at_price || "",
            stock: res.data.stock, category: res.data.category.id, status: res.data.status,
          });
        });
      });
    }
  }, [id, isEdit, reset]);

  const onSubmit = async (data: ProductForm) => {
    try {
      const payload = { ...data, compare_at_price: data.compare_at_price || null };
      if (isEdit && id) {
        await productsApi.vendorUpdate(id, payload);
        push("Product updated", "success");
      } else {
        const res = await productsApi.vendorCreate(payload);
        push("Product created", "success");
        navigate(`/vendor/products/${res.data.id}/edit`);
      }
      qc.invalidateQueries({ queryKey: ["vendor-products"] });
    } catch (err) {
      push(extractErrorMessage(err), "error");
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!id) return;
    setUploading(true);
    try {
      await productsApi.vendorUploadImage(id, file);
      const { api } = await import("../../api/client");
      const res = await api.get(`/vendor/products/${id}/`);
      setExisting(res.data);
      push("Image uploaded", "success");
    } catch (err) {
      push(extractErrorMessage(err), "error");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!id) return;
    try {
      await productsApi.vendorDeleteImage(id, imageId);
      const { api } = await import("../../api/client");
      const res = await api.get(`/vendor/products/${id}/`);
      setExisting(res.data);
    } catch (err) {
      push(extractErrorMessage(err), "error");
    }
  };

  if (isEdit && !existing) return <FullPageSpinner />;

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold mb-6">{isEdit ? "Edit product" : "Add product"}</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="card p-5 space-y-4">
        <div>
          <label className="label">Product name</label>
          <input className="input" {...register("name", { required: true })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">SKU</label>
            <input className="input" {...register("sku", { required: true })} />
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input" {...register("category", { required: true })}>
              <option value="">Select category</option>
              {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input" rows={4} {...register("description")} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Price</label>
            <input className="input" type="number" step="0.01" {...register("price", { required: true })} />
          </div>
          <div>
            <label className="label">Compare-at price</label>
            <input className="input" type="number" step="0.01" {...register("compare_at_price")} />
          </div>
          <div>
            <label className="label">Stock</label>
            <input className="input" type="number" {...register("stock", { required: true, valueAsNumber: true })} />
          </div>
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" {...register("status")}>
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>

        <button className="btn-primary" disabled={isSubmitting}>
          {isSubmitting && <Spinner className="w-4 h-4" />} {isEdit ? "Save changes" : "Create product"}
        </button>
      </form>

      {isEdit && existing && (
        <div className="card p-5 mt-5">
          <h2 className="font-semibold mb-4">Product images</h2>
          <div className="flex flex-wrap gap-3 mb-4">
            {existing.images.map((img) => (
              <div key={img.id} className="relative w-24 h-24 rounded-lg overflow-hidden border border-line group">
                <img src={img.image} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => handleDeleteImage(img.id)}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          <input
            ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
            onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
          />
          <button className="btn-secondary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? <Spinner className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
            Upload image
          </button>
          <p className="text-xs text-ink-700/50 mt-2">JPEG, PNG, or WEBP. Max 5MB.</p>
        </div>
      )}
    </div>
  );
}
