import { useForm } from "react-hook-form";
import { useAuthStore } from "../../store/authStore";
import { authApi } from "../../api/auth";
import { extractErrorMessage } from "../../api/client";
import { useToastStore } from "../../store/toastStore";
import { useState } from "react";
import { Spinner } from "../../components/ui/Spinner";

interface ProfileForm {
  first_name: string;
  last_name: string;
  phone_number: string;
}

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const push = useToastStore((s) => s.push);
  const { register, handleSubmit } = useForm<ProfileForm>({
    defaultValues: {
      first_name: user?.first_name || "", last_name: user?.last_name || "", phone_number: user?.phone_number || "",
    },
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const onSaveProfile = async (data: ProfileForm) => {
    setSavingProfile(true);
    try {
      const res = await authApi.updateProfile(data);
      setUser(res.data);
      push("Profile updated", "success");
    } catch (err) {
      push(extractErrorMessage(err), "error");
    } finally {
      setSavingProfile(false);
    }
  };

  const onChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPassword(true);
    try {
      await authApi.changePassword(oldPassword, newPassword);
      push("Password changed", "success");
      setOldPassword("");
      setNewPassword("");
    } catch (err) {
      push(extractErrorMessage(err), "error");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <h1 className="text-xl font-bold mb-5">Profile</h1>
        <form onSubmit={handleSubmit(onSaveProfile)} className="card p-5 space-y-3">
          <div>
            <label className="label">Email</label>
            <input className="input opacity-60" value={user?.email} disabled />
          </div>
          <div>
            <label className="label">First name</label>
            <input className="input" {...register("first_name")} />
          </div>
          <div>
            <label className="label">Last name</label>
            <input className="input" {...register("last_name")} />
          </div>
          <div>
            <label className="label">Phone number</label>
            <input className="input" {...register("phone_number")} />
          </div>
          <button className="btn-primary" disabled={savingProfile}>
            {savingProfile && <Spinner className="w-4 h-4" />} Save changes
          </button>
        </form>
      </div>

      <div>
        <h2 className="text-lg font-bold mb-5">Change password</h2>
        <form onSubmit={onChangePassword} className="card p-5 space-y-3">
          <div>
            <label className="label">Current password</label>
            <input className="input" type="password" required value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
          </div>
          <div>
            <label className="label">New password</label>
            <input className="input" type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <button className="btn-primary" disabled={savingPassword}>
            {savingPassword && <Spinner className="w-4 h-4" />} Update password
          </button>
        </form>
      </div>
    </div>
  );
}
