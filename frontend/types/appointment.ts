import type { Gender } from "@/types/patient";

export type AppointmentStatus = "SCHEDULED" | "CHECKED_IN" | "SAMPLE_COLLECTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type AppointmentTestStatus = "PENDING" | "SAMPLE_COLLECTED" | "IN_PROGRESS" | "COMPLETED" | "RECHECK_REQUIRED" | "AUTHORIZED" | "CANCELLED";

export interface AppointmentPatient { id: number; full_name: string; date_of_birth: string; gender: Gender; phone: string; email: string | null; }
export interface OrderedTestInfo { id: number; test_code: string; test_name: string; sample_type: string; price: string; }
export interface AppointmentTest { id: number; status: AppointmentTestStatus; result_value: string | null; result_unit: string | null; reference_range: string | null; result_notes: string | null; completed_at: string | null; authorized_at: string | null; authorized_by_id: number | null; recheck_notes: string | null; laboratory_test: OrderedTestInfo; }
export interface Appointment { id: number; patient_id: number; appointment_date: string; appointment_time: string; status: AppointmentStatus; created_at: string; patient: AppointmentPatient; ordered_tests: AppointmentTest[]; }
export interface AppointmentInput { patient_id: number; appointment_date: string; appointment_time: string; test_ids: number[]; }
export interface AppointmentListResponse { items: Appointment[]; total: number; page: number; page_size: number; }
export interface AppointmentFilters { search?: string; status?: string; date_from?: string; date_to?: string; sort_order?: string; page?: number; page_size?: number; }
export interface ReportFilters { search?: string; status?: string; page?: number; page_size?: number; }
export interface TestResultInput { result_value: string; result_unit?: string; reference_range?: string; result_notes?: string; }
