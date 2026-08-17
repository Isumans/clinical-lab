import { getAccessToken } from "@/services/auth";
import { apiRequest } from "@/services/api";
import type { Appointment, AppointmentFilters, AppointmentInput, AppointmentListResponse } from "@/types/appointment";

function authHeaders(): HeadersInit { const token = getAccessToken(); if (!token) throw new Error("Your session has expired."); return { Authorization: `Bearer ${token}` }; }
export function listAppointments(filters: AppointmentFilters): Promise<AppointmentListResponse> { const params = new URLSearchParams(); Object.entries(filters).forEach(([key,value]) => { if (value !== undefined && value !== "") params.set(key,String(value)); }); return apiRequest<AppointmentListResponse>(`/appointments?${params}`, { headers: authHeaders() }); }
export function createAppointment(payload: AppointmentInput): Promise<Appointment> { return apiRequest<Appointment>("/appointments", { method: "POST", headers: authHeaders(), body: JSON.stringify(payload) }); }
export function getAppointment(id: number): Promise<Appointment> { return apiRequest<Appointment>(`/appointments/${id}`, { headers: authHeaders() }); }
