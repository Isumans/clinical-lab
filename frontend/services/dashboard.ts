import { getAccessToken } from "@/services/auth";
import { apiRequest } from "@/services/api";
import type { DashboardSummary } from "@/types/dashboard";

export function getDashboardSummary(): Promise<DashboardSummary> {
  const token = getAccessToken();
  if (!token) throw new Error("Your session has expired.");
  return apiRequest<DashboardSummary>("/dashboard/summary", { headers: { Authorization: `Bearer ${token}` } });
}
