import { getAccessToken } from "@/services/auth";
import { apiRequest } from "@/services/api";
import type { LaboratoryTest, LaboratoryTestFilters, LaboratoryTestInput, LaboratoryTestListResponse, LaboratoryTestStatus } from "@/types/laboratory-test";

function authHeaders(): HeadersInit {
  const token = getAccessToken();
  if (!token) throw new Error("Your session has expired.");
  return { Authorization: `Bearer ${token}` };
}

export function listLaboratoryTests(filters: LaboratoryTestFilters): Promise<LaboratoryTestListResponse> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== "") params.set(key, String(value)); });
  return apiRequest<LaboratoryTestListResponse>(`/tests?${params}`, { headers: authHeaders() });
}

export function getLaboratoryTest(id: number): Promise<LaboratoryTest> { return apiRequest<LaboratoryTest>(`/tests/${id}`, { headers: authHeaders() }); }
export function createLaboratoryTest(payload: LaboratoryTestInput): Promise<LaboratoryTest> { return apiRequest<LaboratoryTest>("/tests", { method: "POST", headers: authHeaders(), body: JSON.stringify(payload) }); }
export function updateLaboratoryTest(id: number, payload: LaboratoryTestInput): Promise<LaboratoryTest> { return apiRequest<LaboratoryTest>(`/tests/${id}`, { method: "PUT", headers: authHeaders(), body: JSON.stringify(payload) }); }
export function updateLaboratoryTestStatus(id: number, status: LaboratoryTestStatus): Promise<LaboratoryTest> { return apiRequest<LaboratoryTest>(`/tests/${id}/status`, { method: "PATCH", headers: authHeaders(), body: JSON.stringify({ status }) }); }
