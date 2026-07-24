// Auth API endpoints

import { request } from "../client";
import type {
  CheckNameResponse,
  TokenResponse,
  UserResponse,
  ChainSettingsResponse,
  ChainSettingsUpdate,
  RegisterData,
  RegisterResponse,
  RegisterSellerData,
  ProfileUpdate,
  ChangePinRequest,
  VerifyEmailResponse,
} from "../types";

export const authApi = {
  checkName: (name: string) =>
    request<CheckNameResponse>("/auth/check-name", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  register: (data: RegisterData) =>
    request<RegisterResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  verifyEmail: (token: string) =>
    request<VerifyEmailResponse>("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),

  resendVerification: (email: string) =>
    request<RegisterResponse>("/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  registerSeller: (data: RegisterSellerData) =>
    request<TokenResponse>("/auth/register-seller", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  login: (phone: string, pin: string) =>
    request<TokenResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ phone, pin }),
    }),

  refresh: (refreshToken: string) =>
    request<TokenResponse>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    }),

  me: () => request<UserResponse>("/auth/me"),

  updateProfile: (data: ProfileUpdate) =>
    request<UserResponse>("/auth/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  changePin: (data: ChangePinRequest) =>
    request<{ message: string }>("/auth/me/change-pin", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getChainSettings: () =>
    request<ChainSettingsResponse>("/auth/chain/settings"),

  updateChainSettings: (data: ChainSettingsUpdate) =>
    request<ChainSettingsResponse>("/auth/chain/settings", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  // Chain logo upload
  requestLogoUpload: (contentType: string) =>
    request<{ upload_url: string; object_key: string }>("/auth/chain/logo/upload-url", {
      method: "POST",
      body: JSON.stringify({ content_type: contentType }),
    }),

  confirmLogoUpload: (objectKey: string) =>
    request<ChainSettingsResponse>("/auth/chain/logo", {
      method: "POST",
      body: JSON.stringify({ object_key: objectKey }),
    }),

  uploadLogo: async (file: File): Promise<ChainSettingsResponse> => {
    // Get presigned URL
    const { upload_url, object_key } = await authApi.requestLogoUpload(file.type);

    // Upload file directly to storage
    await fetch(upload_url, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
    });

    // Confirm upload and update branding
    return authApi.confirmLogoUpload(object_key);
  },
};
