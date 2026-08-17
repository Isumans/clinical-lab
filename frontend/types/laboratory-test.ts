export type LaboratoryTestStatus = "ACTIVE" | "INACTIVE";

export interface LaboratoryTestInput {
  test_code: string;
  test_name: string;
  description: string | null;
  sample_type: string;
  price: string;
  status: LaboratoryTestStatus;
}

export interface LaboratoryTest extends LaboratoryTestInput {
  id: number;
  created_at: string;
}

export interface LaboratoryTestListResponse {
  items: LaboratoryTest[];
  total: number;
  page: number;
  page_size: number;
}

export interface LaboratoryTestFilters {
  search?: string;
  sample_type?: string;
  status?: string;
  sort_by?: string;
  sort_order?: string;
  page?: number;
  page_size?: number;
}
