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
  ForgotPasswordResponse,
  ResetPasswordResponse,
} from "../types";

export const authApi = {
  // Public endpoints (skipAuth = true)
  checkName: (name: string) =>
    request<CheckNameResponse>("/auth/check-name", {
      method: "POST",
      body: JSON.stringify({ name }),
    }, true),

  register: (data: RegisterData) =>
    request<RegisterResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }, true),

  verifyEmail: (token: string) =>
    request<VerifyEmailResponse>("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    }, true),

  resendVerification: (email: string) =>
    request<RegisterResponse>("/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email }),
    }, true),

  forgotPassword: (email: string) =>
    request<ForgotPasswordResponse>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }, true),

  resetPassword: (token: string, newPin: string) =>
    request<ResetPasswordResponse>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, new_pin: newPin }),
    }, true),

  registerSeller: (data: RegisterSellerData) =>
    request<TokenResponse>("/auth/register-seller", {
      method: "POST",
      body: JSON.stringify(data),
    }, true),

  login: (phone: string, pin: string) =>
    request<TokenResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ phone, pin }),
    }, true),

  refresh: (refreshToken: string) =>
    request<TokenResponse>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    }, true),

  me: () => request<UserResponse>("/auth/me"),

  // Silent version that doesn't trigger logout on failure (for initial auth check)
  meSilent: () => request<UserResponse>("/auth/me", {}, false, true),

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
