import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { useMyVendorProfile, useUpdateMyVendorProfile } from "../../features/vendors/hooks";
import { FullPageSpinner } from "../../components/ui/Spinner";
import { Spinner } from "../../components/ui/Spinner";
import { Badge, statusTone } from "../../components/ui/Badge";

interface ShopForm {
  shop_name: string;
  description: string;
  contact_email: string;
  contact_phone: string;
  address_line: string;
  city: string;
  country: string;
}

export default function VendorShopProfilePage() {
  const { data: vendor, isLoading } = useMyVendorProfile();
  const update = useUpdateMyVendorProfile();
  const { register, handleSubmit, reset } = useForm<ShopForm>();

  useEffect(() => {
    if (vendor) reset(vendor);
  }, [vendor, reset]);

  if (isLoading) return <FullPageSpinner />;

  return (
    <div className="max-w-xl">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold">Shop profile</h1>
        {vendor && <Badge tone={statusTone(vendor.status)}>{vendor.status}</Badge>}
      </div>

      <form onSubmit={handleSubmit((data) => update.mutate({ ...data }))} className="card p-5 space-y-3">
        <div>
          <label className="label">Shop name</label>
          <input className="input" {...register("shop_name")} />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input" rows={3} {...register("description")} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Contact email</label>
            <input className="input" {...register("contact_email")} />
          </div>
          <div>
            <label className="label">Contact phone</label>
            <input className="input" {...register("contact_phone")} />
          </div>
        </div>
        <div>
          <label className="label">Address</label>
          <input className="input" {...register("address_line")} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">City</label>
            <input className="input" {...register("city")} />
          </div>
          <div>
            <label className="label">Country</label>
            <input className="input" {...register("country")} />
          </div>
        </div>
        <button className="btn-primary" disabled={update.isPending}>
          {update.isPending && <Spinner className="w-4 h-4" />} Save changes
        </button>
      </form>
    </div>
  );
}
