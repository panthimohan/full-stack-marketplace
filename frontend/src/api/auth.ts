import { api } from "./client";
import type { User } from "../types";

export const authApi = {
  register: (payload: {
    email: string; username: string; password: string; password_confirm: string;
    first_name?: string; last_name?: string; phone_number?: string;
    role: "CUSTOMER" | "VENDOR"; shop_name?: string;
  }) => api.post<{ user: User; access: string; refresh: string }>("/auth/register/", payload),

  login: (email: string, password: string) =>
    api.post<{ access: string; refresh: string; user: User }>("/auth/login/", { email, password }),

  logout: (refresh: string) => api.post("/auth/logout/", { refresh }),

  me: () => api.get<User>("/auth/me/"),

  updateProfile: (payload: Partial<User>) => api.patch<User>("/auth/me/", payload),

  changePassword: (old_password: string, new_password: string) =>
    api.post("/auth/change-password/", { old_password, new_password }),

  requestPasswordReset: (email: string) => api.post("/auth/password-reset/", { email }),

  confirmPasswordReset: (token: string, new_password: string) =>
    api.post("/auth/password-reset/confirm/", { token, new_password }),
};
