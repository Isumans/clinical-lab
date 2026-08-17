export type Gender = "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY";

export interface PatientInput {
  full_name: string;
  date_of_birth: string;
  gender: Gender;
  phone: string;
  email: string | null;
  address: string;
}

export interface Patient extends PatientInput {
  id: number;
  created_at: string;
  updated_at: string;
}

export interface PatientListResponse {
  items: Patient[];
  total: number;
  page: number;
  page_size: number;
}

export interface PatientFilters {
  search?: string;
  gender?: string;
  born_from?: string;
  born_to?: string;
  sort_by?: string;
  sort_order?: string;
  page?: number;
  page_size?: number;
}
