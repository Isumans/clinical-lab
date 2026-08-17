import { apiRequest } from "@/services/api";
import type { AuthUser, LoginCredentials, LoginResponse } from "@/types/auth";

const TOKEN_KEY = "labsync_access_token";

export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  const response = await apiRequest<LoginResponse>("/auth/login", { method: "POST", body: JSON.stringify(credentials) });
  sessionStorage.setItem(TOKEN_KEY, response.access_token);
  return response;
}

export function getAccessToken(): string | null { return sessionStorage.getItem(TOKEN_KEY); }

export async function getCurrentUser(): Promise<AuthUser> {
  const token = getAccessToken();
  if (!token) throw new Error("Your session has expired.");
  return apiRequest<AuthUser>("/auth/me", { headers: { Authorization: `Bearer ${token}` } });
}

export async function logout(): Promise<void> {
  const token = getAccessToken();
  try {
    if (token) await apiRequest<void>("/auth/logout", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
  } finally {
    sessionStorage.removeItem(TOKEN_KEY);
  }
}

export async function changePassword(currentPassword:string,newPassword:string):Promise<void>{
  const token=getAccessToken();if(!token)throw new Error("Your session has expired.");
  return apiRequest<void>("/auth/change-password",{method:"POST",headers:{Authorization:`Bearer ${token}`},body:JSON.stringify({current_password:currentPassword,new_password:newPassword})});
}
