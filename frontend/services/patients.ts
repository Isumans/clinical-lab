import { getAccessToken } from "@/services/auth";
import { apiRequest } from "@/services/api";
import type { Patient, PatientFilters, PatientInput, PatientListResponse } from "@/types/patient";

function authHeaders(): HeadersInit {
  const token = getAccessToken();
  if (!token) throw new Error("Your session has expired.");
  return { Authorization: `Bearer ${token}` };
}

export function listPatients(filters: PatientFilters): Promise<PatientListResponse> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== "") params.set(key, String(value)); });
  return apiRequest<PatientListResponse>(`/patients?${params}`, { headers: authHeaders() });
}

export function getPatient(id: number): Promise<Patient> {
  return apiRequest<Patient>(`/patients/${id}`, { headers: authHeaders() });
}

export function createPatient(payload: PatientInput): Promise<Patient> {
  return apiRequest<Patient>("/patients", { method: "POST", headers: authHeaders(), body: JSON.stringify(payload) });
}

export function updatePatient(id: number, payload: PatientInput): Promise<Patient> {
  return apiRequest<Patient>(`/patients/${id}`, { method: "PUT", headers: authHeaders(), body: JSON.stringify(payload) });
}
